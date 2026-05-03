import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

export interface UserData {
  website_url: string;
  name: string;
  profile_image_url: string;
  github_num_followers: number;
  github_num_stars: number;
  github_programming_languages: string[];
}

interface RepoData {
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
export class GithubService {
  constructor(
    private readonly configService: ConfigService,
    private readonly appService: AppService,
  ) {}

  async getGithubUserData(githubUsername: string): Promise<UserData> {
    const githubUsernameLower = githubUsername.toLowerCase();
    const apiToken = this.configService.get('GITHUB_OCTOKIT_TOKEN');
    const githubHeaders = {
      Accept: 'application/vnd.github+json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const userResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(githubUsernameLower)}`,
      { headers: githubHeaders, signal: AbortSignal.timeout(10_000) },
    );
    console.log('🟢 github:', githubUsernameLower, userResponse.status);
    this.assertGithubRateLimitOk(userResponse);

    if (!userResponse.ok) {
      return null;
    }

    const userData = (await userResponse.json()) as GithubUserResponse;

    const repos: RepoData[] = [];
    const pageSize = 100;
    const maxRepos = 1000;
    while (repos.length < maxRepos) {
      const page = repos.length / pageSize + 1;
      const reposResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(
          githubUsernameLower,
        )}/repos?per_page=${pageSize}&page=${page}`,
        { headers: githubHeaders, signal: AbortSignal.timeout(10_000) },
      );
      this.assertGithubRateLimitOk(reposResponse);
      if (!reposResponse.ok) {
        break;
      }
      const pageRepos = (await reposResponse.json()) as RepoData[];
      repos.push(...pageRepos);
      if (pageRepos.length < pageSize) {
        break;
      }
      const remainingHeader = reposResponse.headers.get(
        'x-ratelimit-remaining',
      );
      const remaining = remainingHeader ? Number(remainingHeader) : NaN;
      if (!Number.isNaN(remaining) && remaining < 100) {
        console.warn(
          `🟡 github rate-limit budget low (${remaining}); aborting repo pagination for ${githubUsernameLower}`,
        );
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

  private assertGithubRateLimitOk(response: Response): void {
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const resetHeader = response.headers.get('x-ratelimit-reset');
    const isRateLimitedStatus =
      response.status === 403 || response.status === 429;
    const remainingExhausted =
      remainingHeader === '0' || remainingHeader === null;
    if (isRateLimitedStatus && remainingExhausted) {
      const resetTimestamp = resetHeader
        ? new Date(Number(resetHeader) * 1000).toISOString()
        : 'unknown';
      throw new Error(
        `GitHub rate limit exhausted; reset at ${resetTimestamp}`,
      );
    }
  }
}
