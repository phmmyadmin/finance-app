import { describe, it, expect, beforeAll } from 'vitest';
import { google } from 'googleapis';
import fs from 'node:fs/promises';
import { SheetsCashflowRepository } from '../../../../../src/module/cashflow/infrastructure/SheetsCashflowRepository.js';

try {
  process.loadEnvFile('.env');
} catch {
  // .env not present; rely on whatever process.env already has
}

const spreadsheetId = process.env.SPREADSHEET_ID;
const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
const tokenPath = process.env.GOOGLE_TOKEN_PATH;

const skip = !spreadsheetId || !credentialsPath || !tokenPath;

type InstalledCredentials = {
  installed: { client_id: string; client_secret: string };
};

describe.skipIf(skip)('SheetsCashflowRepository (integration)', () => {
  let repo: SheetsCashflowRepository;

  beforeAll(async () => {
    const credsRaw = await fs.readFile(credentialsPath!, 'utf-8');
    const creds = (JSON.parse(credsRaw) as InstalledCredentials).installed;
    const tokenRaw = await fs.readFile(tokenPath!, 'utf-8');
    const token = JSON.parse(tokenRaw) as Record<string, unknown>;

    const oauth = new google.auth.OAuth2({
      clientId: creds.client_id,
      clientSecret: creds.client_secret,
    });
    oauth.setCredentials(token);
    const sheets = google.sheets({ version: 'v4', auth: oauth });
    repo = new SheetsCashflowRepository(sheets, spreadsheetId!);
  });

  it('reads transactions from the real spreadsheet', async () => {
    const transactions = await repo.listAll();

    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0]).toEqual({
      date: expect.any(Date),
      description: expect.any(String),
      amount: expect.any(Number),
      bank: expect.toSatisfy((value) => value === null || typeof value === 'string'),
    });
  });
});
