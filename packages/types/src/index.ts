export type CompanyType = 'INTERNAL' | 'THIRD_PARTY';

export type Locale = 'en' | 'ar';

export type TextDirection = 'ltr' | 'rtl';

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
