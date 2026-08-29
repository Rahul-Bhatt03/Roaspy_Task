'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Batch, getBatchById } from '../../../lib/api';

export default function BatchDetailPage({ params }: { params: { batchId: string } }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBatch = async () => {
      try {
        const response = await getBatchById(params.batchId);
        setBatch(response.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load batch details.');
      } finally {
        setLoading(false);
      }
    };

    loadBatch();
  }, [params.batchId]);

  if (loading) {
    return <main className="page-shell"><section className="panel-list"><p>Loading batch…</p></section></main>;
  }

  if (error || !batch) {
    return (
      <main className="page-shell">
        <section className="panel-list">
          <p>{error || 'Batch not found.'}</p>
          <Link href="/batches" className="secondary-button">Back to batches</Link>
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
          <Link href="/batches" className="secondary-button">All batches</Link>
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

        <div className="meta-box">
          <p>
            <strong>Created:</strong> {new Date(batch.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Updated:</strong> {new Date(batch.updatedAt).toLocaleString()}
          </p>
        </div>
      </section>
    </main>
  );
}
