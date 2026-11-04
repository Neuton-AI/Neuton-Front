export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterMs?: number,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
