export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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

export type BatchApiResponse<T> = { data: T };

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
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
