import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { toUtcTimestampOrNull } from '../date/utc-date.util';

const ISO_DATETIME_WITH_TZ =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function IsIsoDateTimeWithTz(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isIsoDateTimeWithTz',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (!ISO_DATETIME_WITH_TZ.test(value)) return false;
          return toUtcTimestampOrNull(value) !== null;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an ISO-8601 datetime with explicit timezone (Z or +HH:MM/-HH:MM)`;
        },
      },
    });
  };
}
