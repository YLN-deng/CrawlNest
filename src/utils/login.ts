import { Page } from 'puppeteer-core';

/**
 * 延迟函数，用于添加重试时的延迟
 * @param ms 延迟时间，毫秒
 * @returns
 */
export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 登录pixiv
 * @param page
 * @param req
 */
export const loginPixiv = async (
  page: Page,
  pixiv_username: string,
  pixiv_password: string,
) => {
  // 打开 Pixiv 网站登录页面
  await page.goto('https://accounts.pixiv.net/login');

  // 等待登录表单加载完成
  await page.waitForSelector('input[autocomplete="username webauthn"]', {
    timeout: 60000,
  });
  await page.waitForSelector(
    'input[autocomplete="current-password webauthn"]',
    {
      timeout: 60000,
    },
  );

  // 自动填写账号信息
  await page.type('input[autocomplete="username webauthn"]', pixiv_username);
  // 自动填写密码信息
  await page.type(
    'input[autocomplete="current-password webauthn"]',
    pixiv_password,
  );

  // 等待所有的登录按钮加载完成
  await page.waitForSelector('button[type="submit"]', { timeout: 60000 });

  // 获取所有匹配选择器的按钮元素
  const login_buttons = await page.$$('button[type="submit"]');

  // 检查是否有足够的登录按钮，第五个是账号密码的登录
  if (login_buttons.length >= 5) {
    // 点击第五个按钮（索引从0开始）
    await login_buttons[4].click();
  } else {
    throw new Error('登录错误');
  }

  // 等待主页面加载完成
  await page.waitForSelector('div[id="root"]', { timeout: 60000 });
};
