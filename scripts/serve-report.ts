import { buildAppContext } from '../src/composition.js';
import { generateReport, type TripInput } from '../src/module/report/application/generateReport.js';
import { createReportServer } from '../src/module/report/infrastructure/HttpReportServer.js';

const PORT = Number(process.env.REPORT_PORT ?? 8787);

// Hand-curated trips. Add new entries here as you travel.
// Date ranges detected from card spend / cash withdrawal patterns.
const TRIPS: TripInput[] = [
  { label: 'Tenerife', from: '2022-04-19', to: '2022-05-02' },
  { label: 'Cuba', from: '2022-06-23', to: '2022-07-11' },
  { label: 'Tailandia · Koh Phangan', from: '2022-11-07', to: '2022-12-12' },
  { label: 'Marruecos · Marrakech', from: '2023-11-13', to: '2023-11-17' },
  { label: 'Australia · Melbourne', from: '2023-12-05', to: '2023-12-11' },
  { label: 'Nueva Zelanda', from: '2023-12-12', to: '2023-12-26' },
  { label: 'Asia · TH / JP / PH', from: '2024-02-25', to: '2024-05-30' },
  { label: 'Gran Canaria', from: '2024-10-07', to: '2024-10-14' },
  { label: 'Filipinas', from: '2026-01-10', to: '2026-01-25' },
];

async function main(): Promise<void> {
  const ctx = await buildAppContext();
  const server = createReportServer(() =>
    generateReport(ctx.cashflowRepo, ctx.investmentsRepo, ctx.valuationsRepo, ctx.patrimonyRepo, {
      trips: TRIPS,
    }),
  );
  server.listen(PORT, () => {
    console.error(`finance-app report server running at http://localhost:${PORT}`);
    console.error('  GET /            → HTML dashboard (regenerated each request)');
    console.error('  GET /api/data    → JSON report data');
    console.error('  GET /healthz     → liveness check');
  });
}

await main();
