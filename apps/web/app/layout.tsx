import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bulk URL Health Checker',
  description: 'Monitor batches of URLs with Fastify, Redis, and Neon-powered workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">BU</span>
            <span>Bulk URL <span className="brand-subtitle">health desk</span></span>
          </Link>
          <Link href="/batches" className="nav-link">View batches</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
