import { FindService } from './find.service';
import { Response } from 'express';
import { Controller, Post, Inject, Body, Res } from '@nestjs/common';
import { CrawlFindVerification } from './dto/find.dto';
import { FirstValidationErrorPipe } from '../../error/error.validation';

@Controller('find')
export class FindController {
  @Inject(FindService)
  private readonly findService: FindService;

  @Post()
  getRanking(
    @Body(new FirstValidationErrorPipe())
    crawlFindVerification: CrawlFindVerification,
    @Res() res: Response,
  ) {
    try {
      this.findService.getFind(crawlFindVerification, res);
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }
}
