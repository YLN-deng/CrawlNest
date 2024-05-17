import { RankingService } from './ranking.service';
import { Response } from 'express';
import { Controller, Post, Get, Inject, Body, Res } from '@nestjs/common';
import { CrawlRankingVerification } from './dto/ranking.dto';
import { FirstValidationErrorPipe } from '../../error/error.validation';
import { EventGateway } from '../socket/socket.controller';

@Controller('ranking')
export class RankingController {
  @Inject(RankingService)
  private readonly rankingService: RankingService;

  @Inject(EventGateway)
  private readonly eventGateway: EventGateway;

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

  @Get('test')
  getEmit(@Res() res: Response) {
    const imageInfo = {
      number: 1,
      imageName: '666666.jpg',
      destination:
        'C:\\Users\\admin\\Desktop\\illustration/image_ION_p1_5_1715157140285.png',
      imageURL: 'http://safasdasd',
      author: 'zuoze',
      title: 'title',
      DownloadTime: '777',
    };

    try {
      this.eventGateway.sendMessageUser(
        'download-message',
        'electron-scoket',
        imageInfo,
      );
      return res.status(200).json('成功');
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }

  @Get('log')
  getLog(@Res() res: Response) {
    try {
      const logMessages = {
        message: `图片下载成功`,
        state: 'error',
      };

      this.eventGateway.sendMessageUser(
        'log-message',
        'electron-scoket',
        logMessages,
      );
      return res.status(200).json('成功');
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }
}
