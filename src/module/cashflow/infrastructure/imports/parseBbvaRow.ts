import { categorize } from '../../domain/categorize.js';
import type { Transaction } from '../../domain/Transaction.js';

const BANK = 'BBVA';
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseSpanishDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

// xlsx.sheet_to_json drops leading empty columns, so indices start at the first
// non-empty column. BBVA report layout: 0=F.Valor, 1=Fecha, 2=Concepto,
// 3=Movimiento, 4=Importe, 5=Divisa, 6=Disponible, 7=Divisa, 8=Observaciones.
export function parseBbvaRow(row: unknown[]): Transaction | null {
  const date = parseSpanishDate(row[1]);
  if (!date) return null;

  const importe = row[4];
  if (typeof importe !== 'number') return null;

  const concepto = typeof row[2] === 'string' ? row[2].trim() : '';
  const observaciones = typeof row[8] === 'string' ? row[8].trim() : '';
  const description = `${concepto} ${observaciones}`.trim();
  const amount = Math.round(importe * 100) / 100;

  return {
    date,
    description,
    amount,
    bank: BANK,
    category: categorize({ description, amount }),
  };
}
