import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);

@Injectable()
export class FileService {
  /**
   * 分页读取文件内容并返回
   * @param filePath
   * @param page
   * @param pageSize
   * @param totalItems
   * @returns
   */
  async streamReadFile(
    filePath: string,
    page: number,
    pageSize: number,
    totalItems: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      const jsonObjects: any[] = [];
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      // 创建逐行读取文件的接口
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      // 监听每一行的读取事件
      rl.on('line', (line) => {
        // 判断是否在分页范围内
        if (lineCount >= start && lineCount < end) {
          // 解析 JSON 数据并加入结果数组
          if (line.trim() !== '') {
            try {
              jsonObjects.push(JSON.parse(line));
            } catch (err) {
              // 如果 JSON 解析出错，则关闭文件读取流并返回错误
              rl.close();
              reject(new Error('解析 JSON 时出错: ' + err.message));
            }
          }
        }
        lineCount++;

        // 达到分页末尾时关闭文件读取流
        if (lineCount >= end) {
          rl.close();
        }
      });

      // 监听文件读取结束事件
      rl.on('close', () => {
        // 解析结果并返回
        resolve({
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
          items: jsonObjects,
        });
      });

      // 监听文件读取错误事件
      rl.on('error', (err) => {
        // 返回读取错误
        reject(new Error('读取文件时出错: ' + err.message));
      });
    });
  }

  /**
   * 计算文件总行数
   * @param filePath
   * @returns
   */
  getTotalLineCount(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let lineCount = 0;

      // 创建逐行读取文件的接口
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      // 监听每一行的读取事件，递增计数器
      rl.on('line', () => {
        lineCount++;
      });

      // 监听文件读取结束事件，返回总行数
      rl.on('close', () => {
        resolve(lineCount);
      });

      // 监听文件读取错误事件，返回错误
      rl.on('error', (err) => {
        reject(new Error('读取文件时出错: ' + err.message));
      });
    });
  }

  /**
   * 删除图片文件
   * @param imagePath
   */
  async deleteImageFile(imagePath: string): Promise<void> {
    try {
      await unlinkAsync(imagePath);
      // console.log(`图片文件已删除: ${imagePath}`);
    } catch (error) {
      // console.error(`删除图像文件时出错: ${imagePath}`, error);
      throw new InternalServerErrorException('图片删除时发生错误');
    }
  }

  /**
   * 删除一行json信息
   * @param filePath
   * @param jsonObject
   */
  async deleteJsonLine(filePath, jsonObject) {
    // 记录开始时间
    const startTime = Date.now();
    // 临时文件路径
    const tempFilePath = `${filePath}.tmp`;
    // 创建文件读取流
    const fileStream = fs.createReadStream(filePath);
    // 使用 readline 逐行读取文件内容
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // 创建写入流，并显式设置文件权限
    const writeStream = fs.createWriteStream(tempFilePath, { mode: 0o666 });
    // 将 JSON 对象转换为字符串
    const jsonString = JSON.stringify(jsonObject);

    try {
      // 使用 for await 逐行读取文件内容
      for await (const line of rl) {
        // 如果当前行不是要删除的 JSON 字符串，则写入临时文件
        if (line.trim() !== jsonString) {
          writeStream.write(line + '\n');
        }
      }

      // 等待写入流结束
      await new Promise((resolve, reject) => {
        writeStream.end(resolve);
        writeStream.on('error', reject);
      });

      fileStream.close();
      rl.close();

      // 删除原始文件
      await unlinkAsync(filePath);
      // 将临时文件重命名为原始文件
      await renameAsync(tempFilePath, filePath);

      // 记录结束时间
      const endTime = Date.now();
      // 返回删除成功的信息
      return `删除成功, 耗时 ${endTime - startTime} ms`;
    } catch (error) {
      // 如果处理文件时出错，记录错误信息
      console.error('处理文件时出错', error);
      // 清理临时文件
      try {
        await unlinkAsync(tempFilePath);
      } catch (cleanupError) {
        console.error('清理临时文件时出错', cleanupError);
      }
      // 抛出自定义错误
      throw new Error('文件处理时发生错误');
    } finally {
      // 确保流正确关闭
      rl.close();
      fileStream.close();
    }
  }
}
