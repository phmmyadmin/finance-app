import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { ReportData } from '../domain/Report.js';
import { renderHtmlReport } from './renderHtmlReport.js';

export type GenerateData = () => Promise<ReportData>;

const TEXT_HTML = 'text/html; charset=utf-8';
const APPLICATION_JSON = 'application/json; charset=utf-8';

function send(res: ServerResponse, status: number, contentType: string, body: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  generate: GenerateData,
): Promise<void> {
  const url = req.url ?? '/';
  if (req.method !== 'GET') {
    send(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
    return;
  }
  if (url === '/healthz') {
    send(res, 200, 'text/plain; charset=utf-8', 'ok');
    return;
  }
  if (url === '/api/data' || url.startsWith('/api/data?')) {
    const data = await generate();
    send(res, 200, APPLICATION_JSON, JSON.stringify(data, null, 2));
    return;
  }
  if (url === '/' || url.startsWith('/?')) {
    const data = await generate();
    send(res, 200, TEXT_HTML, renderHtmlReport(data));
    return;
  }
  send(res, 404, 'text/plain; charset=utf-8', 'Not Found');
}

export function createReportServer(generate: GenerateData): Server {
  return createServer((req, res) => {
    handle(req, res, generate).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      // Log full error to stderr so the dev sees it.
      console.error('[report] error handling request:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Internal error: ${message}`);
    });
  });
}
