import type { Batch, UrlCheck } from '@bulk-url/shared';
export type { Batch, UrlCheck } from '@bulk-url/shared';

export type BatchApiResponse<T> = { data: T };

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorBody.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchJson<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function createBatch(urls: string[]) {
  return apiRequest<BatchApiResponse<Batch>>('/batches', {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export async function getBatches() {
  return apiRequest<BatchApiResponse<Batch[]>>('/batches');
}

export async function getBatchById(batchId: string) {
  return apiRequest<BatchApiResponse<Batch>>(`/batches/${batchId}`);
}

export async function getBatchUrls(batchId: string) {
  return apiRequest<BatchApiResponse<UrlCheck[]>>(`/batches/${batchId}/urls`);
}

export async function cancelBatch(batchId: string) {
  return apiRequest<BatchApiResponse<Batch>>(`/batches/${batchId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function retryFailed(batchId: string) {
  return apiRequest<BatchApiResponse<Batch>>(`/batches/${batchId}/retry-failed`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
