// src/error/error.filter.ts

// 引入 Nest.js 提供的异常处理相关模块
import { Catch, HttpStatus, HttpException } from '@nestjs/common';
// 引入 TypeORM 提供的 QueryFailedError
import { QueryFailedError } from 'typeorm';
// 引入 express 模块中的 Response 类型
import type { Response } from 'express';
// 引入 Nest.js 中的 ArgumentsHost 和 ExceptionFilter 类型
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

// 使用 @Catch 装饰器指定要捕获的异常类型为 Error
@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  // 实现 catch 方法，处理捕获到的异常
  catch(exception: Error, host: ArgumentsHost): any {
    // 获取响应对象
    const response = host.switchToHttp().getResponse<Response>();

    // 如果捕获到的异常是 HttpException 类型的
    if (exception instanceof HttpException) {
      // 获取异常的状态码和响应数据
      const statusCode = exception.getStatus();
      const data = exception.getResponse();
      const { message } = exception;

      // 返回带有指定状态码和消息的 JSON 响应
      response.status(statusCode).json({
        code: data?.['code'] || statusCode,
        message: data?.['message'] || message || 'Unknown Error',
      });
    } else if (exception instanceof QueryFailedError) {
      // 如果捕获到的异常是 QueryFailedError 类型的（TypeORM 抛出的数据库查询异常）
      // 返回带有 BAD_REQUEST 状态码和消息的 JSON 响应
      response.status(HttpStatus.BAD_REQUEST).json({
        code: HttpStatus.BAD_REQUEST,
        message: exception.message || 'Database Error',
      });
    } else {
      // 如果捕获到的异常不是上述两种情况，即为其他类型的异常
      // 返回带有 INTERNAL_SERVER_ERROR 状态码和消息的 JSON 响应
      response
        .status(
          exception?.['statusCode'] ||
            exception?.['status'] ||
            HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .json({
          code: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message || 'Internal Server Error',
        });
    }
  }
}
