import { BatchRecord } from '../../db/schema/batches.js';
import { UrlCheckRecord } from '../../db/schema/url-checks.js';

export interface BatchRepository {
  findAll(): Promise<BatchRecord[]>;
  findById(id: string): Promise<BatchRecord | null>;
  findUrls(batchId: string): Promise<UrlCheckRecord[]>;
  create(input: { urls: string[] }): Promise<BatchRecord>;
  cancel(id: string): Promise<BatchRecord | null>;
  retryFailed(id: string): Promise<{ batch: BatchRecord | null; urls: UrlCheckRecord[] }>;
}
