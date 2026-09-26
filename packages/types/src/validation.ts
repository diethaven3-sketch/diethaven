import { type ZodError, type ZodSchema } from "zod";

/**
 * Formatted validation error structure.
 */
export interface FormattedZodError {
  formErrors: string[];
  fieldErrors: Record<string, string>;
  firstError?: string;
}

/**
 * Formats a ZodError into a structured representation:
 * - fieldErrors: map of field path to error message (e.g. { "email": "Invalid email", "items.0.foodName": "Required" })
 * - formErrors: array of top-level schema errors
 * - firstError: the first human-readable error message encountered
 */
export function formatZodError(error: ZodError): FormattedZodError {
  const formErrors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  let firstError: string | undefined;

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!path) {
      formErrors.push(issue.message);
      if (!firstError) firstError = issue.message;
    } else {
      if (!fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
      if (!firstError) firstError = issue.message;
    }
  }

  return { formErrors, fieldErrors, firstError };
}

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
      errors: Record<string, string>;
      formErrors: string[];
      firstError: undefined;
    }
  | {
      success: false;
      data: undefined;
      errors: Record<string, string>;
      formErrors: string[];
      firstError: string;
    };

/**
 * Validates data against a Zod schema and returns a structured result.
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
      formErrors: [],
      firstError: undefined,
    };
  }

  const formatted = formatZodError(result.error);
  return {
    success: false,
    data: undefined,
    errors: formatted.fieldErrors,
    formErrors: formatted.formErrors,
    firstError: formatted.firstError ?? "Validation failed. Please check the form and try again.",
  };
}
