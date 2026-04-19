import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isActivityPageCursor } from '../pagination/activity-page-cursor';

export function IsActivityPageCursor(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isActivityPageCursor',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isActivityPageCursor(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid activity page cursor`;
        },
      },
    });
  };
}
