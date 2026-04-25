import { google } from 'googleapis';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH ?? '.credentials/credentials.json';
const tokenPath = process.env.GOOGLE_TOKEN_PATH ?? '.credentials/token.json';

type InstalledCredentials = {
  installed: {
    client_id: string;
    client_secret: string;
  };
};

async function loadInstalledCredentials(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as InstalledCredentials;
  if (!parsed.installed?.client_id || !parsed.installed?.client_secret) {
    throw new Error(`Credentials file ${filePath} is missing 'installed' section`);
  }
  return parsed.installed;
}

async function saveToken(filePath: string, tokens: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), 'utf-8');
}

async function main(): Promise<void> {
  const creds = await loadInstalledCredentials(credentialsPath);
  const oauth = new google.auth.OAuth2({
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    redirectUri: REDIRECT_URI,
  });

  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('Missing code');
        return;
      }
      oauth
        .getToken(code)
        .then(async ({ tokens }) => {
          await saveToken(tokenPath, tokens);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Authorization complete</h1><p>You can close this tab.</p>');
          console.log(`Token saved to ${tokenPath}`);
          server.close();
          resolve();
        })
        .catch((err: unknown) => {
          res.writeHead(500);
          res.end('Token exchange failed');
          server.close();
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    server.listen(PORT, () => {
      console.log(`Listening on http://localhost:${PORT}`);
      console.log('Opening browser. If it does not open, visit:');
      console.log(authUrl);
      spawn('open', [authUrl], { stdio: 'ignore', detached: true }).unref();
    });
  });
}

await main();
