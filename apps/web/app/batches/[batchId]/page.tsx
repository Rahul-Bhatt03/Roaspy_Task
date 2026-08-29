'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Batch,
  UrlCheck,
  cancelBatch,
  getBatchById,
  getBatchUrls,
  retryFailed,
} from '../../../lib/api';

export default function BatchDetailPage({ params }: { params: { batchId: string } }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urls, setUrls] = useState<UrlCheck[]>([]);

  useEffect(() => {
    const loadBatch = async () => {
      try {
        const response = await getBatchById(params.batchId);
        setBatch(response.data);
        const urlResponse = await getBatchUrls(params.batchId);
        setUrls(urlResponse.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load batch details.');
      } finally {
        setLoading(false);
      }
    };

    loadBatch();
  }, [params.batchId]);

  useEffect(() => {
    const source = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/batches/${params.batchId}/events`,
    );
    source.onmessage = (event) => {
      const nextBatch = JSON.parse(event.data) as Batch;
      setBatch(nextBatch);
      void getBatchUrls(params.batchId).then((response) => setUrls(response.data));
    };
    return () => source.close();
  }, [params.batchId]);

  const runAction = async (action: () => Promise<{ data: Batch }>) => {
    try {
      const response = await action();
      setBatch(response.data);
      const urlResponse = await getBatchUrls(params.batchId);
      setUrls(urlResponse.data);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed.');
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="panel-list">
          <p>Loading batch…</p>
        </section>
      </main>
    );
  }

  if (error || !batch) {
    return (
      <main className="page-shell">
        <section className="panel-list">
          <p>{error || 'Batch not found.'}</p>
          <Link href="/batches" className="secondary-button">
            Back to batches
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel-list">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Batch report</span>
            <h1>{batch.id}</h1>
          </div>
          <Link href="/batches" className="secondary-button">
            All batches
          </Link>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <small>Status</small>
            <strong className={`status-badge ${batch.status}`}>{batch.status}</strong>
          </article>
          <article className="stat-card">
            <small>Total URLs</small>
            <strong>{batch.totalUrls}</strong>
          </article>
          <article className="stat-card">
            <small>Completed</small>
            <strong>{batch.completedUrls}</strong>
          </article>
          <article className="stat-card">
            <small>Failed</small>
            <strong>{batch.failedUrls}</strong>
          </article>
        </div>
        <progress value={batch.completedUrls + batch.failedUrls} max={batch.totalUrls} />

        <div className="meta-box">
          <p>
            <strong>Created:</strong> {new Date(batch.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Updated:</strong> {new Date(batch.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="hero-actions">
          {batch.status !== 'cancelled' && batch.status !== 'completed' ? (
            <button
              className="secondary-button"
              onClick={() => void runAction(() => cancelBatch(params.batchId))}
            >
              Cancel batch
            </button>
          ) : null}
          {batch.failedUrls > 0 ? (
            <button
              className="secondary-button"
              onClick={() => void runAction(() => retryFailed(params.batchId))}
            >
              Retry failed
            </button>
          ) : null}
        </div>
        <div className="batch-grid">
          {urls.map((urlCheck) => (
            <article className="batch-card" key={urlCheck.id}>
              <div className="batch-card-top">
                <span className={`status-badge ${urlCheck.status}`}>{urlCheck.status}</span>
                <span>{urlCheck.httpStatus ?? 'No response'}</span>
              </div>
              <strong>{urlCheck.url}</strong>
              <small>
                {urlCheck.responseTime ?? '-'} ms · Attempt {urlCheck.attemptCount}
                {urlCheck.pageTitle ? ` · ${urlCheck.pageTitle}` : ''}
              </small>
              {urlCheck.error ? <small className="error-text">{urlCheck.error}</small> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
