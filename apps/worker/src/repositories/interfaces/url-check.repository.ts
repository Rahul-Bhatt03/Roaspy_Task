export interface UrlCheckRepository {
  saveResult(input: {
    batchId: string;
    urlId: string;
    url: string;
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped';
    httpStatus?: number | null;
    responseTime?: number | null;
    pageTitle?: string | null;
    error?: string | null;
    attemptCount?: number;
  }): Promise<unknown>;
}
