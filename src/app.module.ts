import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorFilter } from './error/error.filter';
import { RankingModule } from './apps/ranking/ranking.module';
import { SearchModule } from './apps/search/search.module';
import { FileModule } from './apps/file/file.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Module({
  imports: [RankingModule, SearchModule, FileModule],
  providers: [
    // 全局错误过滤器
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
    // 全局拦截器，统一返回格式
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
