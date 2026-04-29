import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ScraperService } from './scraper.service';

@Processor('message-queue')
export class MessageConsumer extends WorkerHost {
  constructor(private readonly scraperService: ScraperService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'user-submission-job') return;

    return await this.scraperService.addUserWebsite({
      githubUsername: job.data.payload.githubUsername,
      manualWebsiteUrl: job.data.payload.manualWebsiteUrl,
      isUserSubmission: true,
      userRemoved: false,
    });
  }
}
