export enum UrlCheckStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export type UrlCheck = {
  id: string;
  batchId: string;
  url: string;
  status: UrlCheckStatus;
  httpStatus?: number | null;
  responseTime?: number | null;
  pageTitle?: string | null;
  error?: string | null;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};
