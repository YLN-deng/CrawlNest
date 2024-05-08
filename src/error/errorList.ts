// src/error/errorList.ts
// 用于定义错误码和错误信息的映射关系（主动抛出异常hanaError）

export const errorMessages: Map<number, string> = new Map([
  // 通用错误
  [10001, 'Unknown Error'],
  [10002, 'Invalid options'],

  // 登录错误
  [10101, 'Login Error'],

  // 下载错误
  [10201, 'Download Error'],

  // 表单错误
  [10301, 'Unknown leaderboard type'], //未知的排行榜类型！
]);
