import type { Category } from '../../cashflow/domain/Category.js';
import type { MonthBucket, ReportData, TopExpense, Trip } from '../domain/Report.js';

const MONTH_NAMES_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const CATEGORY_LABEL_ES: Record<Category, string> = {
  groceries: 'Compra',
  restaurants: 'Restaurantes',
  transport: 'Transporte',
  utilities: 'Suministros',
  subscriptions: 'Suscripciones',
  shopping: 'Shopping',
  entertainment: 'Ocio',
  cash_withdrawal: 'Cash',
  investments: 'Inversiones',
  transfers_self: 'Transfers',
  bizum: 'Bizum',
  income: 'Ingresos',
  uncategorized: 'Sin categorizar',
};

const escape = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatEur = (n: number, opts: { sign?: boolean; decimals?: number } = {}): string => {
  const decimals = opts.decimals ?? 2;
  const formatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const abs = Math.abs(n);
  const formatted = formatter.format(abs);
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}${formatted} €`;
};

const formatPct = (frac: number | null, opts: { sign?: boolean } = {}): string => {
  if (frac === null) return '—';
  const pct = frac * 100;
  const formatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const sign = opts.sign !== false && pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${formatter.format(Math.abs(pct))} %`;
};

const formatDateEs = (iso: string): string => {
  const parts = iso.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '';
  const d = parts[2] ?? '';
  const monthIndex = Number(m) - 1;
  const month = MONTH_NAMES_ES[monthIndex] ?? m;
  return `${d}-${month}-${y}`;
};

const formatMonthLabel = (ym: string): string => {
  const m = ym.split('-')[1] ?? '';
  return MONTH_NAMES_ES[Number(m) - 1] ?? m;
};

const monthYearShort = (ym: string): string => {
  const y = ym.split('-')[0] ?? '';
  return `'${y.slice(2)}`;
};

function renderMonthlyChart(monthly: MonthBucket[]): string {
  if (monthly.length === 0) return '<div style="color: var(--muted)">Sin datos</div>';
  const values = monthly.map((m) => m.realSpending);
  const max = Math.max(...values, 1);
  const niceMax = Math.ceil(max / 500) * 500;
  const total = values.reduce((s, v) => s + v, 0);
  const avg = total / monthly.length;

  const left = 46;
  const right = 590;
  const top = 20;
  const bottom = 180;
  const slot = (right - left) / monthly.length;
  const barWidth = Math.max(8, Math.min(40, slot - 9));

  const yFor = (v: number): number => bottom - (v / niceMax) * (bottom - top);
  const yAvg = yFor(avg);

  const yTicks = 4;
  const tickValues = Array.from(
    { length: yTicks },
    (_, i) => (niceMax / (yTicks - 1)) * (yTicks - 1 - i),
  );

  const grid = tickValues
    .map((_, i) => {
      const y = top + ((bottom - top) / (yTicks - 1)) * i;
      return `<line x1="${left - 6}" y1="${y}" x2="${right}" y2="${y}" />`;
    })
    .join('');
  const yLabels = tickValues
    .map((v, i) => {
      const y = top + ((bottom - top) / (yTicks - 1)) * i;
      const label = v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;
      return `<text x="${left - 8}" y="${y + 3}" text-anchor="end">${label}</text>`;
    })
    .join('');

  const bars = monthly
    .map((b, i) => {
      const x = left + slot * i + (slot - barWidth) / 2;
      const y = yFor(b.realSpending);
      const h = bottom - y;
      const isCurrent = i === monthly.length - 1;
      const isLow = b.realSpending < avg * 0.5;
      const fill = isCurrent ? '#4cc38a' : '#58a6ff';
      const opacity = isLow && !isCurrent ? '0.55' : '1';
      const label = formatEur(b.realSpending, { decimals: 0 }).replace(' €', '');
      const labelY = Math.max(top + 8, y - 4);
      const labelColor = isCurrent ? '#4cc38a' : '#8b949e';
      const fontWeight = isCurrent ? '600' : '400';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${h.toFixed(1)}" fill="${fill}" rx="2" opacity="${opacity}" />
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${labelY.toFixed(1)}" fill="${labelColor}" font-weight="${fontWeight}" font-size="8" text-anchor="middle">${label}</text>`;
    })
    .join('');

  const xLabels = monthly
    .map((b, i) => {
      const x = left + slot * i + slot / 2;
      const monthLabel = formatMonthLabel(b.month);
      const year = monthYearShort(b.month);
      const yearLabel =
        i === 0 || b.month.endsWith('-01')
          ? `<text x="${x.toFixed(1)}" y="208" fill="#5b6470" font-size="8" text-anchor="middle">${year}</text>`
          : '';
      return `<text x="${x.toFixed(1)}" y="195" fill="#8b949e" font-size="9" text-anchor="middle">${monthLabel}</text>${yearLabel}`;
    })
    .join('');

  return `
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-label="Gasto real mensual">
      <g stroke="#262d38" stroke-width="1">${grid}</g>
      <g fill="#8b949e" font-size="9" font-family="-apple-system, sans-serif">${yLabels}</g>
      <line x1="${left}" y1="${yAvg.toFixed(1)}" x2="${right}" y2="${yAvg.toFixed(1)}" stroke="#e3b341" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />
      <text x="${right - 2}" y="${(yAvg - 4).toFixed(1)}" text-anchor="end" fill="#e3b341" font-size="9" font-family="-apple-system, sans-serif">media ${formatEur(avg, { decimals: 0 })}</text>
      <g>${bars}</g>
      <g font-family="-apple-system, sans-serif">${xLabels}</g>
    </svg>
  `;
}

function renderPatrimonyChart(snapshots: ReportData['patrimony'], currentTotal: number): string {
  const points = snapshots.map((s) => ({ year: s.year, value: s.patrimony }));
  const lastYear = points.length > 0 ? points.at(-1)!.year : new Date().getUTCFullYear();
  const currentYear = lastYear + 1;
  const all = [...points, { year: currentYear, value: currentTotal }];
  if (all.length < 2) return '<div style="color: var(--muted)">Sin datos suficientes</div>';

  const max = Math.max(...all.map((p) => p.value), 1);
  const niceMax = Math.ceil(max / 5000) * 5000;

  const left = 50;
  const right = 590;
  const top = 20;
  const bottom = 200;

  const minYear = all[0]!.year;
  const maxYear = all.at(-1)!.year;
  const xFor = (year: number): number =>
    left + ((year - minYear) / Math.max(1, maxYear - minYear)) * (right - left);
  const yFor = (v: number): number => bottom - (v / niceMax) * (bottom - top);

  const polyline = all
    .map((p) => `${xFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath = `M${all
    .map((p) => `${xFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(
      ' L',
    )} L${xFor(all.at(-1)!.year).toFixed(1)},${bottom} L${xFor(all[0]!.year).toFixed(1)},${bottom} Z`;

  const yTicks = 5;
  const tickValues = Array.from(
    { length: yTicks },
    (_, i) => (niceMax / (yTicks - 1)) * (yTicks - 1 - i),
  );
  const grid = tickValues
    .map((_, i) => {
      const y = top + ((bottom - top) / (yTicks - 1)) * i;
      return `<line x1="40" y1="${y}" x2="${right}" y2="${y}" />`;
    })
    .join('');
  const yLabels = tickValues
    .map((v, i) => {
      const y = top + ((bottom - top) / (yTicks - 1)) * i;
      const label = v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;
      return `<text x="36" y="${y + 3}" text-anchor="end">${label}</text>`;
    })
    .join('');

  const dots = all
    .map((p, i) => {
      const isLast = i === all.length - 1;
      const r = isLast ? 3.5 : 2.5;
      const stroke = isLast ? ' stroke="#0e1116" stroke-width="2"' : '';
      return `<circle cx="${xFor(p.year).toFixed(1)}" cy="${yFor(p.value).toFixed(1)}" r="${r}"${stroke} />`;
    })
    .join('');

  const xLabels = all
    .filter((_, i) => i % Math.max(1, Math.floor(all.length / 6)) === 0 || i === all.length - 1)
    .map(
      (p) =>
        `<text x="${xFor(p.year).toFixed(1)}" y="215">'${String(p.year).slice(2)}${
          p.year === currentYear ? '*' : ''
        }</text>`,
    )
    .join('');

  return `
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-label="Patrimonio histórico">
      <g stroke="#262d38" stroke-width="1">${grid}</g>
      <g fill="#8b949e" font-size="9" font-family="-apple-system, sans-serif">${yLabels}</g>
      <path d="${areaPath}" fill="rgba(76,195,138,0.15)" />
      <polyline fill="none" stroke="#4cc38a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${polyline}" />
      <g fill="#4cc38a">${dots}</g>
      <g fill="#8b949e" font-size="9" font-family="-apple-system, sans-serif" text-anchor="middle">${xLabels}</g>
    </svg>
  `;
}

function renderCategoryBars(byCategory: Partial<Record<Category, number>>): string {
  // Build display rows: for non-excluded categories with negative net, render |amount|.
  const rows: Array<{ label: string; amount: number; key: Category | 'bizum_net' }> = [];
  for (const [cat, raw] of Object.entries(byCategory) as Array<[Category, number]>) {
    if (cat === 'transfers_self' || cat === 'investments' || cat === 'cash_withdrawal') continue;
    if (cat === 'income') continue;
    if (cat === 'bizum') {
      // Show only when net negative
      if (raw < 0) rows.push({ label: 'Bizum (neto)', amount: -raw, key: 'bizum_net' });
      continue;
    }
    if (raw < 0) rows.push({ label: CATEGORY_LABEL_ES[cat], amount: -raw, key: cat });
  }
  rows.sort((a, b) => b.amount - a.amount);
  if (rows.length === 0) return '<div style="color: var(--muted)">Sin gastos en el período</div>';
  const max = rows[0]!.amount;
  return rows
    .map(
      (r) => `
      <div class="bar-row">
        <span class="name">${escape(r.label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${((r.amount / max) * 100).toFixed(1)}%"></div></div>
        <span class="num">${formatEur(r.amount)}</span>
      </div>`,
    )
    .join('');
}

function renderTopExpenses(top: TopExpense[]): string {
  if (top.length === 0) return '<div style="color: var(--muted)">Sin gastos significativos</div>';
  return `
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="num">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${top
          .map(
            (e) => `
          <tr>
            <td>
              ${escape(e.description)}
              <div class="pill">${escape(CATEGORY_LABEL_ES[e.category])} · ${formatDateEs(e.date)}</div>
            </td>
            <td class="num neg">${formatEur(e.amount)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderBalanceByBank(map: Record<string, number>): string {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '<div style="color: var(--muted)">Sin datos</div>';
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const max = entries[0]![1];
  const palette = ['#58a6ff', '#4cc38a', '#e3b341', '#f85149', '#bc8cff'];
  const bars = entries
    .map(
      ([bank, amount]) => `
      <div class="bar-row">
        <span class="name">${escape(bank)}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${((amount / max) * 100).toFixed(1)}%"></div></div>
        <span class="num">${formatEur(amount)}</span>
      </div>`,
    )
    .join('');
  const legend = entries
    .map(
      ([bank, amount], i) =>
        `<span><span class="sw" style="background: ${palette[i % palette.length]}"></span>${escape(bank)} ${((amount / total) * 100).toFixed(1)} %</span>`,
    )
    .join('');
  const stack = entries
    .map(
      ([, amount], i) =>
        `<span style="background: ${palette[i % palette.length]}; width: ${((amount / total) * 100).toFixed(1)}%"></span>`,
    )
    .join('');
  return `
    ${bars}
    <div style="margin-top: 14px">
      <div class="legend" style="margin-bottom: 6px">${legend}</div>
      <div class="stack">${stack}</div>
    </div>
  `;
}

function renderPortfolio(portfolio: ReportData['portfolio']): string {
  const max = portfolio.byPlatform[0]?.amount ?? 1;
  const platformBars = portfolio.byPlatform
    .map(
      (p) => `
      <div class="bar-row">
        <span class="name">${escape(p.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${((p.amount / max) * 100).toFixed(1)}%"></div></div>
        <span class="num">${formatEur(p.amount)}</span>
      </div>`,
    )
    .join('');
  const palette = ['#58a6ff', '#4cc38a', '#e3b341', '#f85149', '#bc8cff'];
  const legend = portfolio.byAssetClass
    .map(
      (a, i) =>
        `<span><span class="sw" style="background: ${palette[i % palette.length]}"></span>${escape(a.assetClass)} ${(a.share * 100).toFixed(1)} %</span>`,
    )
    .join('');
  const stack = portfolio.byAssetClass
    .map(
      (a, i) =>
        `<span style="background: ${palette[i % palette.length]}; width: ${(a.share * 100).toFixed(1)}%"></span>`,
    )
    .join('');
  return `
    <div style="margin-bottom: 16px">
      <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px">Por plataforma</div>
      ${platformBars}
    </div>
    <div>
      <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px">Por clase de activo</div>
      <div class="legend" style="margin-bottom: 6px">${legend}</div>
      <div class="stack">${stack}</div>
    </div>
  `;
}

function renderRecurring(recurring: ReportData['recurring']): string {
  const expenses = recurring
    .filter((r) => r.estimatedMonthlyCost < 0)
    .map((r) => ({ ...r, estimatedMonthlyCost: -r.estimatedMonthlyCost }));
  if (expenses.length === 0)
    return '<div style="color: var(--muted)">Sin recurrentes detectadas</div>';
  const totalMonthly = expenses.reduce((s, r) => s + r.estimatedMonthlyCost, 0);
  return `
    <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px">Total ~${formatEur(totalMonthly, { decimals: 0 })} / mes</div>
    <table>
      <thead>
        <tr>
          <th>Servicio</th>
          <th class="num">€/mes</th>
        </tr>
      </thead>
      <tbody>
        ${expenses
          .slice(0, 8)
          .map(
            (r) => `
          <tr>
            <td>${escape(r.merchant.length > 40 ? r.merchant.slice(0, 40) + '…' : r.merchant)}</td>
            <td class="num">${formatEur(r.estimatedMonthlyCost)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAnnual(annual: ReportData['annual']): string {
  if (!annual) return '';
  const { previous, current, categories } = annual;
  const incomeDelta =
    previous.income > 0 ? (current.income - previous.income) / previous.income : null;
  const spendDelta =
    previous.realSpending > 0
      ? (current.realSpending - previous.realSpending) / previous.realSpending
      : null;
  const savingsDelta = current.savingsRate - previous.savingsRate;

  const topCategories = categories.filter((c) => c.prev > 100 || c.current > 100).slice(0, 8);
  const cats = topCategories
    .map(
      (c) => `
      <tr>
        <td>${escape(CATEGORY_LABEL_ES[c.category])}</td>
        <td class="num">${formatEur(c.prev, { decimals: 0 })}</td>
        <td class="num">${formatEur(c.current, { decimals: 0 })}</td>
        <td class="num ${c.pct === null ? '' : c.pct > 0 ? 'neg' : 'pos'}">${formatPct(c.pct)}</td>
      </tr>`,
    )
    .join('');

  return `
    <section>
      <h2>Comparativa anual · ${previous.year} vs ${current.year}</h2>
      <div class="annual">
        <div class="card">
          <h3>Resumen ejercicio</h3>
          <div class="row"><span style="color: var(--muted)">Ingresos ${previous.year}</span><span>${formatEur(previous.income, { decimals: 0 })}</span></div>
          <div class="row"><span style="color: var(--muted)">Ingresos ${current.year}</span><span>${formatEur(current.income, { decimals: 0 })} <span class="pill ${incomeDelta && incomeDelta >= 0 ? 'green' : 'amber'}">${formatPct(incomeDelta)}</span></span></div>
          <div class="row"><span style="color: var(--muted)">Gasto real ${previous.year}</span><span>${formatEur(previous.realSpending, { decimals: 0 })}</span></div>
          <div class="row"><span style="color: var(--muted)">Gasto real ${current.year}</span><span>${formatEur(current.realSpending, { decimals: 0 })} <span class="pill ${spendDelta && spendDelta < 0 ? 'green' : 'amber'}">${formatPct(spendDelta)}</span></span></div>
          <div class="row"><span style="color: var(--muted)">Tasa de ahorro ${previous.year}</span><span>${(previous.savingsRate * 100).toFixed(1)} %</span></div>
          <div class="row"><span style="color: var(--muted)">Tasa de ahorro ${current.year}</span><span class="${savingsDelta >= 0 ? 'pos' : 'neg'}">${(current.savingsRate * 100).toFixed(1)} % <span class="pill ${savingsDelta >= 0 ? 'green' : 'amber'}">${savingsDelta >= 0 ? '+' : ''}${(savingsDelta * 100).toFixed(1)} pp</span></span></div>
          ${
            previous.patrimonyDelta !== null && current.patrimonyDelta !== null
              ? `
            <div class="row"><span style="color: var(--muted)">Crecimiento patrimonio ${previous.year}</span><span>${formatEur(previous.patrimonyDelta, { sign: true, decimals: 0 })}</span></div>
            <div class="row"><span style="color: var(--muted)">Crecimiento patrimonio ${current.year}</span><span>${formatEur(current.patrimonyDelta, { sign: true, decimals: 0 })}</span></div>
          `
              : ''
          }
        </div>
        <div class="card">
          <h3>Categorías destacadas</h3>
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th class="num">${previous.year}</th>
                <th class="num">${current.year}</th>
                <th class="num">Δ</th>
              </tr>
            </thead>
            <tbody>${cats}</tbody>
          </table>
          <div style="font-size: 11px; color: var(--muted); margin-top: 8px">
            Saltos grandes en categorías como <em>compra</em> o <em>transporte</em> suelen ser
            artefacto de mejor categorización en ${current.year}: en años antiguos la mayoría caía
            en <em>uncategorized</em>.
          </div>
        </div>
      </div>
    </section>
  `;
}

const TRIP_PALETTE = ['#58a6ff', '#4cc38a', '#e3b341', '#f85149', '#bc8cff', '#ff8e72'];

function renderTrips(trips: Trip[]): string {
  if (trips.length === 0) return '';

  const sorted = [...trips].sort((a, b) => (a.from < b.from ? -1 : 1));

  // Section summary
  const totalSpent = sorted.reduce((s, t) => s + t.total, 0);
  const totalDays = sorted.reduce((s, t) => s + t.days, 0);
  const avgPerDay = totalDays > 0 ? totalSpent / totalDays : 0;

  const cards = sorted
    .map((t, i) => {
      const accent = TRIP_PALETTE[i % TRIP_PALETTE.length];
      const restaurants = t.byCategory.restaurants ? -t.byCategory.restaurants : 0;
      const groceries = t.byCategory.groceries ? -t.byCategory.groceries : 0;
      const shopping = t.byCategory.shopping ? -t.byCategory.shopping : 0;
      const transport = t.byCategory.transport ? -t.byCategory.transport : 0;
      const uncat = t.byCategory.uncategorized ? -t.byCategory.uncategorized : 0;
      const yearBadge = t.from.slice(0, 4);
      return `
      <div class="trip" style="--trip-accent: ${accent}">
        <div class="trip-header">
          <div>
            <h3>${escape(t.label)}</h3>
            <div class="when">${formatDateEs(t.from)} → ${formatDateEs(t.to)} · ${t.days} días</div>
          </div>
          <span class="pill" style="background: ${accent}22; color: ${accent}">${yearBadge}</span>
        </div>
        <div class="trip-stats">
          <div class="stat"><div class="l">Total</div><div class="v">${formatEur(t.total, { decimals: 0 })}</div></div>
          <div class="stat"><div class="l">€/día</div><div class="v">${formatEur(t.perDay, { decimals: 0 })}</div></div>
          <div class="stat"><div class="l">Cash</div><div class="v">${formatEur(t.cashWithdrawn, { decimals: 0 })}</div></div>
        </div>
        ${
          restaurants + groceries + shopping + transport + uncat > 0
            ? `
        <table>
          <tbody>
            ${t.cashWithdrawn > 0 ? `<tr><td>Cash withdrawal</td><td class="num">${formatEur(t.cashWithdrawn, { decimals: 0 })}</td></tr>` : ''}
            ${restaurants > 0 ? `<tr><td>Restaurantes</td><td class="num">${formatEur(restaurants, { decimals: 0 })}</td></tr>` : ''}
            ${groceries > 0 ? `<tr><td>Compra</td><td class="num">${formatEur(groceries, { decimals: 0 })}</td></tr>` : ''}
            ${shopping > 0 ? `<tr><td>Shopping</td><td class="num">${formatEur(shopping, { decimals: 0 })}</td></tr>` : ''}
            ${transport > 0 ? `<tr><td>Transport</td><td class="num">${formatEur(transport, { decimals: 0 })}</td></tr>` : ''}
            ${uncat > 0 ? `<tr><td>Otros</td><td class="num">${formatEur(uncat, { decimals: 0 })}</td></tr>` : ''}
          </tbody>
        </table>`
            : ''
        }
        ${
          t.topMerchant
            ? `<div style="font-size: 11px; color: var(--muted); margin-top: 8px">Mayor cargo: ${escape(t.topMerchant.description.length > 40 ? t.topMerchant.description.slice(0, 40) + '…' : t.topMerchant.description)} · ${formatEur(t.topMerchant.amount)}</div>`
            : ''
        }
      </div>`;
    })
    .join('');

  // Per-day comparison (sorted by per-day descending for readability)
  const byPerDay = [...sorted].sort((a, b) => b.perDay - a.perDay);
  const maxPerDay = Math.max(...byPerDay.map((t) => t.perDay), 1);
  const compare = byPerDay
    .map(
      (t) => `
      <div class="bar-row">
        <span class="name">${escape(t.label)} <span style="color: var(--muted); font-size: 11px">(${t.days} d)</span></span>
        <div class="bar-track"><div class="bar-fill" style="width: ${((t.perDay / maxPerDay) * 100).toFixed(1)}%"></div></div>
        <span class="num">${formatEur(t.perDay, { decimals: 0 })}/día</span>
      </div>`,
    )
    .join('');

  // Total cost comparison (descending)
  const byTotal = [...sorted].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...byTotal.map((t) => t.total), 1);
  const totals = byTotal
    .map(
      (t) => `
      <div class="bar-row">
        <span class="name">${escape(t.label)}</span>
        <div class="bar-track"><div class="bar-fill warn" style="width: ${((t.total / maxTotal) * 100).toFixed(1)}%"></div></div>
        <span class="num">${formatEur(t.total, { decimals: 0 })}</span>
      </div>`,
    )
    .join('');

  return `
    <section>
      <h2>Viajes</h2>
      <div class="kpis" style="margin-bottom: 16px">
        <div class="kpi-mini"><div class="label">Viajes registrados</div><div class="value">${sorted.length}</div><div class="sub">desde ${sorted[0]!.from.slice(0, 4)}</div></div>
        <div class="kpi-mini"><div class="label">Días totales</div><div class="value">${totalDays}</div><div class="sub">~${(totalDays / 365).toFixed(1)} años de viaje</div></div>
        <div class="kpi-mini"><div class="label">Gasto total en viajes</div><div class="value">${formatEur(totalSpent, { decimals: 0 })}</div><div class="sub">tarjeta + cash</div></div>
        <div class="kpi-mini"><div class="label">€/día medio</div><div class="value">${formatEur(avgPerDay, { decimals: 0 })}</div><div class="sub">ponderado por días</div></div>
      </div>
      <div class="trip-grid">${cards}</div>
      ${
        sorted.length >= 2
          ? `<div class="grid-2-eq" style="margin-top: 20px">
        <div class="card">
          <h3>Comparativa €/día</h3>
          ${compare}
        </div>
        <div class="card">
          <h3>Coste total</h3>
          ${totals}
        </div>
      </div>`
          : ''
      }
    </section>
  `;
}

function renderFreshness(freshness: ReportData['freshness']): string {
  const rows = freshness
    .map((f) => {
      let pill = '<span class="pill red">sin valorar</span>';
      if (f.daysSince !== null) {
        const cls = f.daysSince <= 7 ? 'green' : f.daysSince <= 30 ? 'amber' : 'red';
        const label = f.daysSince === 0 ? 'hoy' : `${f.daysSince} días`;
        pill = `<span class="pill ${cls}">${label}</span>`;
      }
      const date = f.lastUpdate ? formatDateEs(f.lastUpdate) : '—';
      return `<div class="row"><span>${escape(f.source)}</span><span>${pill} · ${date}</span></div>`;
    })
    .join('');
  return `
    <section class="card">
      <h3>Frescura de datos</h3>
      <div class="freshness-grid">${rows}</div>
    </section>
  `;
}

function renderPatrimonyTable(snapshots: ReportData['patrimony'], current: number): string {
  const rows = snapshots
    .slice(-5)
    .map(
      (s) => `
      <tr>
        <td>${s.year}</td>
        <td class="num">${formatEur(s.patrimony, { decimals: 0 })}</td>
        <td class="num pos">${formatEur(s.improvementEur, { sign: true, decimals: 0 })}</td>
      </tr>`,
    )
    .join('');
  const lastSnap = snapshots.at(-1);
  const currentYear = (lastSnap?.year ?? new Date().getUTCFullYear()) + 1;
  const delta = lastSnap ? current - lastSnap.patrimony : 0;
  return `
    <table style="margin-top: 8px">
      <thead><tr><th>Año</th><th class="num">Patrimonio</th><th class="num">Δ</th></tr></thead>
      <tbody>
        ${rows}
        <tr>
          <td>${currentYear} <span class="pill amber">en curso</span></td>
          <td class="num">${formatEur(current, { decimals: 0 })}</td>
          <td class="num ${delta >= 0 ? 'pos' : 'neg'}">${formatEur(delta, { sign: true, decimals: 0 })}</td>
        </tr>
      </tbody>
    </table>
  `;
}

const STYLES = `
:root {
  --bg: #0e1116;
  --bg-2: #161b22;
  --bg-3: #1f2630;
  --border: #262d38;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #4cc38a;
  --accent-soft: rgba(76, 195, 138, 0.15);
  --danger: #f85149;
  --warn: #e3b341;
  --info: #58a6ff;
  --pos: #4cc38a;
  --neg: #f85149;
  --shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.35);
}
* { box-sizing: border-box; }
html, body {
  background: var(--bg); color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px; line-height: 1.5; margin: 0; padding: 0;
}
.wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px; }
header.page { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; margin-bottom: 32px; flex-wrap: wrap; }
header.page h1 { font-size: 26px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
header.page .sub { color: var(--muted); font-size: 13px; }
header.page .meta { text-align: right; color: var(--muted); font-size: 12px; line-height: 1.6; }
.refresh {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 6px;
  background: var(--bg-3); color: var(--text); border: 1px solid var(--border);
  font-size: 12px; cursor: pointer; text-decoration: none;
  font-family: inherit;
}
.refresh:hover { border-color: var(--accent); color: var(--accent); }
section { margin-bottom: 36px; }
h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); font-weight: 600; margin: 0 0 12px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; box-shadow: var(--shadow); }
.kpi .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.kpi .value { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.kpi .delta { margin-top: 4px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.kpi-mini { background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; box-shadow: var(--shadow); }
.kpi-mini .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.kpi-mini .value { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.kpi-mini .sub { font-size: 11px; color: var(--muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
.pos { color: var(--pos); }
.neg { color: var(--neg); }
.grid-2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
.grid-2-eq { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.card { background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; box-shadow: var(--shadow); }
.card h3 { font-size: 14px; font-weight: 600; margin: 0 0 14px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.card h3 .total { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
table th, table td { text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--border); }
table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); font-weight: 500; }
table td.num, table th.num { text-align: right; }
table tr:last-child td { border-bottom: none; }
.bar-row { display: grid; grid-template-columns: 130px 1fr 100px; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; }
.bar-row .name { color: var(--text); }
.bar-row .num { text-align: right; font-variant-numeric: tabular-nums; color: var(--text); }
.bar-track { background: var(--bg-3); height: 8px; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #58a6ff, #4cc38a); }
.bar-fill.warn { background: linear-gradient(90deg, #e3b341, #f85149); }
.pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: var(--bg-3); color: var(--muted); }
.pill.green { background: var(--accent-soft); color: var(--accent); }
.pill.red { background: rgba(248, 81, 73, 0.12); color: var(--danger); }
.pill.amber { background: rgba(227, 179, 65, 0.12); color: var(--warn); }
.pill.blue { background: rgba(88, 166, 255, 0.12); color: var(--info); }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
.legend .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.stack { display: flex; height: 14px; border-radius: 4px; overflow: hidden; background: var(--bg-3); }
.stack > span { display: block; height: 100%; }
.chart-wrap { width: 100%; margin-top: 6px; }
svg { display: block; width: 100%; height: auto; }
.footnote { margin-top: 24px; color: var(--muted); font-size: 11px; border-top: 1px solid var(--border); padding-top: 12px; }
.freshness-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; font-size: 12px; }
.freshness-grid .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--border); }
.freshness-grid .row:last-child, .freshness-grid .row:nth-last-child(2) { border-bottom: none; }
.trip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.trip { background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; box-shadow: var(--shadow); position: relative; overflow: hidden; --trip-accent: #58a6ff; }
.trip::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--trip-accent); }
.trip-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
.trip h3 { margin: 0 0 4px; font-size: 15px; }
.trip .when { color: var(--muted); font-size: 11px; }
.trip-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.trip-stats .stat { background: var(--bg-3); border-radius: 6px; padding: 6px 8px; }
.trip-stats .stat .l { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.trip-stats .stat .v { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; }
.trip table { font-size: 12px; }
.trip table td { padding: 4px 4px; border-bottom: 1px solid var(--bg-3); }
.trip table tr:last-child td { border-bottom: none; }
.annual { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
.annual .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; font-variant-numeric: tabular-nums; }
.annual .row:last-child { border-bottom: none; }
@media (max-width: 900px) {
  .kpis, .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-2, .grid-2-eq, .grid-3, .annual { grid-template-columns: 1fr; }
  .freshness-grid { grid-template-columns: 1fr; }
}
@media print {
  html, body { background: #fff; color: #111; }
  .card, .kpi, .kpi-mini, .trip { box-shadow: none; border-color: #ddd; background: #fafafa; }
  .bar-track { background: #eee; }
  .bar-fill { background: #555 !important; }
  .pos { color: #1a7f37; }
  .neg { color: #cf222e; }
  h2, .muted, .kpi .label, .kpi .delta, .freshness-grid .row, table th { color: #555; }
  .footnote { color: #555; }
  .refresh { display: none; }
}
`;

export function renderHtmlReport(data: ReportData): string {
  const generated = new Date(data.generatedAt);
  const formatDateTime = generated.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const primaryMonth = data.primaryPeriod.from.slice(0, 7);
  const monthLabel = `${formatMonthLabel(primaryMonth)} '${primaryMonth.slice(2, 4)}`;

  // KPIs
  const monthlyTotal = data.monthly.reduce((s, m) => s + m.realSpending, 0);
  const monthlyAvg = data.monthly.length > 0 ? monthlyTotal / data.monthly.length : 0;

  const ytdAvg =
    data.comparatives.ytdMonths > 0 ? data.comparatives.ytdTotal / data.comparatives.ytdMonths : 0;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reporte financiero · ${escape(monthLabel)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="wrap">
    <header class="page">
      <div>
        <h1>Reporte financiero</h1>
        <div class="sub">${escape(monthLabel)} · histórico, comparativas y viajes</div>
      </div>
      <div class="meta">
        <a href="/" class="refresh" title="Recarga con datos frescos">↻ Actualizar</a><br /><br />
        Generado: ${escape(formatDateTime)}<br />
        Datos: Google Sheets vía finance-app
      </div>
    </header>

    <section>
      <h2>Resumen</h2>
      <div class="kpis">
        <div class="kpi">
          <div class="label">Patrimonio neto</div>
          <div class="value">${formatEur(data.netWorth.total)}</div>
          <div class="delta ${data.netWorth.deltaSinceLastPatrimony !== null && data.netWorth.deltaSinceLastPatrimony >= 0 ? 'pos' : ''}">${
            data.netWorth.lastPatrimony && data.netWorth.deltaSinceLastPatrimony !== null
              ? `${formatEur(data.netWorth.deltaSinceLastPatrimony, { sign: true })} vs ${data.netWorth.lastPatrimony.year}`
              : '—'
          }</div>
        </div>
        <div class="kpi">
          <div class="label">Caja total</div>
          <div class="value">${formatEur(data.netWorth.cash)}</div>
          <div class="delta">${Object.keys(data.balanceByBank).length} cuentas</div>
        </div>
        <div class="kpi">
          <div class="label">Inversiones (valor)</div>
          <div class="value">${formatEur(data.netWorth.investments)}</div>
          <div class="delta ${data.netWorth.investmentsUnrealized >= 0 ? 'pos' : 'neg'}">${formatEur(data.netWorth.investmentsUnrealized, { sign: true })} (${formatPct(data.netWorth.investmentsUnrealizedPct)}) sobre principal</div>
        </div>
        <div class="kpi">
          <div class="label">Gasto real ${escape(monthLabel)}</div>
          <div class="value">${formatEur(data.primary.realSpending)}</div>
          <div class="delta">${data.primary.transactions} movimientos · sin transfers · sin inversión</div>
        </div>
      </div>
    </section>

    <section>
      <h2>Comparativas · gasto real ${escape(monthLabel)}</h2>
      <div class="grid-4">
        <div class="kpi-mini">
          <div class="label">vs mes anterior</div>
          <div class="value ${data.comparatives.vsPreviousMonth !== null && data.comparatives.vsPreviousMonth > 0 ? 'pos' : data.comparatives.vsPreviousMonth !== null && data.comparatives.vsPreviousMonth < 0 ? 'neg' : ''}">${formatPct(data.comparatives.vsPreviousMonth)}</div>
          <div class="sub">${data.monthly.length >= 2 ? `${formatEur(data.monthly.at(-1)!.realSpending, { decimals: 0 })} vs ${formatEur(data.monthly.at(-2)!.realSpending, { decimals: 0 })}` : '—'}</div>
        </div>
        <div class="kpi-mini">
          <div class="label">vs mismo mes hace 1 año</div>
          <div class="value ${data.comparatives.vsSameMonthLastYear !== null && data.comparatives.vsSameMonthLastYear > 0 ? 'pos' : data.comparatives.vsSameMonthLastYear !== null && data.comparatives.vsSameMonthLastYear < 0 ? 'neg' : ''}">${formatPct(data.comparatives.vsSameMonthLastYear)}</div>
          <div class="sub">YoY</div>
        </div>
        <div class="kpi-mini">
          <div class="label">vs media 12 meses</div>
          <div class="value ${data.comparatives.vsTwelveMonthAverage !== null && data.comparatives.vsTwelveMonthAverage > 0 ? 'pos' : data.comparatives.vsTwelveMonthAverage !== null && data.comparatives.vsTwelveMonthAverage < 0 ? 'neg' : ''}">${formatPct(data.comparatives.vsTwelveMonthAverage)}</div>
          <div class="sub">media: ${formatEur(monthlyAvg, { decimals: 0 })}/mes</div>
        </div>
        <div class="kpi-mini">
          <div class="label">YTD ${primaryMonth.slice(0, 4)} (${data.comparatives.ytdMonths} meses)</div>
          <div class="value">${formatEur(data.comparatives.ytdTotal, { decimals: 0 })}</div>
          <div class="sub">media YTD: ${formatEur(ytdAvg, { decimals: 0 })}/mes</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3>
        Gasto real · 12 meses móviles
        <span class="total">Total: ${formatEur(monthlyTotal, { decimals: 0 })} · media ${formatEur(monthlyAvg, { decimals: 0 })}/mes</span>
      </h3>
      <div class="chart-wrap">${renderMonthlyChart(data.monthly)}</div>
      <div class="legend" style="margin-top: 8px">
        <span><span class="sw" style="background: #58a6ff"></span>meses anteriores</span>
        <span><span class="sw" style="background: #4cc38a"></span>mes actual</span>
        <span><span class="sw" style="background: #e3b341"></span>media 12m</span>
      </div>
    </section>

    <section class="grid-2">
      <div class="card">
        <h3>Gastos por categoría · ${escape(monthLabel)} <span class="total">${formatEur(data.primary.realSpending)}</span></h3>
        ${renderCategoryBars(data.primary.byCategory)}
      </div>
      <div class="card">
        <h3>Top ${data.primary.topExpenses.length} gastos · ${escape(monthLabel)}</h3>
        ${renderTopExpenses(data.primary.topExpenses)}
      </div>
    </section>

    <section class="grid-2-eq">
      <div class="card">
        <h3>Caja por banco <span class="total">${formatEur(data.netWorth.cash)}</span></h3>
        ${renderBalanceByBank(data.balanceByBank)}
      </div>
      <div class="card">
        <h3>Suscripciones recurrentes</h3>
        ${renderRecurring(data.recurring)}
      </div>
    </section>

    <section class="grid-2">
      <div class="card">
        <h3>Inversiones <span class="total">${formatEur(data.portfolio.total)} valor · ${formatEur(data.netWorth.investmentsPrincipal)} principal</span></h3>
        ${renderPortfolio(data.portfolio)}
      </div>
      <div class="card">
        <h3>Patrimonio histórico</h3>
        <div class="chart-wrap">${renderPatrimonyChart(data.patrimony, data.netWorth.total)}</div>
        ${renderPatrimonyTable(data.patrimony, data.netWorth.total)}
      </div>
    </section>

    ${renderAnnual(data.annual)}

    ${renderTrips(data.trips)}

    ${renderFreshness(data.freshness)}

    <div class="footnote">
      "Gasto real" excluye <em>transfers_self</em>, <em>investments</em>, <em>cash_withdrawal</em> e
      <em>income</em>. El bizum se cuenta solo si su neto del período es negativo. Las plataformas
      P2P sin valoración se contabilizan a principal en el patrimonio neto. Datos generados desde
      Google Sheets — pulsa <em>Actualizar</em> para recargar con valores frescos.
    </div>
  </div>
</body>
</html>`;
}
