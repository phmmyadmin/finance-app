import React, { useEffect, useState } from 'react';

interface DashboardProps {
  token: string | null;
}

interface PatrimonyData {
  year: number;
  value: number;
}

interface DashboardData {
  patrimony: string;
  investments: string;
  monthSpending: string;
  topCategories: { name: string; amount: string; count: number }[];
  patrimonyHistory: PatrimonyData[];
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
        const ranges = ['General!A:Z', 'Patrimony!A2:D', 'Cash!A2:G', 'Valuations!A2:C', ...platformSheets.map(p => `'${p}'!A2:I`)];
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
        
        // 1. Patrimony from General
        let totalPatrimony = 0;
        const generalRows = valueRanges.find((r: any) => r.range.includes('General'))?.values || [];
        console.log("General rows:", generalRows);
        
        let foundVal = undefined;
        for (let i = 0; i < generalRows.length; i++) {
          const row = generalRows[i];
          const idx = row.findIndex((c: any) => String(c).toLowerCase().includes('current patrimony'));
          if (idx !== -1) {
            console.log(`Found Current Patrimony at row ${i}, col ${idx}`);
            // Check right
            if (idx + 1 < row.length && row[idx + 1] !== '' && row[idx + 1] != null) {
               foundVal = row[idx + 1];
               console.log("Value found at right (idx+1):", foundVal);
            } 
            // Check right+1
            else if (idx + 2 < row.length && row[idx + 2] !== '' && row[idx + 2] != null) {
               foundVal = row[idx + 2];
               console.log("Value found at right (idx+2):", foundVal);
            } 
            // Check below
            else if (i + 1 < generalRows.length && generalRows[i + 1][idx] !== '' && generalRows[i + 1][idx] != null) {
               foundVal = generalRows[i + 1][idx];
               console.log("Value found below:", foundVal);
            }
            break;
          }
        }

        if (foundVal !== undefined) {
          totalPatrimony = typeof foundVal === 'number' ? foundVal : parseFloat(String(foundVal).replace(/[^0-9.-]+/g, ''));
        }

        // Patrimony History
        const patrimonyRows = valueRanges.find((r: any) => r.range.includes('Patrimony'))?.values || [];
        const patrimonyHistory: PatrimonyData[] = patrimonyRows.map((r: any[]) => ({
          year: Number(r[0]),
          value: Number(r[1])
        })).filter((h: PatrimonyData) => !isNaN(h.year) && !isNaN(h.value));

        const currentYear = new Date().getFullYear();
        const existingCurrent = patrimonyHistory.find(h => h.year === currentYear);
        if (existingCurrent) {
          existingCurrent.value = totalPatrimony || existingCurrent.value;
        } else if (totalPatrimony > 0) {
          patrimonyHistory.push({ year: currentYear, value: totalPatrimony });
        }

        // 2. Cash (Gasto del mes)
        const cashRows = valueRanges.find((r: any) => r.range.includes('Cash'))?.values || [];
        let monthSpending = 0;
        const categoryMap = new Map<string, { amount: number, count: number }>();
        
        const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
        const MS_PER_DAY = 86_400_000;
        const now = new Date();
        const currentMonth = now.getMonth();

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
          topCategories,
          patrimonyHistory
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

  const maxPatrimony = Math.max(...data.patrimonyHistory.map(h => h.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Scrollable KPIs */}
      <div className="kpi-scroll-container">
        <div className="kpi-card">
          <div className="kpi-label">PATRIMONIO</div>
          <div className="kpi-value">{data.patrimony}</div>
          <div className="kpi-trend pos">Actual</div>
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
        <h3>Histórico de Patrimonio 📈</h3>
        <svg viewBox="0 0 600 240" preserveAspectRatio="none" style={{ width: '100%', height: 'auto', marginTop: '16px' }}>
          <g stroke="var(--border)" strokeWidth="1">
            <line x1="0" y1="50" x2="600" y2="50" />
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="150" x2="600" y2="150" />
          </g>
          {data.patrimonyHistory.map((h, i) => {
            const numBars = data.patrimonyHistory.length;
            const barWidth = Math.min(40, 500 / numBars);
            const spacing = (600 - (numBars * barWidth)) / (numBars + 1);
            const x = spacing + i * (barWidth + spacing);
            const height = (h.value / maxPatrimony) * 160;
            const y = 200 - height;
            
            return (
              <g key={h.year}>
                <rect x={x} y={y} width={barWidth} height={height} fill="var(--accent)" rx="4" />
                <text x={x + barWidth / 2} y="220" fill="var(--text-muted)" fontSize="12" textAnchor="middle">{h.year}</text>
                <text x={x + barWidth / 2} y={y - 10} fill="var(--text)" fontSize="10" textAnchor="middle">
                  {(h.value / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}
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
