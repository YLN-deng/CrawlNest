import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Page } from 'puppeteer-core';
import { CrawlFindVerification } from './dto/find.dto';
import { loginPixiv, delay } from '../../utils/login';
import { download } from '../../utils/download';

@Injectable()
export class FindService {
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
   * 下载发现页图片
   * @param crawlFindVerification
   * @param res
   */
  async getFind(crawlFindVerification: CrawlFindVerification, res: Response) {
    const {
      imagePath, // 图片保存路径
      executablePath, // 浏览器路径
      headless, // 是否可视化操作
      pixiv_username, // 账号
      pixiv_password, // 密码
      findType, // 发现分类
      pageStart, // 从第几页开始下载
      pageEnd, // 下载到第几页的数据
      useProxy, // 是否开启代理
      port, // 代理端口号
    } = crawlFindVerification;

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
      args: ['--start-maximized'], // 启动参数，确保浏览器最大化
    });

    const page = await browser.newPage();

    // 获取屏幕大小
    const { width, height } = await page.evaluate(() => ({
      width: window.screen.width,
      height: window.screen.height,
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

    // 等待3秒钟
    await delay(3000);

  }
}
