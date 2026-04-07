export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  data?: unknown;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
