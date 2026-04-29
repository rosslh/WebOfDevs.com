import { Injectable } from '@nestjs/common';
import { InjectKnex, Knex } from 'nestjs-knex';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthedUser, ReviewStatus } from './app.controller';
import { nameCase } from '@foundernest/namecase';

type BaseUpsertUserData = {
  github_programming_languages?: string[];
  name?: string;
  [x: string]: unknown;
};
type UpsertUserData = BaseUpsertUserData &
  (
    | {
        id?: number;
        github_username: string;
      }
    | {
        id: number;
        github_username?: string;
      }
  );

@Injectable()
export class AppService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    @InjectQueue('message-queue') private queue: Queue,
  ) {}

  async getProgrammingLanguages() {
    const programmingLanguages = await this.knex('github_programming_language')
      .count('github_programming_language.id as count')
      .select(
        'github_programming_language.id',
        'github_programming_language.name',
      )
      .join(
        'user_github_programming_languages',
        'github_programming_language.id',
        'user_github_programming_languages.programming_language_id',
      )
      .join('user', 'user.id', 'user_github_programming_languages.user_id')
      .where({ is_hidden: false, status: 'approved' })
      .groupBy(
        'github_programming_language.id',
        'github_programming_language.name',
      )
      .orderBy('count', 'desc')
      .orderBy('name', 'asc')
      .limit(30);

    return programmingLanguages.map((lang) => ({
      ...lang,
      count: Number(lang.count),
    }));
  }

  async getEntries(
    requester: AuthedUser,
    programmingLanguageId: number,
  ): Promise<Entry[]> {
    const fields = [
      'user.id as id',
      'github_username',
      'website_url',
      'manual_website_url',
      'profile_image_url',
      'name',
      'name_override',
      'github_num_followers',
      'github_num_stars',
      'created_at',
      'is_user_submitted',
      'user_removed',
    ];

    if (requester) {
      fields.push('fav_user.id as favorited', 'status');
    }

    let query = this.knex('user')
      .count('fav_all.id as favorite_count')
      .select(...fields)
      .leftJoin('favorite as fav_all', 'user.id', 'fav_all.favorite_user_id')
      .groupBy('user.id');

    if (programmingLanguageId) {
      query = query.innerJoin('user_github_programming_languages', function () {
        this.on(
          'user.id',
          'user_github_programming_languages.user_id',
        ).andOnVal(
          'user_github_programming_languages.programming_language_id',
          programmingLanguageId,
        );
      });
    }

    if (requester) {
      query = query
        .leftJoin('favorite as fav_user', function () {
          this.onVal('fav_user.user_id', requester.id);
          this.andOn('fav_user.favorite_user_id', 'user.id');
        })
        .groupBy('fav_user.id');
    }

    if (requester?.is_admin) {
      // approved or is_user_submitted
      query = query.where(function () {
        this.where('status', 'approved').orWhere('is_user_submitted', true);
      });
    } else {
      query = query.where('status', 'approved').andWhere('user_removed', false);
    }

    if (requester) {
      query = query.orderByRaw('fav_user.id is null asc');
    }

    const sqlResult = await query
      .orderBy('status', 'asc')
      .orderBy('name', 'asc');

    const result = sqlResult.map((r) => ({
      ...r,
      name: r.name_override || r.name,
      website_url: r.manual_website_url || r.website_url,
      favorite_count: Number(r.favorite_count),
      favorited: Boolean(r.favorited),
    }));

    return result;
  }

  async deleteEntry(user_id: number) {
    await this.upsertUser({
      id: user_id,
      user_removed: true,
    });
  }

  async reviewEntry(data: { status: ReviewStatus; user_id: number }) {
    await this.upsertUser({
      id: data.user_id,
      status: data.status,
    });
  }

  async reportEntry(
    reported_user_id: number,
    reporting_user_id: number,
    reason: string,
  ): Promise<void> {
    // Enforce one report per (reporter, reported) pair via the DB unique index;
    // silently no-op on duplicates so a repeated submission does not 500.
    await this.knex('report')
      .insert({
        reported_user_id,
        reporting_user_id,
        reason,
      })
      .onConflict(['reporting_user_id', 'reported_user_id'])
      .ignore();
  }

  async favoriteEntry(favorite_user_id: number, user_id: number) {
    if (user_id !== favorite_user_id) {
      // Enforce one favorite per (user, favorite_user) pair via the DB unique
      // index; silently no-op on duplicates so re-favoriting does not 500.
      await this.knex('favorite')
        .insert({
          favorite_user_id,
          user_id,
        })
        .onConflict(['user_id', 'favorite_user_id'])
        .ignore();
    }
  }

  async unfavoriteEntry(favorite_user_id: number, user_id: number) {
    await this.knex('favorite').where({ favorite_user_id, user_id }).del();
  }

  async sendMessage(
    message: string,
    payload: { githubUsername: string; manualWebsiteUrl: string },
  ): Promise<void> {
    await this.queue.add('user-submission-job', {
      message,
      payload,
    });
  }

  async upsertUser(data: UpsertUserData) {
    data.github_username = data.github_username?.toLowerCase();

    const whereClause = data.id
      ? { id: data.id }
      : { github_username: data.github_username };

    const user = await this.knex('user').where(whereClause);

    const programmingLanguages = data.github_programming_languages;

    if (data.github_programming_languages) {
      delete data.github_programming_languages;
    }

    if (data.name) {
      data.name = nameCase(data.name.trim().toLowerCase());
    }

    let userId: number;
    if (user.length === 0) {
      console.log('🟢 adding new user for', data.github_username || data.id);
      userId = (await this.knex('user').insert(data).returning('id'))[0].id;
    } else {
      userId = user[0].id;
      console.log('🟢 updating user for', data.github_username || data.id);
      await this.knex('user').update(data).where(whereClause);
    }

    if (programmingLanguages) {
      await this.addProgrammingLanguagesToUser(userId, programmingLanguages);
    }
  }

  private async addProgrammingLanguagesToUser(
    userId: number,
    programmingLanguages: string[],
  ) {
    await this.knex.transaction(async (trx) => {
      await trx('user_github_programming_languages')
        .where({ user_id: userId })
        .del();
      if (programmingLanguages.length > 0) {
        const langIds: number[] = [];
        for (const language of programmingLanguages) {
          let langId = (
            await trx('github_programming_language').select('id').where({
              name: language,
            })
          )?.[0]?.id;

          if (!langId) {
            langId = (
              await trx('github_programming_language')
                .insert({
                  name: language,
                  color: '#000000',
                })
                .returning('id')
            )[0].id;
          }
          langIds.push(langId);
        }
        await trx('user_github_programming_languages').insert(
          langIds.map((programming_language_id) => ({
            user_id: userId,
            programming_language_id,
          })),
        );
      }
    });
  }

  getCleanUrl(blog: string) {
    if (!blog) {
      return blog;
    }
    let website = blog.replace(/\s/, '');
    if (
      website &&
      website.length > 3 &&
      !website.startsWith('https://') &&
      !website.startsWith('http://')
    ) {
      website = `https://${website}`;
    }

    if (website.startsWith('http://')) {
      website = website.replace('http://', 'https://');
    }
    try {
      const parsed = new URL(website);
      parsed.hostname = parsed.hostname.toLowerCase();
      website = parsed.toString();
    } catch {
      // Preserve prior behavior for malformed URLs by falling through.
    }
    return website.trim().replace(/\/$/, '');
  }
}
