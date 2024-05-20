import {
  Controller,
  Get,
  Query,
  Body,
  Delete,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  @Get('read')
  async readFile(
    @Query('path') filePath: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ): Promise<any> {
    // 解析查询参数
    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 50;
    // 创建对象
    const fileService = new FileService();

    try {
      // 计算文件总行数，在应用中使用缓存机制
      const totalItems = await fileService.getTotalLineCount(filePath);

      // 分页读取文件内容并返回
      return await fileService.streamReadFile(
        filePath,
        pageNum,
        size,
        totalItems,
      );
    } catch (error) {
      // 处理错误情况
      return { error: error.message };
    }
  }

  @Delete('delete')
  async deleteLine(
    @Body() body: { imagePath: string; filePath: string; jsonObject: object },
  ): Promise<string> {
    const { imagePath, filePath, jsonObject } = body;
    const fileService = new FileService();
    try {
      // 先尝试删除图片文件
      try {
        await fileService.deleteImageFile(imagePath);
      } catch (error) {
        // 记录删除图片的错误，但继续执行删除JSON行的操作
        console.error('删除图片时出错，继续删除 JSON 行', error);
      }

      // 删除txt文件中的json行
      const result = await fileService.deleteJsonLine(filePath, jsonObject);
      return result;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
