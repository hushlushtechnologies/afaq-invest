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
export * from './audit';
export * from './rbac';
export * from './roles';
export * from './staff';
