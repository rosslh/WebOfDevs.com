import { Injectable } from '@nestjs/common';
import { InjectKnex, Knex } from 'nestjs-knex';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import wiki from 'wikipedia';
import { AxiosResponse } from 'axios';
import { AppService } from './app.service';
import { GithubService, UserData } from './github.service';

interface NewEntryRequest {
  githubUsername: string;
  manualWebsiteUrl?: string;
  isUserSubmission?: boolean;
  userRemoved?: boolean;
}

@Injectable()
export class ScraperService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly httpService: HttpService,
    private readonly appService: AppService,
    private readonly githubService: GithubService,
  ) {}

  async getGithubUserData(githubUsername: string): Promise<UserData> {
    return await this.githubService.getGithubUserData(githubUsername);
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
      await this.withTimeout(wiki.page(domainName), 10_000, 'wiki.page');
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

    await this.runWithConcurrency(users, 3, async (user) => {
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
    });
    console.log('🟢 checked website validity');
  }

  async updateGithubData() {
    const users = await this.knex('user').select('*').where({
      status: 'approved',
    });
    // .orWhere({ status: 'requires_review' });
    // .orWhere({ status: 'rejected' });
    await this.runWithConcurrency(users, 3, async (user) => {
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
    });
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async monthly() {
    console.log('🔷 cron monthly');
    try {
      await this.checkExistingWebsiteValidity('requires_review');
    } catch (err) {
      console.error('monthly cron failed', err);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weekly() {
    console.log('🔷 cron weekly');
    try {
      await this.updateGithubData();
    } catch (err) {
      console.error('weekly cron failed', err);
    }
  }

  private withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }

  private async runWithConcurrency<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let cursor = 0;
    const runners = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (cursor < items.length) {
          const i = cursor++;
          try {
            await worker(items[i]);
          } catch (err) {
            console.error('cron worker iteration failed', err);
          }
        }
      },
    );
    await Promise.all(runners);
  }
}
