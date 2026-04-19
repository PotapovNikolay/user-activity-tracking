import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { toUtcTimestampOrNull } from '../date/utc-date.util';

export function IsBeforeOrEqual(
  otherProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isBeforeOrEqual',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [otherProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [otherKey] = args.constraints as [string];
          const other = (args.object as Record<string, unknown>)[otherKey];

          const left = toTimestamp(value);
          const right = toTimestamp(other);
          if (left === null || right === null) return true;

          return left <= right;
        },
        defaultMessage(args: ValidationArguments): string {
          const [otherKey] = args.constraints as [string];
          return `${args.property} must be <= ${otherKey}`;
        },
      },
    });
  };
}

function toTimestamp(value: unknown): number | null {
  return toUtcTimestampOrNull(value);
}
