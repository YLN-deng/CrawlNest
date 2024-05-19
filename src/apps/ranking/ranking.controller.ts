import { RankingService } from './ranking.service';
import { Response } from 'express';
import { Controller, Post, Inject, Body, Res } from '@nestjs/common';
import { CrawlRankingVerification } from './dto/ranking.dto';
import { FirstValidationErrorPipe } from '../../error/error.validation';

@Controller('ranking')
export class RankingController {
  @Inject(RankingService)
  private readonly rankingService: RankingService;

  @Post()
  getRanking(
    @Body(new FirstValidationErrorPipe())
    crawlRankingVerification: CrawlRankingVerification,
    @Res() res: Response,
  ) {
    try {
      this.rankingService.getRanking(crawlRankingVerification, res);
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }
}
