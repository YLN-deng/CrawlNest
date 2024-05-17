import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { CrawlSearchVerification } from './dto/search.dto';

import puppeteer, { Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

import { loginPixiv, delay } from '../../utils/login';
import { download } from '../../utils/download';

@Injectable()
export class SearchService {
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
  async getSearch(
    crawlSearchVerification: CrawlSearchVerification,
    res: Response,
  ) {
    const {
      searchUser, // 搜索的作者名称
      pageStart, // 从第几页开始下载
      pageEnd, // 下载到第几页的数据
      imagePath, // 图片保存路径
      executablePath, // 浏览器路径
      headless, // 是否可视化操作
      pixiv_username, // 账号
      pixiv_password, // 密码
      useProxy, // 是否开启代理
      port, // 代理端口号
    } = crawlSearchVerification;
    try {
      await this.checkPathExists(imagePath, '图片保存路径不存在');
      await this.checkPathExists(executablePath, '浏览器路径不存在');
    } catch (error) {
      // 在路径不存在时，立即返回错误响应
      return res.status(400).json(error.message);
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

    let href = '';

    // 获取屏幕大小
    const { width, height } = await page.evaluate(() => ({
      width: window.screen.width,
      height: window.screen.height,
    }));

    // 将页面视口设置为屏幕大小
    await page.setViewport({ width, height });

    // 登录pixiv
    try {
      await loginPixiv(page, pixiv_username, pixiv_password);
    } catch (error: any) {
      await browser.close(); // 登录失败后关闭浏览器
      return res.status(400).json('登录失败'); // 返回报错信息
    }

    // 获取作者主页地址
    try {
      href = await this.waitSearchResults(page, searchUser);
    } catch (error: any) {
      await browser.close(); // 登录失败后关闭浏览器
      return (res as any).AjaxResult.bizFail(400, error.message); // 返回报错信息
    }

    // 根据作者名称跳转到作者插画页面,循环下载图片数据
    for (let pageNumber = pageStart; pageNumber <= pageEnd; pageNumber++) {
      try {
        await this.jumpToIllustrationDown(
          page,
          href,
          searchUser,
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
        return res.status(400).json('下载图片失败');
      }
    }

    // 循环结束后关闭浏览器
    await browser.close();

    // 循环结束后发送成功请求
    return res.status(200).json(`已下载第 ${pageStart} 页到第 ${pageEnd} 页`);
  }

  /**
   * 获取跳转到作者页面的a标签href
   * @param page
   * @param searchUser 作者名称
   * @returns
   */
  waitSearchResults = async (
    page: Page,
    searchUser: string,
  ): Promise<string> => {
    // 搜索作者
    // 使用 waitForSelector 等待输入框出现
    // 先在首页的搜索框中搜索作者
    await page.waitForSelector('input[type="text"]', { timeout: 60000 });
    await page.type('input[type="text"]', searchUser);

    // 等待3秒钟
    await delay(3000);

    // 确认搜索按钮
    await page.keyboard.press('Enter');

    // 等待搜索结果页面的 nav a 标签加载完成
    await page.waitForSelector('nav a', { timeout: 60000 });

    // 等待2秒钟
    await delay(2000);

    // 获取所有匹配选择器的a标签元素
    // 搜索完成之后，点击用户选项的a标签
    const a_buttons = await page.$$('nav a');

    // 检查是否有足够的a标签
    if (a_buttons.length >= 5) {
      // 点击第五个按钮（用户标签）（索引从0开始）
      await a_buttons[4].click();
    } else {
      console.log('未检出用户选项的a标签 ');
      throw new Error('搜索错误');
    }

    // 跳转到搜索用户界面，等待搜索结果页面 layout-body 加载完成
    await page.waitForSelector('div[class="layout-body"]', { timeout: 60000 });

    // 等待2秒钟
    await delay(2000);

    // 获取所有匹配选择器的ul标签元素
    // 点击用户选项之后，点击完全一致a标签，获取作者信息
    const ul_elements = await page.$$('.layout-body ._unit nav ul');

    // 检查是否有足够的 ul 元素
    if (ul_elements.length >= 2) {
      // 获取第二个 ul_elements 元素中的第一个 li 元素（这个元素包含：完全一致的 a 标签）
      const li_element = await ul_elements[2].$('li');

      // 检查是否找到了 li 元素
      if (li_element) {
        // 获取 li 元素中的第一个 a 标签 （完全一致的 a 标签）
        const a_element = await li_element.$('a');

        // 完全一致的 a 标签是否存在
        if (a_element) {
          // 点击完全一致的 a 标签
          await a_element.click();
        } else {
          console.log('未找到 (完全一致) 的 a 标签');
          throw new Error('搜索错误');
        }
      } else {
        console.log('第二个 ul 中未检出 (完全一致) 的父元素 li 标签');
        throw new Error('搜索错误');
      }
    } else {
      console.log('未检出足够的包含 (完全一致) 的祖父元素 ul 标签');
      throw new Error('搜索错误');
    }

    // 等待点击完全一致后的搜索结果页面 user-search-result-container 加载完成
    await page.waitForSelector('div[class="user-search-result-container"]', {
      timeout: 60000,
    });

    // 等待2秒
    await delay(2000);

    // 获取所有匹配选择器的ul标签元素
    // 现在页面是完全一致选项的作者页面 , 获取完一致的作者信息后，点击进入第一个作者作品页面
    const item_li_elements = await page.$$(
      '.user-search-result-container ul li',
    );

    // 检查是否有足够的 li 元素
    if (item_li_elements.length <= 2) {
      console.log('在 (完全一致) 选项的作者页面，未检出 li 标签');
      throw new Error('搜索错误');
    }

    // 获取完一致的作者信息后,拿到 li 元素中的 a （作者地址标签） 标签，
    const item_a_element = await item_li_elements[0].$('a');

    // 点击作者地址页面的 a 标签
    if (!item_a_element) {
      console.log('进入第一个作者作品页面失败,未找到作者链接 a 标签');
      throw new Error('搜索错误');
    }

    // 获取作者地址链接地址
    const href = await item_a_element.evaluate((node) =>
      node.getAttribute('href'),
    );
    if (!href) {
      console.log('进入第一个作者作品页面失败,未找到作者链接 a 标签地址');
      throw new Error('搜索错误');
    }

    // 返回作者地址
    return href;
  };

  /**
   * 根据作者名称跳转到作者插画页面
   * @param page
   * @param href 作者地址
   * @param pageNumber 作者地址第几页
   * @param imagePath 图片保存路径
   * @param logPath 下载信息保存路径
   */
  jumpToIllustrationDown = async (
    page: Page,
    href: string,
    searchUser: string,
    pageNumber: number,
    imagePath: string,
    logPath: string,
    useProxyBoolean: boolean,
    port: string,
  ) => {
    // 跳转到作者的插画页
    await page.goto(
      `https://www.pixiv.net${href}/illustrations?p=${pageNumber}`,
    );

    // 等待作者插画页面加载完成
    await page.waitForSelector('section div:nth-child(3) div ul', {
      timeout: 60000,
    });

    // 等待2秒钟
    await delay(2000);

    /**
     * 模拟下滑加载页面，直到页面高度不再增加
     * 定义滚动步长和等待时间
     */
    const scrollStep = 300; // 每次滚动的距离
    const scrollDelay = 2000; // 每次滚动后等待的时间

    // 获取页面高度
    const pageHeight: any = await page.evaluate('document.body.scrollHeight');

    // 计算需要滚动的次数
    const scrollCount = Math.ceil(pageHeight / scrollStep);

    // 初始化滚动位置
    let scrollTop = 0;

    // 循环进行滚动
    for (let i = 0; i < scrollCount; i++) {
      // 计算下一次滚动的位置
      const nextScrollTop = Math.min(scrollTop + scrollStep, pageHeight);

      // 执行滚动操作
      await page.evaluate(`window.scrollTo(0, ${nextScrollTop})`);

      // 等待一段时间
      await delay(scrollDelay);

      // 更新滚动位置
      scrollTop = nextScrollTop;
    }

    // 在页面中评估并提取插画信息
    const illustrationData = await page.evaluate(() => {
      // 创建存储图片信息和作者信息的数组
      const illustrationItems: { replacedUrl: string; title: string }[] = [];
      // 获取插画图片元素
      const elements = document.querySelectorAll(
        'section div:nth-child(3) div ul li',
      );

      // 遍历每个图片元素
      elements.forEach((element) => {
        // 获取 li 中的图片标签
        const imageUrlElement = element.querySelector(
          'div div[type="illust"] a div img',
        );
        // 获取图片 URL
        const imageUrl = imageUrlElement?.getAttribute('src') || '';
        // 获取图片标题
        const title = imageUrlElement?.getAttribute('alt') || '';

        // 如果图片 URL 存在，则替换为代理 URL；否则设置为空字符串
        let replacedUrl = imageUrl.replace(
          'i.pximg.net',
          'crawl.3046251309.workers.dev',
        );
        // // 替换可能的两种情况
        replacedUrl = replacedUrl.replace('/c/250x250_80_a2', '');
        replacedUrl = replacedUrl.replace('/c/250x250_80_a2', '');
        replacedUrl = replacedUrl.replace('/custom-thumb', '/img-original');
        replacedUrl = replacedUrl.replace('/img-master', '/img-original');
        // 移除链接中的_square1200和_custom1200部分
        replacedUrl = replacedUrl.replace('_square1200', '');
        replacedUrl = replacedUrl.replace('_custom1200', '');

        // 构建对象并添加到数组中
        illustrationItems.push({ replacedUrl, title });
      });

      // 返回提取的排行榜信息数组
      return illustrationItems;
    });

    // 遍历图片地址数组，下载图片到本地
    for (let i = 0; i < illustrationData.length; i++) {
      // 添加延迟，以免太快地下载
      await delay(3000);

      const timestamp = new Date().toLocaleString(); // 获取当前的时间
      let replacedUrl = illustrationData[i].replacedUrl; // 图片下载地址
      const title = illustrationData[i].title; // 图片标题

      /**
       * 设置文件名，可以根据需要自定义
       * @rankingType 排行分类
       * @pageNumber 第几页
       * @i 循环索引
       * @Date 当前的时间戳
       */
      let imageName = `image_${searchUser}_p${pageNumber}_${i + 1}_${Date.now()}.jpg`;
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
            number: 'P' + pageNumber + '_' + (i + 1),
            imageName: imageName,
            destination: destination,
            imageURL: replacedUrl,
            author: searchUser,
            title: title,
            DownloadTime: timestamp,
          };

          console.log(`图片下载成功：`, JSON.stringify(imageInfo));

          // 将对象转换为 JSON 字符串
          const jsonContent = JSON.stringify(imageInfo);
          // 续写入下载文件信息到txt文件
          fs.writeFile(logPath, jsonContent + '\n', { flag: 'a' }, (err) => {
            if (err) {
              console.log(`图片 ${replacedUrl} 信息记录失败：`, err);
            }
          });
        } catch (error: any) {
          retries++;
          console.log(
            `${error.message}，正在尝试重新下载，重试次数：${retries}`,
          );

          // 在第一次重试时尝试替换文件后缀
          if (retries === 1) {
            // 尝试替换文件后缀为另一个格式（例如，将.jpg替换为.png）
            replacedUrl = replacedUrl.replace('.jpg', '.png');
            imageName = `image_${searchUser}_p${pageNumber}_${i + 1}_${Date.now()}.png`;
            destination = `${imagePath}/${imageName}`; // 更新目标路径
          } else if (retries === 2) {
            // 在第二次重试时尝试替换文件后缀
            // 尝试替换文件后缀为另一个格式（例如，将.jpg替换为.png）
            replacedUrl = replacedUrl.replace('.png', '.jpge');
            imageName = `image_${searchUser}_p${pageNumber}_${i + 1}_${Date.now()}.jpge`;
            destination = `${imagePath}/${imageName}`; // 更新目标路径
          } else {
            // 尝试替换文件后缀为另一个格式（例如，将.jpg替换为.png）
            replacedUrl = replacedUrl.replace('.jpge', '.jpg');
            imageName = `image_${searchUser}_p${pageNumber}_${i + 1}_${Date.now()}.jpg`;
            destination = `${imagePath}/${imageName}`; // 更新目标路径
          }

          // 添加2秒延迟，以免太快地重试
          await delay(2000);
        }
      }

      // 下载错误次数超出提示
      if (!success) {
        console.log(`图片 ${replacedUrl} 无法下载，已达到最大重试次数`);
      }
    }
  };
}
