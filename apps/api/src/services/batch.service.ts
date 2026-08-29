import { BatchRepository } from '../repositories/interfaces/batch.repository.js';

export class BatchService {
  constructor(private readonly batchRepository: BatchRepository) {}

  async createBatch(input: { urls: string[] }) {
    return this.batchRepository.create(input);
  }

  async getAllBatches() {
    return this.batchRepository.findAll();
  }

  async getBatchById(id: string) {
    return this.batchRepository.findById(id);
  }

  async getBatchUrls(id: string) {
    return this.batchRepository.findUrls(id);
  }

  async cancelBatch(id: string) {
    return this.batchRepository.cancel(id);
  }

  async retryFailed(id: string) {
    return this.batchRepository.retryFailed(id);
  }
}
