export interface BatchRepository {
  findAll(): Promise<unknown>;
  findById(id: string): Promise<unknown>;
  create(input: { urls: string[] }): Promise<unknown>;
}
