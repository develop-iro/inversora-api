/** Provider identifier used in logs and outbound HTTP errors. */
export const MYINVESTOR_PROVIDER_NAME = 'myinvestor-mcp';

/** Default MyInvestor MCP server endpoint. */
export const MYINVESTOR_DEFAULT_MCP_URL = 'https://mcp.myinvestor.es/mcp';

/** MCP protocol version negotiated with the MyInvestor server. */
export const MYINVESTOR_MCP_PROTOCOL_VERSION = '2025-06-18';

/** MCP client identity reported during the handshake. */
export const MYINVESTOR_MCP_CLIENT_INFO = {
  name: 'inversora-api',
  version: '1.0.0',
} as const;

/** MyInvestor catalog value for index mutual funds. */
export const MYINVESTOR_INDEX_FUND_PRODUCT_TYPE = 'FONDOS_INDEXADOS';
