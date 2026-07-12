import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { HttpClientService } from '../../../shared/http/http-client.service';
import { MyInvestorMcpClient } from './myinvestor-mcp.client';
import { MYINVESTOR_DEFAULT_MCP_URL } from './myinvestor.constants';

describe('MyInvestorMcpClient', () => {
  let client: MyInvestorMcpClient;
  let httpClient: { post: jest.Mock };

  const initializeSse = [
    'event: message',
    'data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{},"serverInfo":{"name":"myinvestor"}}}',
    '',
  ].join('\n');

  const toolResultSse = (structured: unknown): string =>
    [
      'event: message',
      `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: {
          content: [{ type: 'text', text: 'ok' }],
          structuredContent: structured,
        },
      })}`,
      '',
    ].join('\n');

  const mockHandshake = (): void => {
    httpClient.post
      .mockResolvedValueOnce({
        data: initializeSse,
        status: 200,
        headers: { 'mcp-session-id': 'session-1' },
      })
      .mockResolvedValueOnce({ data: '', status: 202, headers: {} });
  };

  beforeEach(async () => {
    httpClient = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyInvestorMcpClient,
        { provide: HttpClientService, useValue: httpClient },
        {
          provide: AppConfigService,
          useValue: { myInvestorMcpUrl: MYINVESTOR_DEFAULT_MCP_URL },
        },
      ],
    }).compile();

    client = module.get(MyInvestorMcpClient);
  });

  it('performs the MCP handshake and returns structured tool content', async () => {
    mockHandshake();
    httpClient.post.mockResolvedValueOnce({
      data: toolResultSse({ data: { funds: [] } }),
      status: 200,
      headers: {},
    });

    await expect(
      client.callTool('get_funds', { isins: ['IE00B03HD191'] }),
    ).resolves.toEqual({ data: { funds: [] } });

    expect(httpClient.post).toHaveBeenCalledTimes(3);

    const [initCall, notifiedCall, toolCall] = httpClient.post.mock.calls as [
      [string, { method: string }, { headers: Record<string, string> }],
      [string, { method: string }, { headers: Record<string, string> }],
      [string, { method: string }, { headers: Record<string, string> }],
    ];

    expect(initCall[0]).toBe(MYINVESTOR_DEFAULT_MCP_URL);
    expect(initCall[1].method).toBe('initialize');
    expect(notifiedCall[1].method).toBe('notifications/initialized');
    expect(toolCall[1].method).toBe('tools/call');
    expect(toolCall[2].headers['mcp-session-id']).toBe('session-1');
  });

  it('reuses the session across tool calls', async () => {
    mockHandshake();
    httpClient.post
      .mockResolvedValueOnce({
        data: toolResultSse({ data: { funds: [] } }),
        status: 200,
        headers: {},
      })
      .mockResolvedValueOnce({
        data: toolResultSse({ data: { funds: [] } }),
        status: 200,
        headers: {},
      });

    await client.callTool('get_funds', { isins: ['A'] });
    await client.callTool('get_funds', { isins: ['B'] });

    expect(httpClient.post).toHaveBeenCalledTimes(4);
  });

  it('re-initializes the session when the server rejects it', async () => {
    mockHandshake();
    httpClient.post.mockRejectedValueOnce(
      new ExternalHttpError({
        message: 'session not found',
        statusCode: 404,
        provider: 'myinvestor-mcp',
      }),
    );
    mockHandshake();
    httpClient.post.mockResolvedValueOnce({
      data: toolResultSse({ data: { funds: [] } }),
      status: 200,
      headers: {},
    });

    await expect(
      client.callTool('get_funds', { isins: ['A'] }),
    ).resolves.toEqual({ data: { funds: [] } });
    expect(httpClient.post).toHaveBeenCalledTimes(6);
  });

  it('throws when the tool reports an error result', async () => {
    mockHandshake();
    httpClient.post.mockResolvedValueOnce({
      data: [
        'event: message',
        'data: {"jsonrpc":"2.0","id":2,"result":{"isError":true,"content":[]}}',
        '',
      ].join('\n'),
      status: 200,
      headers: {},
    });

    await expect(client.callTool('get_funds', {})).rejects.toBeInstanceOf(
      ExternalHttpError,
    );
  });

  it('throws when the response carries a JSON-RPC error', async () => {
    mockHandshake();
    httpClient.post.mockResolvedValueOnce({
      data: [
        'event: message',
        'data: {"jsonrpc":"2.0","id":2,"error":{"code":-32602,"message":"Invalid params"}}',
        '',
      ].join('\n'),
      status: 200,
      headers: {},
    });

    await expect(client.callTool('get_funds', {})).rejects.toThrow(
      /Invalid params/,
    );
  });

  it('accepts plain JSON responses without SSE framing', async () => {
    httpClient.post
      .mockResolvedValueOnce({
        data: { jsonrpc: '2.0', id: 1, result: {} },
        status: 200,
        headers: {},
      })
      .mockResolvedValueOnce({ data: '', status: 202, headers: {} })
      .mockResolvedValueOnce({
        data: {
          jsonrpc: '2.0',
          id: 2,
          result: { structuredContent: { data: { funds: [] } } },
        },
        status: 200,
        headers: {},
      });

    await expect(client.callTool('get_funds', {})).resolves.toEqual({
      data: { funds: [] },
    });
  });
});
