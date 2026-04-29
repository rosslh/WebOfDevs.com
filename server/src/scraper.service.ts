import { Injectable } from '@nestjs/common';
import { InjectKnex, Knex } from 'nestjs-knex';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import wiki from 'wikipedia';
import { AxiosResponse } from 'axios';
import { AppService } from './app.service';

interface NewEntryRequest {
  githubUsername: string;
  manualWebsiteUrl?: string;
  isUserSubmission?: boolean;
  userRemoved?: boolean;
}

export interface UserData {
  website_url: string;
  name: string;
  profile_image_url: string;
  github_num_followers: number;
  github_num_stars: number;
  github_programming_languages: string[];
}

interface RepoData {
  id: number;
  name: string;
  stargazers_count?: number;
  language?: string;
}

interface GithubUserResponse {
  avatar_url: string;
  blog?: string;
  followers: number;
  name?: string;
}

@Injectable()
export class ScraperService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly appService: AppService,
  ) {}

  async getGithubUserData(githubUsername: string): Promise<UserData> {
    const githubUsernameLower = githubUsername.toLowerCase();
    const api_token = this.configService.get('GITHUB_OCTOKIT_TOKEN');
    const githubHeaders = {
      Accept: 'application/vnd.github+json',
      ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const userResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(githubUsernameLower)}`,
      { headers: githubHeaders },
    );
    console.log('🟢 github:', githubUsernameLower, userResponse.status);

    if (!userResponse.ok) {
      return null;
    }

    const userData = (await userResponse.json()) as GithubUserResponse;

    const repos = [];
    const pageSize = 100;
    const maxRepos = 1000;
    while (repos.length < maxRepos) {
      const page = repos.length / pageSize + 1;
      const reposResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(
          githubUsernameLower,
        )}/repos?per_page=${pageSize}&page=${page}`,
        { headers: githubHeaders },
      );
      if (!reposResponse.ok) {
        break;
      }
      const pageRepos = (await reposResponse.json()) as RepoData[];
      repos.push(...pageRepos);
      if (pageRepos.length < pageSize) {
        break;
      }
    }

    let numStars = 0;
    const languages: Set<string> = new Set();
    for (const repo of repos) {
      if (repo.language) {
        languages.add(repo.language);
      }
      numStars += repo.stargazers_count;
    }

    const website = this.appService.getCleanUrl(userData.blog);

    return {
      website_url: website,
      name: userData.name,
      profile_image_url: userData.avatar_url,
      github_num_followers: userData.followers,
      github_num_stars: numStars,
      github_programming_languages: Array.from(languages),
    };
  }

  async validateWebsite(website: string, nameOfUser: string) {
    // reject if not a valid domain
    let url: URL;
    try {
      url = new URL(website);
    } catch {
      console.log('fail 1', nameOfUser, website);
      return false;
    }

    // reject if page cannot be loaded
    let response: AxiosResponse;
    try {
      response = await firstValueFrom(this.httpService.get(website));
    } catch {
      console.log('fail 2', nameOfUser, website);
      return false;
    }

    // reject if page cannot be loaded
    if (response.status !== 200) {
      console.log('fail 3', nameOfUser, website, response.status);
      return false;
    }

    // reject if page cannot be opened in an iframe
    const xFrameOptions = response.headers['x-frame-options']?.toLowerCase();
    if (['deny', 'sameorigin'].includes(xFrameOptions)) {
      console.log('fail 4', nameOfUser, website);
      return false;
    }

    const domainName = url.hostname.replace(/^www\./, '').toLowerCase();

    // reject if wikipedia article exists for domain
    try {
      await wiki.page(domainName);
      console.log('fail 5', nameOfUser, website);
      return false;
    } catch {
      // ignore
    }

    // accept if domain contains user's name
    const nameParts = nameOfUser.split(' ').map((name) => name.toLowerCase());
    if (nameParts.some((name) => domainName.includes(name))) {
      return true;
    }

    // accept if page content includes user's name
    const html = response.data.toLowerCase();
    if (nameParts.every((name) => html.includes(name))) {
      return true;
    }

    console.log('fail 6', nameOfUser, website);
    return false;
  }

  async addUserWebsite({
    githubUsername,
    manualWebsiteUrl,
    isUserSubmission,
    userRemoved,
  }: NewEntryRequest) {
    const userData = await this.getGithubUserData(githubUsername);
    if (!userData) {
      await this.appService.upsertUser({
        github_username: githubUsername,
        status: 'invalid_github_user',
        manual_website_url: manualWebsiteUrl,
        user_removed: userRemoved,
      });
    }

    const nameRegex = /^([ \u00c0-\u01ffa-zA-Z'\-.])+$/;

    let status = 'requires_review';
    if (!isUserSubmission) {
      if (!userData.website_url) {
        status = 'no_website';
      } else if (!userData.name) {
        status = 'no_name';
      } else if (
        !userData.name.includes(' ') ||
        !nameRegex.test(userData.name)
      ) {
        status = 'invalid_name';
      }

      if (status === 'requires_review') {
        const websiteIsValid =
          userData.website_url &&
          (await this.validateWebsite(userData.website_url, userData.name));

        if (!websiteIsValid) {
          status = 'invalid_website';
        }
      }
    }

    const currentUserData = (
      await this.knex.select('status').from('user').where({
        github_username: githubUsername,
      })
    )?.[0];

    const shouldNotOverrideStatus = [
      'approved',
      'rejected',
      'requires_review',
    ].includes(currentUserData?.status);

    if (shouldNotOverrideStatus) {
      status = undefined;
    }

    await this.appService.upsertUser({
      ...userData,
      github_username: githubUsername,
      status,
      manual_website_url: this.appService.getCleanUrl(manualWebsiteUrl),
      is_user_submitted: Boolean(isUserSubmission),
      user_removed: userRemoved,
    });
  }

  async checkExistingWebsiteValidity(status: 'approved' | 'requires_review') {
    const users = await this.knex
      .select('github_username', 'website_url', 'name')
      .from('user')
      .where({
        status: status,
        is_user_submitted: false,
        user_removed: false,
      });

    for (const user of users) {
      console.log('🟡 checking', user.github_username);
      const websiteIsValid = await this.validateWebsite(
        user.website_url,
        user.name,
      );

      if (!websiteIsValid) {
        console.log('🔴 invalid', user.github_username);
        await this.appService.upsertUser({
          github_username: user.github_username,
          status: 'invalid_website',
        });
      }
    }
    console.log('🟢 checked website validity');
  }

  async updateGithubData() {
    const users = await this.knex('user').select('*').where({
      status: 'approved',
    });
    // .orWhere({ status: 'requires_review' });
    // .orWhere({ status: 'rejected' });
    for (const user of users) {
      try {
        console.log('🔷 getting data for ' + user.github_username);
        const userData = await this.getGithubUserData(user.github_username);
        if (!(await this.validateWebsite(user.website_url, user.name))) {
          userData.website_url = undefined;
        }
        if (userData) {
          await this.appService.upsertUser({
            github_username: user.github_username,
            ...userData,
          });
        }
      } catch (e) {
        console.error('🔴 failed updating', user.github_username);
        console.error(e);
      }
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async monthly() {
    console.log('🔷 cron monthly');
    await this.checkExistingWebsiteValidity('requires_review');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weekly() {
    console.log('🔷 cron weekly');
    await this.updateGithubData();
  }
}
