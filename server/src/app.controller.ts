import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, JwtOptionalAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';
import { ScraperService } from './scraper.service';

export interface AuthedUser {
  id: number;
  is_admin: boolean;
  github_username: string;
}

export interface OptionallyAuthedRequest extends Request {
  user?: AuthedUser;
}

export interface AuthedRequest extends Request {
  user: AuthedUser;
}

export type ReviewStatus = 'approved' | 'rejected' | 'requires_review';

const REVIEW_STATUSES: ReviewStatus[] = [
  'approved',
  'rejected',
  'requires_review',
];

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly scraperService: ScraperService,
  ) {}

  @Get('/programming-languages')
  async getProgrammingLanguages() {
    return await this.appService.getProgrammingLanguages();
  }

  @UseGuards(JwtOptionalAuthGuard)
  @Get('/entries')
  async getEntries(
    @Request() req: OptionallyAuthedRequest,
    @Query() query: { programmingLanguageId: number },
  ) {
    return await this.appService.getEntries(
      req.user,
      query.programmingLanguageId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/entries')
  async createEntry(
    @Request() req: AuthedRequest,
    @Body() data: { website: string },
  ) {
    if (!data.website) {
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    }
    // return this.scraperService.getUserWebsite({
    //   githubUsername: req.user.github_username,
    //   manualWebsiteUrl: data.website,
    //   isUserSubmission: true,
    //   userRemoved: false,
    // });
    return await this.appService.sendMessage('create-message', {
      manualWebsiteUrl: data.website,
      githubUsername: req.user.github_username,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/entries/:user_id')
  async deleteEntry(
    @Request() req: AuthedRequest,
    @Param('user_id') user_id: number,
  ) {
    if (req.user.id !== Number(user_id)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return await this.appService.deleteEntry(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/reports/:user_id')
  async reportEntry(
    @Request() req: AuthedRequest,
    @Param('user_id') user_id: number,
    @Body() data: { reason: string },
  ) {
    return await this.appService.reportEntry(user_id, req.user.id, data.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Put('/reviews/:user_id')
  async reviewEntry(
    @Request() req: AuthedRequest,
    @Body() data: { status: string },
    @Param('user_id') user_id: number,
  ) {
    if (!req.user.is_admin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    if (!REVIEW_STATUSES.includes(data.status as ReviewStatus)) {
      throw new HttpException(
        `Invalid status. Must be one of: ${REVIEW_STATUSES.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.appService.reviewEntry({
      status: data.status as ReviewStatus,
      user_id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('/favorites')
  async favoriteEntry(
    @Request() req: AuthedRequest,
    @Body() data: { id: number },
  ) {
    return await this.appService.favoriteEntry(Number(data.id), req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/favorites/:user_id')
  async unfavoriteEntry(
    @Request() req: AuthedRequest,
    @Param('user_id') user_id: number,
  ) {
    return await this.appService.unfavoriteEntry(Number(user_id), req.user.id);
  }
}
