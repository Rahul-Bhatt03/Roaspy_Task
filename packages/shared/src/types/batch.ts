export enum BatchStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export type Batch = {
  id: string;
  status: BatchStatus;
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
};
