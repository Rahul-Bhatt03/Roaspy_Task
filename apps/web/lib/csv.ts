export function parseCsvUrls(input: string): string[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      record.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') {
        index += 1;
      }
      record.push(field.trim());
      if (record.some(Boolean)) {
        records.push(record);
      }
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field || record.length) {
    record.push(field.trim());
    if (record.some(Boolean)) {
      records.push(record);
    }
  }

  const header = records[0]?.[0]?.toLowerCase();
  const data = header === 'url' || header === 'urls' ? records.slice(1) : records;
  return [...new Set(data.map((row) => row[0]).filter((url) => /^https?:\/\//i.test(url)))];
}
