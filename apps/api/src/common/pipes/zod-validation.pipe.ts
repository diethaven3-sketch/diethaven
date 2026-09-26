import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";
import { formatZodError } from "@repo/types";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      throw new BadRequestException({
        message: formatted.firstError ?? "Validation failed",
        fieldErrors: formatted.fieldErrors,
        formErrors: formatted.formErrors,
      });
    }
    return result.data;
  }
}
