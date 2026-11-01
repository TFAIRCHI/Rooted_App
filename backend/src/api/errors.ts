export class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

export function demand(condition: unknown, statusCode: number, code: string, message: string): asserts condition {
  if (!condition) throw new ApiError(statusCode, code, message);
}
