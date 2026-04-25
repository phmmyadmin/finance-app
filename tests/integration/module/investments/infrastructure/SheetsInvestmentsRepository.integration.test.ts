import { describe, it, expect, beforeAll } from 'vitest';
import { google } from 'googleapis';
import fs from 'node:fs/promises';
import { SheetsInvestmentsRepository } from '../../../../../src/module/investments/infrastructure/SheetsInvestmentsRepository.js';

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

describe.skipIf(skip)('SheetsInvestmentsRepository (integration)', () => {
  let repo: SheetsInvestmentsRepository;

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
    repo = new SheetsInvestmentsRepository(sheets, spreadsheetId!);
  });

  it('reads positions from all platform sheets', async () => {
    const positions = await repo.listAll();

    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0]).toMatchObject({
      platform: expect.any(String),
      name: expect.any(String),
      assetClass: expect.stringMatching(/equity|debt|real_estate|crypto|cash/),
      principal: { amount: expect.any(Number), currency: 'EUR' },
    });

    const platforms = new Set(positions.map((p) => p.platform));
    expect(platforms.size).toBeGreaterThan(1);
  });
});
