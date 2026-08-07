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

        // We assume a sheet named "Dashboard" exists with basic key-value data for now.
        // In a real scenario, you'd fetch specific ranges or use a generic range.
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dashboard!A1:B10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Error al acceder a Google Sheets. Verifica los permisos o el ID.");
        }

        const result = await response.json();
        const rows = result.values || [];
        
        // Very basic mapping for demonstration. You would parse your actual sheet structure here.
        const getValue = (key: string) => {
          const row = rows.find((r: any[]) => r[0] === key);
          return row ? row[1] : "0 €";
        };

        setData({
          patrimony: getValue("Patrimonio"),
          investments: getValue("Inversiones"),
          monthSpending: getValue("Gasto Mes"),
          topCategories: [
            { name: "Restaurantes", amount: getValue("Cat_Restaurantes"), count: 14 },
            { name: "Compra", amount: getValue("Cat_Compra"), count: 4 },
          ]
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
          <div className="kpi-trend pos">Actualizado hoy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">INVERSIONES</div>
          <div className="kpi-value">{data.investments}</div>
          <div className="kpi-trend pos">Actualizado hoy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">GASTO MES</div>
          <div className="kpi-value">{data.monthSpending}</div>
          <div className="kpi-trend neg">Actualizado hoy</div>
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
        <h3>Top Categorías 🍔</h3>
        {data.topCategories.map((cat, i) => (
          <div key={i} className="list-item">
            <div>
              <div style={{ fontWeight: 600 }}>{cat.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.count} transacciones</div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{cat.amount}</div>
          </div>
        ))}
      </div>
      
    </div>
  );
}

export default Dashboard;
