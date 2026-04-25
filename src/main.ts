import { google } from 'googleapis';
import fs from 'node:fs/promises';
import { SheetsCashflowRepository } from './module/cashflow/infrastructure/SheetsCashflowRepository.js';

type InstalledCredentials = {
  installed: { client_id: string; client_secret: string };
};

async function loadAuthClient() {
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

async function main(): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const repo = new SheetsCashflowRepository(sheets, spreadsheetId);

  const transactions = await repo.listAll();
  console.log(`Loaded ${transactions.length} transactions`);
  for (const tx of transactions.slice(0, 5)) {
    console.log(
      `${tx.date.toISOString().slice(0, 10)} | ${tx.bank ?? '(no bank)'} | ${tx.amount} | ${tx.description}`,
    );
  }
  console.log('...');
  for (const tx of transactions.slice(-5)) {
    console.log(
      `${tx.date.toISOString().slice(0, 10)} | ${tx.bank ?? '(no bank)'} | ${tx.amount} | ${tx.description}`,
    );
  }
}

await main();
