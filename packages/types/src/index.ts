export type CompanyType = 'INTERNAL' | 'THIRD_PARTY';

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export * from './locale';

// export type ThemeMode = 'light' | 'dark' | 'system';

// export type ResolvedTheme = 'light' | 'dark';
