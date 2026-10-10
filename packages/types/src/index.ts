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
export * from './company';
export * from './investment';
export * from './opportunity';
export * from './investor';
export * from './kyc';
