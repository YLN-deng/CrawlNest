import { SocksProxyAgent } from 'socks-proxy-agent';
import * as axios from 'axios';
import * as fs from 'fs';

/**
 * 下载函数
 * @param fileUrl 文件的 URL 地址
 * @param destination 文件下载保存的本地路径
 * @param useProxy 是否使用代理，默认为 false
 * @returns Promise<void>
 */
export const download = async (
  fileUrl: string,
  destination: string,
  useProxy: boolean = false,
  port: string,
): Promise<void> => {
  let agent: any = null;

  // 如果需要使用代理
  if (useProxy) {
    // 替换为你的 Clash 代理服务器地址和端口
    const proxyUrl = `socks5://localhost:${port}`;
    agent = new SocksProxyAgent(proxyUrl);
  }

  try {
    // 发起 HTTP GET 请求获取图片数据流
    const response = await axios.default({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
      timeout: 60000, // 设置超时时间为 60 秒
      httpsAgent: agent, // 使用代理服务器的 HTTPS 代理
    });

    // 将图片数据流写入到指定的本地路径
    response.data.pipe(fs.createWriteStream(destination));

    // 返回一个 Promise 以便在下载完成时进行异步处理
    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        resolve(); // 下载完成，解析 Promise
      });

      response.data.on('error', (err: any) => {
        reject(err); // 下载出错，拒绝 Promise 并传递错误
      });
    });
  } catch (error) {
    throw new Error(`下载文件 ${fileUrl} 到 ${destination} 失败`); // 将错误重新抛出以便上层代码捕获和处理
  }
};
