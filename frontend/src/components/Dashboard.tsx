import React, { useEffect, useState } from 'react';

interface DashboardProps {
  token: string | null;
}

interface DashboardData {
  patrimony: string;
  investments: string;
  monthSpending: string;
  topCategories: { name: string; amount: string; count: number }[];
}

const Dashboard: React.FC<DashboardProps> = ({ token }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
        if (!spreadsheetId) {
          throw new Error("Missing VITE_SPREADSHEET_ID in .env");
        }

        const platformSheets = ['MyInvestor', 'Urbanitae', 'Civislend', 'Revolut X', 'Esketit', 'Mintos'];
        const ranges = ['Patrimony!A2:D', 'Cash!A2:G', 'Valuations!A2:C', ...platformSheets.map(p => `'${p}'!A2:I`)];
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          let errorMsg = "Error al obtener datos de Google Sheets.";
          try {
            const errorResult = await response.json();
            if (errorResult.error?.message) {
              errorMsg = `Google Sheets API Error: ${errorResult.error.message}`;
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const result = await response.json();
        const valueRanges = result.valueRanges || [];
        
        // 1. Patrimony
        let totalPatrimony = 0;
        const patrimonyRows = valueRanges.find((r: any) => r.range.includes('Patrimony'))?.values || [];
        if (patrimonyRows.length > 0) {
          const lastRow = patrimonyRows[patrimonyRows.length - 1];
          totalPatrimony = lastRow[1] || 0;
        }

        // 2. Cash (Gasto del mes)
        const cashRows = valueRanges.find((r: any) => r.range.includes('Cash'))?.values || [];
        let monthSpending = 0;
        const categoryMap = new Map<string, { amount: number, count: number }>();
        
        const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
        const MS_PER_DAY = 86_400_000;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        cashRows.forEach((row: any[]) => {
          const [rawDate, , rawAmount, , , , rawCategory] = row;
          if (typeof rawDate === 'number' && typeof rawAmount === 'number' && rawAmount < 0) {
            const date = new Date(EXCEL_EPOCH_UTC_MS + rawDate * MS_PER_DAY);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              monthSpending += Math.abs(rawAmount);
              const cat = rawCategory || 'uncategorized';
              const current = categoryMap.get(cat) || { amount: 0, count: 0 };
              categoryMap.set(cat, { amount: current.amount + Math.abs(rawAmount), count: current.count + 1 });
            }
          }
        });

        const topCategories = Array.from(categoryMap.entries())
          .map(([name, data]) => ({ name, amount: data.amount, count: data.count }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
          .map(c => ({ ...c, amount: `${c.amount.toFixed(2)} €` }));

        // 3. Valuations & Positions (Inversiones)
        const valuationsRows = valueRanges.find((r: any) => r.range.includes('Valuations'))?.values || [];
        const latestValuationByPlatform = new Map<string, number>();
        const latestAtByPlatform = new Map<string, number>();

        valuationsRows.forEach((row: any[]) => {
          const [rawDate, platform, value] = row;
          if (typeof rawDate === 'number' && platform && typeof value === 'number') {
            const previous = latestAtByPlatform.get(platform);
            if (previous === undefined || rawDate > previous) {
              latestAtByPlatform.set(platform, rawDate);
              latestValuationByPlatform.set(platform, value);
            }
          }
        });

        const principalByPlatform = new Map<string, number>();
        platformSheets.forEach(platform => {
          const safePlatformName = platform.replace(/\s+/g, ''); // Handle Revolut X
          const platformRange = valueRanges.find((r: any) => r.range.includes(platform) || r.range.includes(safePlatformName))?.values || [];
          platformRange.forEach((row: any[]) => {
            const principal = row[3];
            if (typeof principal === 'number') {
              principalByPlatform.set(platform, (principalByPlatform.get(platform) ?? 0) + principal);
            }
          });
        });

        const knownPlatforms = new Set([...principalByPlatform.keys(), ...latestValuationByPlatform.keys()]);
        let totalInvestments = 0;
        knownPlatforms.forEach(platform => {
          const valuation = latestValuationByPlatform.get(platform);
          if (valuation !== undefined) {
            totalInvestments += valuation;
          } else {
            totalInvestments += principalByPlatform.get(platform) ?? 0;
          }
        });

        const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

        setData({
          patrimony: formatter.format(totalPatrimony),
          investments: formatter.format(totalInvestments),
          monthSpending: formatter.format(monthSpending),
          topCategories
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) return <div>Cargando datos desde Sheets...</div>;
  if (error) return <div style={{color: 'var(--danger)'}}>{error}</div>;
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Scrollable KPIs */}
      <div className="kpi-scroll-container">
        <div className="kpi-card">
          <div className="kpi-label">PATRIMONIO</div>
          <div className="kpi-value">{data.patrimony}</div>
          <div className="kpi-trend pos">Último registro</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">INVERSIONES</div>
          <div className="kpi-value">{data.investments}</div>
          <div className="kpi-trend pos">Basado en Valuations</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">GASTO MES</div>
          <div className="kpi-value">{data.monthSpending}</div>
          <div className="kpi-trend neg">Mes actual</div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card">
        <h3>Evolución de Gasto 📉</h3>
        <svg viewBox="0 0 600 220" preserveAspectRatio="none" style={{ width: '100%', height: 'auto', marginTop: '16px' }}>
          <g stroke="var(--border)" strokeWidth="1">
            <line x1="0" y1="50" x2="600" y2="50" />
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="150" x2="600" y2="150" />
          </g>
          {/* Dummy bars for now until we have real series data */}
          <rect x="50" y="100" width="30" height="100" fill="var(--accent-soft)" rx="4" />
          <rect x="120" y="80" width="30" height="120" fill="var(--accent-soft)" rx="4" />
          <rect x="190" y="120" width="30" height="80" fill="var(--accent-soft)" rx="4" />
          <rect x="260" y="40" width="30" height="160" fill="var(--danger)" opacity="0.3" rx="4" />
          <rect x="330" y="90" width="30" height="110" fill="var(--accent-soft)" rx="4" />
          <rect x="400" y="130" width="30" height="70" fill="var(--accent-soft)" rx="4" />
          <rect x="470" y="60" width="30" height="140" fill="var(--accent)" rx="4" />
        </svg>
      </div>

      {/* Top Expenses List */}
      <div className="card">
        <h3>Top Categorías (Mes actual) 🍔</h3>
        {data.topCategories.length > 0 ? data.topCategories.map((cat, i) => (
          <div key={i} className="list-item">
            <div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.count} transacciones</div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{cat.amount}</div>
          </div>
        )) : (
          <div style={{ color: 'var(--text-muted)', marginTop: '10px' }}>No hay gastos registrados este mes.</div>
        )}
      </div>
      
    </div>
  );
}

export default Dashboard;
