import { PostgresUrlCheckRepository } from '../repositories/implementations/postgres-url-check.repository.js';
import { UrlCheckRepository } from '../repositories/interfaces/url-check.repository.js';

export class UrlCheckService {
  constructor(
    private readonly urlCheckRepository: UrlCheckRepository = new PostgresUrlCheckRepository(),
  ) {}

  async process(
    input: { batchId: string; urlId: string; url: string },
    attemptNumber = 1,
    maxAttempts = 3,
  ) {
    const startedAt = Date.now();

    try {
      const response = await fetch(input.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const responseTime = Date.now() - startedAt;
      const bodyText = response.status < 400 ? await response.text().catch(() => '') : '';
      const pageTitle = this.extractPageTitle(bodyText);

      const status = response.ok ? 'success' : 'failed';

      if (response.status >= 500 && attemptNumber < maxAttempts) {
        throw new Error(`Transient HTTP ${response.status}`);
      }

      return this.urlCheckRepository.saveResult({
        batchId: input.batchId,
        urlId: input.urlId,
        url: input.url,
        status,
        httpStatus: response.status,
        responseTime,
        pageTitle,
        error: response.ok ? null : `HTTP ${response.status}`,
        attemptCount: attemptNumber,
      });
    } catch (error) {
      const responseTime = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (attemptNumber < maxAttempts) {
        throw error;
      }

      return this.urlCheckRepository.saveResult({
        batchId: input.batchId,
        urlId: input.urlId,
        url: input.url,
        status: 'failed',
        httpStatus: null,
        responseTime,
        pageTitle: null,
        error: message,
        attemptCount: attemptNumber,
      });
    }
  }

  private extractPageTitle(body: string) {
    const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) {
      return null;
    }

    return match[1].replace(/\s+/g, ' ').trim();
  }
}
