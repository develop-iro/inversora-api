import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { HttpClientService } from '../../../shared/http/http-client.service';
import {
  MYINVESTOR_MCP_CLIENT_INFO,
  MYINVESTOR_MCP_PROTOCOL_VERSION,
  MYINVESTOR_PROVIDER_NAME,
} from './myinvestor.constants';

const jsonRpcMessageSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.number(), z.string()]).optional(),
    result: z.unknown().optional(),
    error: z
      .object({
        code: z.number(),
        message: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const toolCallResultSchema = z
  .object({
    isError: z.boolean().optional(),
    structuredContent: z.unknown().optional(),
  })
  .passthrough();

/**
 * Minimal MCP client for the public MyInvestor catalog server.
 *
 * Speaks JSON-RPC 2.0 over streamable HTTP: it opens a session with
 * `initialize`, then invokes read-only tools via `tools/call` and returns
 * their `structuredContent` payload. Sessions are re-established
 * transparently when the server discards them.
 */
@Injectable()
export class MyInvestorMcpClient {
  private readonly logger = new Logger(MyInvestorMcpClient.name);
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Calls a read-only MCP tool and returns its structured payload.
   *
   * @param toolName - MCP tool name (for example `get_funds`).
   * @param toolArguments - Tool arguments object.
   * @returns Raw `structuredContent` payload from the tool result.
   */
  async callTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      return await this.callToolWithSession(toolName, toolArguments);
    } catch (error) {
      if (!this.isSessionError(error)) {
        throw error;
      }

      this.logger.warn(
        `MCP session rejected for ${toolName}; re-initializing session`,
      );
      this.sessionId = null;

      return this.callToolWithSession(toolName, toolArguments);
    }
  }

  private async callToolWithSession(
    toolName: string,
    toolArguments: Record<string, unknown>,
  ): Promise<unknown> {
    const sessionId = await this.ensureSession();
    const message = await this.sendRequest(
      'tools/call',
      { name: toolName, arguments: toolArguments },
      sessionId,
    );
    const result = toolCallResultSchema.safeParse(message.result);

    if (!result.success || result.data.isError === true) {
      throw new ExternalHttpError({
        message: `MyInvestor MCP tool ${toolName} returned an error result`,
        provider: MYINVESTOR_PROVIDER_NAME,
      });
    }

    if (result.data.structuredContent === undefined) {
      throw new ExternalHttpError({
        message: `MyInvestor MCP tool ${toolName} returned no structured content`,
        provider: MYINVESTOR_PROVIDER_NAME,
      });
    }

    return result.data.structuredContent;
  }

  private async ensureSession(): Promise<string | null> {
    if (this.sessionId !== null) {
      return this.sessionId;
    }

    const response = await this.postJsonRpc(
      {
        jsonrpc: '2.0',
        id: this.nextRequestId(),
        method: 'initialize',
        params: {
          protocolVersion: MYINVESTOR_MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: MYINVESTOR_MCP_CLIENT_INFO,
        },
      },
      null,
    );

    this.parseJsonRpcMessage(response.data, 'initialize');
    this.sessionId = response.headers['mcp-session-id'] ?? null;

    await this.postJsonRpc(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      this.sessionId,
    );

    return this.sessionId;
  }

  private async sendRequest(
    method: string,
    params: Record<string, unknown>,
    sessionId: string | null,
  ): Promise<z.infer<typeof jsonRpcMessageSchema>> {
    const response = await this.postJsonRpc(
      {
        jsonrpc: '2.0',
        id: this.nextRequestId(),
        method,
        params,
      },
      sessionId,
    );

    return this.parseJsonRpcMessage(response.data, method);
  }

  private async postJsonRpc(
    body: Record<string, unknown>,
    sessionId: string | null,
  ): Promise<{ data: unknown; headers: Record<string, string> }> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    };

    if (sessionId !== null) {
      headers['mcp-session-id'] = sessionId;
    }

    const response = await this.httpClient.post<unknown>(
      this.config.myInvestorMcpUrl,
      body,
      {
        provider: MYINVESTOR_PROVIDER_NAME,
        headers,
      },
    );

    return { data: response.data, headers: response.headers };
  }

  private parseJsonRpcMessage(
    data: unknown,
    method: string,
  ): z.infer<typeof jsonRpcMessageSchema> {
    const payload =
      typeof data === 'string' ? this.parseSsePayload(data) : data;
    const parsed = jsonRpcMessageSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ExternalHttpError({
        message: `Invalid JSON-RPC response from MyInvestor MCP ${method}`,
        provider: MYINVESTOR_PROVIDER_NAME,
        cause: parsed.error,
      });
    }

    if (parsed.data.error !== undefined) {
      throw new ExternalHttpError({
        message: `MyInvestor MCP ${method} failed: ${parsed.data.error.message}`,
        provider: MYINVESTOR_PROVIDER_NAME,
        statusCode: this.mapJsonRpcErrorToStatus(parsed.data.error.code),
      });
    }

    return parsed.data;
  }

  private parseSsePayload(body: string): unknown {
    const dataLine = body.split('\n').find((line) => line.startsWith('data:'));

    if (dataLine === undefined) {
      throw new ExternalHttpError({
        message: 'MyInvestor MCP response contained no SSE data line',
        provider: MYINVESTOR_PROVIDER_NAME,
      });
    }

    return JSON.parse(dataLine.slice('data:'.length)) as unknown;
  }

  private mapJsonRpcErrorToStatus(code: number): number | undefined {
    return code === -32001 ? 404 : undefined;
  }

  private isSessionError(error: unknown): boolean {
    return (
      error instanceof ExternalHttpError &&
      (error.statusCode === 400 || error.statusCode === 404)
    );
  }

  private nextRequestId(): number {
    this.requestId += 1;

    return this.requestId;
  }
}
