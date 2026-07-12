import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(
  __dirname,
  '../src/modules/providers/myinvestor/fixtures',
);

const baseUrl = (
  process.env.MYINVESTOR_MCP_URL ?? 'https://mcp.myinvestor.es/mcp'
).replace(/\/$/, '');

/**
 * Parses a single JSON-RPC payload from an SSE response body.
 *
 * @param {string} body - Raw `text/event-stream` response body.
 * @returns {unknown} Parsed JSON-RPC message.
 */
function parseSseJson(body) {
  const dataLine = body.split('\n').find((line) => line.startsWith('data:'));

  if (!dataLine) {
    throw new Error(
      `No SSE data line found in response: ${body.slice(0, 200)}`,
    );
  }

  return JSON.parse(dataLine.slice('data:'.length));
}

/**
 * Opens an MCP session against the MyInvestor server.
 *
 * @returns {Promise<Record<string, string>>} Headers including the session id.
 */
async function openSession() {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  const initResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'inversora-fixture-capture', version: '0.1' },
      },
    }),
  });

  if (!initResponse.ok) {
    throw new Error(`MCP initialize failed (${initResponse.status})`);
  }

  await initResponse.text();
  const sessionId = initResponse.headers.get('mcp-session-id');
  const sessionHeaders = sessionId
    ? { ...headers, 'mcp-session-id': sessionId }
    : headers;

  await fetch(baseUrl, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  return sessionHeaders;
}

/**
 * Calls an MCP tool and returns its `structuredContent` payload.
 *
 * @param {Record<string, string>} headers - Session headers.
 * @param {string} name - MCP tool name.
 * @param {Record<string, unknown>} args - Tool arguments.
 * @returns {Promise<unknown>} Structured tool output.
 */
async function callTool(headers, name, args) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP tools/call ${name} failed (${response.status})`);
  }

  const message = parseSseJson(await response.text());

  if (message.error) {
    throw new Error(
      `MCP tools/call ${name} error: ${JSON.stringify(message.error)}`,
    );
  }

  if (message.result?.isError) {
    throw new Error(`MCP tool ${name} returned isError`);
  }

  if (message.result?.structuredContent === undefined) {
    throw new Error(`MCP tool ${name} returned no structuredContent`);
  }

  return message.result.structuredContent;
}

const captures = [
  {
    fileName: 'get-funds.isins-sample.json',
    tool: 'get_funds',
    args: { isins: ['IE00B03HD191', 'IE0031786142', 'LU0996177134'] },
  },
  {
    fileName: 'search-funds.indexed-global.json',
    tool: 'search_funds',
    args: { product_type: 'FONDOS_INDEXADOS', order_by: 'ter_asc', limit: 10 },
  },
];

await mkdir(fixturesDir, { recursive: true });

const headers = await openSession();
let savedCount = 0;

for (const capture of captures) {
  const data = await callTool(headers, capture.tool, capture.args);
  const targetPath = path.join(fixturesDir, capture.fileName);

  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  savedCount += 1;
  console.log(`Saved ${capture.fileName}`);
}

console.log(
  `Captured ${savedCount} MyInvestor MCP fixtures into ${fixturesDir}.`,
);
