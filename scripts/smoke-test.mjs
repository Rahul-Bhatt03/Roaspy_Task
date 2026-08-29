const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:4000';

const expectStatus = async (response, expected, label) => {
  if (response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${response.status}`);
  }
};

const health = await fetch(`${apiUrl}/health`);
await expectStatus(health, 200, 'health');

const invalid = await fetch(`${apiUrl}/batches`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ urls: ['ftp://example.com'] }),
});
await expectStatus(invalid, 400, 'invalid URL validation');

const create = await fetch(`${apiUrl}/batches`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ urls: ['https://example.com'] }),
});
await expectStatus(create, 201, 'batch creation');
const { data: batch } = await create.json();

let result;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const response = await fetch(`${apiUrl}/batches/${batch.id}/urls`);
  await expectStatus(response, 200, 'URL result query');
  result = (await response.json()).data[0];
  if (result?.status === 'success' || result?.status === 'failed') {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

if (!result || !['success', 'failed'].includes(result.status)) {
  throw new Error('URL check did not reach a terminal state within 30 seconds');
}

if (
  result.status === 'success' &&
  (!Number.isInteger(result.httpStatus) || result.responseTime === null || !result.pageTitle)
) {
  throw new Error('Successful URL result is missing HTTP status, response time, or page title');
}

console.log(
  `Smoke test passed for batch ${batch.id}: ${result.status}, HTTP ${result.httpStatus ?? 'none'}, ${result.responseTime ?? 'none'}ms`,
);
