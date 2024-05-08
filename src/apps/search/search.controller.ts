import { SearchService } from './search.service';
import { Response } from 'express';
import { Controller, Post, Inject, Body, Res } from '@nestjs/common';
import { CrawlSearchVerification } from './dto/search.dto';
import { FirstValidationErrorPipe } from '../../error/error.validation';

@Controller('search')
export class SearchController {
  @Inject(SearchService)
  private readonly searchService: SearchService;

  @Post()
  getSearch(
    @Body(new FirstValidationErrorPipe())
    crawlSearchVerification: CrawlSearchVerification,
    @Res() res: Response,
  ) {
    try {
      this.searchService.getSearch(crawlSearchVerification, res);
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }
}
