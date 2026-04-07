export interface ValidationErrorConstraints {
  [key: string]: string;
}

export interface ValidationErrorChild {
  property: string;
  constraints: ValidationErrorConstraints;
}

export interface ValidationErrorItem {
  field: string;
  constraints?: ValidationErrorConstraints;
  children?: ValidationErrorChild[];
}

/**
 * Converts a `validation_failed` API error's items array into a flat record
 * of field-path → first error message, ready to pass to a form's setErrors.
 */
export function parseServerValidationErrors(
  items: ValidationErrorItem[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const item of items) {
    if (item.constraints && Object.keys(item.constraints).length) {
      const first = Object.values(item.constraints)[0];
      if (first) result[item.field] = first;
    }

    for (const child of item.children ?? []) {
      if (child.constraints) {
        const first = Object.values(child.constraints)[0];
        if (first) result[`${item.field}.${child.property}`] = first;
      }
    }
  }

  return result;
}
