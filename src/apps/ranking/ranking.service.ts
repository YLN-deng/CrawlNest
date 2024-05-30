import { Injectable, Inject } from '@nestjs/common';
import { Response } from 'express';
import { CrawlRankingVerification } from './dto/ranking.dto';
import { EventGateway } from '../socket/socket.controller';

import puppeteer, { Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

import { loginPixiv, delay } from '@utils/login';
import { download } from '@utils/download';

@Injectable()
export class RankingService {
  @Inject(EventGateway)
  private readonly eventGateway: EventGateway;

  /**
   * 检测路径是否正确
   * @param path
   * @param errorMessage
   * @param res
   * @returns
   */
  async checkPathExists(path: string, errorMessage: string): Promise<void> {
    try {
      await fs.promises.access(path, fs.constants.F_OK);
    } catch (err) {
      throw new Error(errorMessage);
    }
  }

  /**
   * 下载图片
   * @param crawlRankingVerification
   * @param res
   * @returns
   */
  async getRanking(
    crawlRankingVerification: CrawlRankingVerification,
    res: Response,
  ) {
    const {
      imagePath, // 图片保存路径
      executablePath, // 浏览器路径
      headless, // 是否可视化操作
      pixiv_username, // 账号
      pixiv_password, // 密码
      rankingType, // 排行榜分类
      pageStart, // 从第几页开始下载
      pageEnd, // 下载到第几页的数据
      useProxy, // 是否开启代理
      port, // 代理端口号
    } = crawlRankingVerification;

    try {
      await this.checkPathExists(imagePath, '图片保存路径不存在');
      await this.checkPathExists(executablePath, '浏览器路径不存在');
    } catch (error) {
      // 在路径不存在时，立即返回错误响应
      return res.status(400).json({ message: error.message });
    }

    const headlessBoolean = !(headless === 'false' ? false : Boolean(headless));
    const useProxyBoolean = useProxy === 'false' ? false : Boolean(useProxy);

    // 日志文件路径
    const logFolderPath = `C:/Users/${process.env.USERNAME}/AppData/Local/log`;
    const logFilePath = path.join(logFolderPath, 'download.log');

    // 创建日志文件夹
    if (!fs.existsSync(logFolderPath)) {
      fs.mkdirSync(logFolderPath, { recursive: true }); // recursive选项确保在创建之前检查并创建所需的所有父目录
    }

    // 创建日志文件（如果文件不存在）
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, ''); // 创建一个空文件
    }

    const browser = await puppeteer.launch({
      executablePath: executablePath, // 要打开的浏览器地址
      headless: headlessBoolean, // 可视化界面
      args: [
        '--start-maximized', // 启动参数，确保浏览器最大化
        '--disable-infobars', // 禁用信息栏
        '--no-default-browser-check', // 禁用默认浏览器检查
        '--no-first-run', // 禁用首次运行提示
        '--disable-extensions', // 禁用扩展
      ],
    });

    const page = await browser.newPage();

    // 获取屏幕大小
    const { width, height } = await page.evaluate(() => ({
      width: window.screen.width,
      height: window.screen.height - 120,
    }));

    // 将页面视口设置为屏幕大小
    await page.setViewport({ width, height });

    try {
      await loginPixiv(page, pixiv_username, pixiv_password); // 登录pixiv
    } catch (error: any) {
      // 登录失败后关闭浏览器
      await browser.close();
      // 返回报错信息
      return res.status(400).json('登录失败');
    }

    // 等待2秒钟
    await delay(3000);

    /**
     * 根据页数循环下载图片数据
     */
    for (let pageNumber = pageStart; pageNumber <= pageEnd; pageNumber++) {
      try {
        await this.downloadRankingImages(
          page,
          rankingType,
          pageNumber,
          imagePath,
          logFilePath,
          useProxyBoolean,
          port,
        );
      } catch (err: any) {
        // 报错后关闭浏览器
        await browser.close();
        // 返回报错信息
        const logMessages = {
          message: `下载图片失败 ${err.message}`,
          state: 'error',
        };

        this.eventGateway.sendMessageUser(
          'log-message',
          'electron-socket',
          logMessages,
        );

        return res.status(400).json('下载图片失败');
      }
    }

    // 循环结束后关闭浏览器
    await browser.close();

    // 循环结束后发送成功请求
    const logMessages = {
      message: `已下载 ${pageStart} ~ ${pageEnd} 页的图片`,
      state: 'success',
    };

    this.eventGateway.sendMessageUser(
      'log-message',
      'electron-socket',
      logMessages,
    );

    return res.status(200).json(`已下载 ${pageStart} ~ ${pageEnd} 页的图片`);
  }

  /**
   * 根据页数下载图片
   * @ranking
   * @param page 浏览器页面
   * @param rankingType
   * @param pageNumber 下载页数
   * @param imagePath
   * @param logPath
   * @param useProxyBoolean
   * @param port
   */
  downloadRankingImages = async (
    page: Page,
    rankingType: string,
    pageNumber: number,
    imagePath: string,
    logPath: string,
    useProxyBoolean: boolean,
    port: string,
  ) => {
    switch (rankingType) {
      case 'day':
        // 每日排行
        await page.goto(`https://www.pixiv.net/ranking.php?p=${pageNumber}`);
        break;
      case 'week':
        // 每周排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=weekly&p=${pageNumber}`,
        );
        break;
      case 'month':
        // 每月排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=monthly&p=${pageNumber}`,
        );
        break;
      case 'day-r18':
        // 每日R18排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=daily_r18&p=${pageNumber}`,
        );
        break;
      case 'week-r18':
        // 每周R18排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=weekly_r18&p=${pageNumber}`,
        );
        break;
      case 'r18g':
        // R18重口味
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=r18g&p=${pageNumber}`,
        );
        break;
      case 'Ai':
        // 每日Ai生成排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=daily_ai&p=${pageNumber}`,
        );
        break;
      case 'Ai-r18':
        // 每日Ai-R18生成排行
        await page.goto(
          `https://www.pixiv.net/ranking.php?mode=daily_r18_ai&p=${pageNumber}`,
        );
        break;
      default:
        // 每日排行
        await page.goto(`https://www.pixiv.net/ranking.php?p=${pageNumber}`);
    }

    // 检测 ranking-item 是否存在，等待排行榜页面 ranking-item 加载完成
    await page.waitForSelector('div[class = "layout-body"]', {
      timeout: 60000,
    });

    // 等待2秒钟
    await delay(2000);

    /**
     * 下载图片
     * @returns
     */
    // 在页面中评估并提取排行榜信息
    const rankingData = await page.evaluate(() => {
      // 创建存储图片信息和作者信息的数组
      const rankingItems: {
        replacedUrl: string;
        userName: string;
        title: string;
      }[] = [];
      // 获取排行榜图片元素
      const elements = document.querySelectorAll('.ranking-item');

      // 遍历每个图片元素
      elements.forEach((element) => {
        // 获取图片 URL
        const imageUrlElement = element.querySelector(
          '.ranking-image-item a ._layout-thumbnail img',
        );
        const imageUrl = imageUrlElement?.getAttribute('data-src') || '';

        // 获取图片作者名称
        const userNameElement = element.querySelector('a[data-user_name]');
        const userName = userNameElement?.getAttribute('data-user_name') || '';

        // 获取图片标题
        const titleElement = element.querySelector('h2 a');
        const title = titleElement?.textContent?.trim() || '';

        // 如果图片 URL 存在，则替换为代理 URL；否则设置为空字符串
        const replacedUrl = imageUrl
          ? imageUrl
              .replace(
                'https://i.pximg.net/c/240x480/img-master/',
                'https://crawl.3046251309.workers.dev/img-original/',
              )
              .replace('_master1200.jpg', '.jpg')
          : '';

        // 构建对象并添加到数组中
        rankingItems.push({ replacedUrl, userName, title });
      });

      // 返回提取的排行榜信息数组
      return rankingItems;
    });

    // 遍历图片地址数组，下载图片到本地
    for (let i = 0; i < rankingData.length; i++) {
      // 添加4秒延迟，以免太快地下载
      await delay(3000);

      // 获取时间
      const timestamp = new Date().toLocaleString();

      let replacedUrl = rankingData[i].replacedUrl; // 图片下载地址
      const userName = rankingData[i].userName; // 图片作者
      const title = rankingData[i].title; // 图片标题

      /**
       * 设置文件名，可以根据需要自定义
       * @rankingType 排行分类
       * @pageNumber 第几页
       * @i 循环索引
       * @Date 当前时间戳
       */
      let imageName = `image_${rankingType}_p${pageNumber}_${i + 1}_${Date.now()}.jpg`;
      // 设置图片保存的目标路径，可以根据需要自定义
      let destination = `${imagePath}/${imageName}`;

      /**
       * 下载图片出错后的操作
       * @success 是否下载成功
       * @retries 第几次重试
       * @maxRetries 最大重试次数
       */
      let success: boolean = false;
      let retries: number = 0;
      const maxRetries: number = 3;

      while (!success && retries < maxRetries) {
        try {
          // 开始下载图片
          await download(replacedUrl, destination, useProxyBoolean, port);
          // 下载成功
          success = true;

          // 构建包含图片信息的对象
          const imageInfo = {
            type: `${rankingType} 排行`,
            number: 'P' + pageNumber + '_' + (i + 1),
            imageName: imageName,
            destination: destination,
            imageURL: replacedUrl,
            author: userName,
            title: title,
            DownloadTime: timestamp,
          };

          this.eventGateway.sendMessageUser(
            'download-message',
            'electron-scoket',
            imageInfo,
          );

          const logMessages = {
            message: `${imageInfo.number}： 图片 ${replacedUrl} 下载成功`,
            state: 'success',
          };

          this.eventGateway.sendMessageUser(
            'log-message',
            'electron-scoket',
            logMessages,
          );
          // console.log(`图片下载成功：`, JSON.stringify(imageInfo));

          // 将对象转换为 JSON 字符串
          const jsonContent = JSON.stringify(imageInfo);
          // 续写入下载文件信息到txt文件
          fs.writeFile(logPath, jsonContent + '\n', { flag: 'a' }, (err) => {
            if (err) {
              const logMessages = {
                message: `${imageInfo.number}： 图片 ${replacedUrl} 信息记录失败`,
                state: 'warning',
              };

              this.eventGateway.sendMessageUser(
                'log-message',
                'electron-scoket',
                logMessages,
              );
              // console.log(`图片 ${replacedUrl} 信息记录失败：`, err);
            }
          });
        } catch (error: any) {
          retries++;

          const logMessages = {
            message: `${'P' + pageNumber + '_' + (i + 1)}： ${error.message}，正在尝试重新下载，重试次数：${retries}`,
            state: 'warning',
          };

          this.eventGateway.sendMessageUser(
            'log-message',
            'electron-scoket',
            logMessages,
          );
          // console.log(
          //   `${error.message}，正在尝试重新下载，重试次数：${retries}`,
          // );

          // 在第一次重试时尝试替换文件后缀
          if (retries === 1) {
            // 尝试替换文件后缀为另一个格式（例如，将.jpg替换为.png）
            replacedUrl = replacedUrl.replace('.jpg', '.png');
            imageName = `image_${rankingType}_p${pageNumber}_${i + 1}_${Date.now()}.png`;
            destination = `${imagePath}/${imageName}`; // 更新图片保存的目标路径
          } else if (retries === 2) {
            // 在第二次重试时尝试替换文件后缀
            // 尝试替换文件后缀为另一个格式（例如，将.png替换为.jpge）
            replacedUrl = replacedUrl.replace('.png', '.jpge');
            imageName = `image_${rankingType}_p${pageNumber}_${i + 1}_${Date.now()}.jpge`;
            destination = `${imagePath}/${imageName}`; // 更新图片保存的目标路径
          } else {
            // 尝试替换文件后缀为另一个格式（例如，将.jpge替换为.jpg）
            replacedUrl = replacedUrl.replace('.jpge', '.jpg');
            imageName = `image_${rankingType}_p${pageNumber}_${i + 1}_${Date.now()}.jpg`;
            destination = `${imagePath}/${imageName}`; // 更新图片保存的目标路径
          }

          // 添加2秒延迟，以免太快地重试
          await delay(2000);
        }
      }

      // 下载错误次数超出提示
      if (!success) {
        const logMessages = {
          message: `${'P' + pageNumber + '_' + (i + 1)}： 图片 ${replacedUrl} 无法下载，已达到最大重试次数`,
          state: 'error',
        };

        this.eventGateway.sendMessageUser(
          'log-message',
          'electron-scoket',
          logMessages,
        );
        // console.log(`图片 ${replacedUrl} 无法下载，已达到最大重试次数`);
      }
    }
  };
}
