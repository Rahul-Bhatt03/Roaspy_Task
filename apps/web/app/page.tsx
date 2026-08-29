'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createBatch } from '../lib/api';

export default function HomePage() {
  const [urls, setUrls] = useState(
    'https://example.com\nhttps://www.google.com\nhttps://github.com',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanedUrls = urls
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!cleanedUrls.length) {
      setError('Add at least one URL to start a batch.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createBatch(cleanedUrls);
      window.location.href = `/batches/${response.data.id}`;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Bulk URL Verification</span>
          <h1>Monitor URL health at scale.</h1>
          <p>
            Submit a list of URLs, enqueue checks in the background, and follow each batch from a
            single dashboard.
          </p>
          <div className="hero-actions">
            <Link href="/batches" className="primary-button">
              View batches
            </Link>
          </div>
        </div>

        <form className="submit-panel" onSubmit={handleSubmit}>
          <label htmlFor="urls">URLs to check</label>
          <textarea
            id="urls"
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            rows={10}
            placeholder="https://example.com"
          />
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating batch...' : 'Run batch check'}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
