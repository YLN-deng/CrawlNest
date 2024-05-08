import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class FirstValidationErrorPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToClass(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      const firstError = Object.values(errors[0].constraints || {})[0];
      throw new BadRequestException(firstError);
    }
    return value;
  }

  private toValidate(metatype: unknown): metatype is Record<string, unknown> {
    return metatype && typeof metatype === 'function';
  }
}
