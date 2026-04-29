import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectKnex, Knex } from 'nestjs-knex';
import { AppService } from '../app.service';
import { JwtService } from '@nestjs/jwt';
import { ScraperService } from 'src/scraper.service';
import { randomBytes, createHash } from 'crypto';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_DAYS = 30;
const GITHUB_DATA_FRESH_HOURS = 24;

export interface AuthUser {
  id: number;
  name: string;
  website_url: string;
  profile_image_url: string;
  github_username: string;
  is_admin: boolean;
  authenticated: boolean;
  can_submit_website: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  refresh_expires_at: Date;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

interface GithubUserResponse {
  avatar_url: string;
  blog?: string;
  followers: number;
  login: string;
  name?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly appService: AppService,
    private readonly scraperService: ScraperService,
    private jwtService: JwtService,
  ) {}

  async login(code: string): Promise<LoginResponse> {
    const oauthResult = await firstValueFrom(
      this.httpService.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.configService.get('GITHUB_OAUTH_CLIENT_ID'),
          client_secret: this.configService.get('GITHUB_OAUTH_CLIENT_SECRET'),
          code,
          redirect: this.configService.get('GITHUB_OAUTH_REDIRECT_URI'),
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    );

    if (oauthResult.status !== 200) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    if (oauthResult.data?.error) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const accessToken = oauthResult.data?.access_token;

    const githubUserResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!githubUserResponse.ok) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const githubUser = (await githubUserResponse.json()) as GithubUserResponse;
    const githubUsernameLower = githubUser.login.toLowerCase();
    let user = await this.knex('user')
      .where({
        github_username: githubUsernameLower,
      })
      .first();

    const isFresh =
      user?.last_authenticated_at &&
      Date.now() - new Date(user.last_authenticated_at).getTime() <
        GITHUB_DATA_FRESH_HOURS * 60 * 60 * 1000;

    let github_num_stars: number;
    let github_programming_languages: string[];
    if (isFresh) {
      github_num_stars = user.github_num_stars;
      const cachedLanguages = await this.knex('github_programming_language')
        .join(
          'user_github_programming_languages',
          'github_programming_language.id',
          'user_github_programming_languages.programming_language_id',
        )
        .where({ 'user_github_programming_languages.user_id': user.id })
        .pluck('github_programming_language.name');
      github_programming_languages = cachedLanguages;
    } else {
      ({ github_num_stars, github_programming_languages } =
        await this.scraperService.getGithubUserData(githubUsernameLower));
    }

    const userData = {
      github_username: githubUsernameLower,
      name: githubUser.name,
      website_url: this.appService.getCleanUrl(githubUser.blog),
      profile_image_url: githubUser.avatar_url,
      github_num_followers: githubUser.followers,
      github_num_stars,
      github_programming_languages,
      first_authenticated_at: user?.first_authenticated_at ?? new Date(),
      last_authenticated_at: new Date(),
    };

    await this.appService.upsertUser(userData);

    if (!user) {
      user = await this.knex('user')
        .where({
          github_username: githubUsernameLower,
        })
        .first();
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: userData.name,
        website_url: userData.website_url,
        profile_image_url: userData.profile_image_url,
        github_username: githubUsernameLower,
        is_admin: user.is_admin,
        authenticated: true,
        can_submit_website:
          (!user.manual_website_url && user.status !== 'approved') ||
          user.user_removed,
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const row = await this.knex('refresh_token')
      .where({ token_hash: tokenHash })
      .first();

    if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.knex('user').where({ id: row.user_id }).first();
    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const newTokens = await this.issueTokens(user);
    const newHash = this.hashRefreshToken(newTokens.refresh_token);
    const [{ id: replacementId }] = await this.knex('refresh_token')
      .where({ token_hash: newHash })
      .select('id');

    await this.knex('refresh_token')
      .where({ id: row.id })
      .update({ revoked_at: new Date(), replaced_by: replacementId });

    return newTokens;
  }

  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    await this.knex('refresh_token')
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
  }

  private async issueTokens(user: {
    id: number;
    is_admin: boolean;
    github_username: string;
  }): Promise<AuthTokens> {
    const access_token = this.jwtService.sign({
      id: user.id,
      github_username: user.github_username,
      is_admin: user.is_admin,
    });

    const refresh_token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refresh_expires_at = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.knex('refresh_token').insert({
      user_id: user.id,
      token_hash: this.hashRefreshToken(refresh_token),
      expires_at: refresh_expires_at,
    });

    return { access_token, refresh_token, refresh_expires_at };
  }

  private hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
