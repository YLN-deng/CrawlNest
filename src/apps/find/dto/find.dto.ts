import { IsNotEmpty, IsString, IsBooleanString } from 'class-validator';

class CrawlCommon {
  @IsString()
  @IsNotEmpty({ message: '图片保存路径不能为空' })
  imagePath!: string;

  @IsString()
  @IsNotEmpty({ message: '浏览器路径不能为空' })
  executablePath!: string;

  @IsString()
  @IsBooleanString()
  headless!: string;

  @IsString()
  @IsNotEmpty({ message: 'pixiv账号不能为空' })
  pixiv_username!: string;

  @IsString()
  @IsNotEmpty({ message: 'pixiv密码不能为空' })
  pixiv_password!: string;

  @IsString()
  @IsNotEmpty({ message: '请选择是否开启代理' })
  useProxy!: string;

  port?: string;
}

// 爬虫验证发现
class CrawlFindVerification extends CrawlCommon {
  @IsString()
  @IsNotEmpty({ message: '发现分类不能为空' })
  findType!: string;

  @IsString()
  @IsNotEmpty({ message: '请输入开始页面范围' })
  pageStart!: number;

  @IsString()
  @IsNotEmpty({ message: '请输入结束页面范围' })
  pageEnd!: number;
}

export { CrawlFindVerification };
