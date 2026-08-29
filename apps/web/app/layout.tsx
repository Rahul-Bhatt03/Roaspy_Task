import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bulk URL Health Checker',
  description: 'Monitor batches of URLs with Fastify, Redis, and Neon-powered workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
