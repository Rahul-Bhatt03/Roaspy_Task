'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Batch, createBatch, getBatches } from '../../lib/api';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [urls, setUrls] = useState('https://example.com\nhttps://news.ycombinator.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadBatches = async () => {
    try {
      const response = await getBatches();
      setBatches(response.data);
    } catch (loadError) {
      console.error(loadError);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanedUrls = urls
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!cleanedUrls.length) {
      setError('Please enter at least one URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const response = await createBatch(cleanedUrls);
      await loadBatches();
      window.location.href = `/batches/${response.data.id}`;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel-list">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Queue overview</span>
            <h1>Batches</h1>
            <p className="lede">A live record of every URL check in motion.</p>
          </div>
          <Link href="/" className="secondary-button">
            New submission
          </Link>
        </div>

        <form className="batch-form" onSubmit={handleSubmit}>
          <textarea value={urls} onChange={(event) => setUrls(event.target.value)} rows={8} />
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Create batch'}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <div className="batch-grid">
          {batches.length ? (
            batches.map((batch) => (
              <Link key={batch.id} href={`/batches/${batch.id}`} className="batch-card">
                <div className="batch-card-top">
                  <span className={`status-badge ${batch.status}`}>{batch.status}</span>
                  <span>{batch.totalUrls} URLs</span>
                </div>
                <strong className="batch-id">{batch.id}</strong>
                <small className="batch-progress">
                  {new Date(batch.createdAt).toLocaleString()} · {batch.completedUrls}/{batch.totalUrls} complete
                </small>
              </Link>
            ))
          ) : (
            <div className="empty-state">No batches yet. Create the first one above.</div>
          )}
        </div>
      </section>
    </main>
  );
}
