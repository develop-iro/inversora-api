import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(
  __dirname,
  '../src/modules/providers/financial-modeling-prep/fixtures',
);

const apiKey = process.env.FMP_API_KEY;
const baseUrl = (
  process.env.FMP_BASE_URL ?? 'https://financialmodelingprep.com'
).replace(/\/$/, '');

if (!apiKey) {
  console.error('FMP_API_KEY is required. Set it in .env before running.');
  process.exit(1);
}

/**
 * Endpoints available on the free FMP tier at the time of writing.
 * Paid-only endpoints are intentionally excluded to preserve API quota.
 */
const captures = [
  {
    fileName: 'search-symbol.query-spy.json',
    url: `${baseUrl}/stable/search-symbol?query=SPY&apikey=${apiKey}`,
  },
  {
    fileName: 'search-name.query-vanguard.json',
    url: `${baseUrl}/stable/search-name?query=Vanguard&apikey=${apiKey}`,
  },
  {
    fileName:
      'historical-price-eod.symbol-spy.from-2024-01-01.to-2024-01-31.json',
    url: `${baseUrl}/stable/historical-price-eod/full?symbol=SPY&from=2024-01-01&to=2024-01-31&apikey=${apiKey}`,
  },
  {
    fileName: 'etf-holdings.symbol-spy.json',
    url: `${baseUrl}/stable/etf/holdings?symbol=SPY&apikey=${apiKey}`,
  },
  {
    fileName: 'etf-sector-weightings.symbol-spy.json',
    url: `${baseUrl}/stable/etf/sector-weightings?symbol=SPY&apikey=${apiKey}`,
  },
  {
    fileName: 'etf-country-weightings.symbol-spy.json',
    url: `${baseUrl}/stable/etf/country-weightings?symbol=SPY&apikey=${apiKey}`,
  },
];

/**
 * Fetches a single FMP endpoint and persists the raw JSON response.
 *
 * @param {string} url - Fully qualified FMP URL including apikey.
 * @returns {Promise<unknown>} Parsed JSON body.
 */
async function fetchFixture(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `FMP request failed (${response.status}) for ${url.replace(apiKey, '***')}: ${body.slice(0, 120)}`,
    );
  }

  return response.json();
}

await mkdir(fixturesDir, { recursive: true });

let savedCount = 0;

for (const capture of captures) {
  const data = await fetchFixture(capture.url);
  const targetPath = path.join(fixturesDir, capture.fileName);

  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  savedCount += 1;
  console.log(`Saved ${capture.fileName}`);
}

console.log(
  [
    `Captured ${savedCount} FMP fixtures into ${fixturesDir}.`,
    'API calls used:',
    savedCount,
    'Paid-only endpoint etf/info is not captured by this script.',
    'Composition endpoints (holdings, sector-weightings, country-weightings) are included.',
  ].join(' '),
);
