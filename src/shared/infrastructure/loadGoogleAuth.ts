import fs from 'node:fs/promises';
import { google } from 'googleapis';

type InstalledCredentials = {
  installed: { client_id: string; client_secret: string };
};

export async function loadGoogleAuth() {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
  const tokenPath = process.env.GOOGLE_TOKEN_PATH;
  if (!credentialsPath || !tokenPath) {
    throw new Error('GOOGLE_CREDENTIALS_PATH and GOOGLE_TOKEN_PATH are required');
  }

  const credsRaw = await fs.readFile(credentialsPath, 'utf-8');
  const creds = (JSON.parse(credsRaw) as InstalledCredentials).installed;
  const tokenRaw = await fs.readFile(tokenPath, 'utf-8');
  const token = JSON.parse(tokenRaw) as Record<string, unknown>;

  const oauth = new google.auth.OAuth2({
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
  });
  oauth.setCredentials(token);
  return oauth;
}
