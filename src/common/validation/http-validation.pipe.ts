import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';

export interface ValidationErrorDetail {
  field: string;
  constraints: string[];
}

export function createHttpValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: VALIDATION_FAILED_CODE,
        details: toValidationErrorDetails(errors),
      }),
  });
}

function extractOwnDetail(error: ValidationError): ValidationErrorDetail[] {
  if (!error.constraints || Object.keys(error.constraints).length === 0) {
    return [];
  }

  return [
    {
      field: error.property,
      constraints: Object.values(error.constraints),
    },
  ];
}

function extractChildDetails(error: ValidationError): ValidationErrorDetail[] {
  return toValidationErrorDetails(error.children ?? []).map((detail) => ({
    field: `${error.property}.${detail.field}`,
    constraints: detail.constraints,
  }));
}

export function toValidationErrorDetails(
  errors: ValidationError[],
): ValidationErrorDetail[] {
  return errors.flatMap((error) =>
    extractOwnDetail(error).concat(extractChildDetails(error)),
  );
}
