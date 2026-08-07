import React, { useEffect, useState } from 'react';

interface InvestmentsViewerProps {
  token: string | null;
}

interface Valuation {
  date: string;
  platform: string;
  value: number;
}

interface Position {
  platform: string;
  name: string;
  amount: number;
}

const InvestmentsViewer: React.FC<InvestmentsViewerProps> = ({ token }) => {
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const platformSheets = ['MyInvestor', 'Urbanitae', 'Civislend', 'Revolut X', 'Esketit', 'Mintos'];

  const [newValPlatform, setNewValPlatform] = useState(platformSheets[0]);
  const [newValAmount, setNewValAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      const ranges = ['Valuations!A2:C', ...platformSheets.map(p => `'${p}'!A2:I`)];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Error fetching Investments data");
      const result = await response.json();
      const valueRanges = result.valueRanges || [];

      const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
      const MS_PER_DAY = 86_400_000;

      // Parse Valuations
      const valRows = valueRanges.find((r: any) => r.range.includes('Valuations'))?.values || [];
      const parsedVals = valRows.map((row: any[]) => {
        const rawDate = row[0];
        const dateStr = typeof rawDate === 'number'
          ? new Date(EXCEL_EPOCH_UTC_MS + rawDate * MS_PER_DAY).toISOString().slice(0, 10)
          : String(rawDate || '');
        return {
          date: dateStr,
          platform: String(row[1] || ''),
          value: row[2] || 0
        };
      });
      parsedVals.sort((a: Valuation, b: Valuation) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setValuations(parsedVals);

      // Parse Positions
      const parsedPos: Position[] = [];
      platformSheets.forEach(platform => {
        const safePlatformName = platform.replace(/\s+/g, '');
        const platformRange = valueRanges.find((r: any) => r.range.includes(platform) || r.range.includes(safePlatformName))?.values || [];
        platformRange.forEach((row: any[]) => {
          if (row[0] && typeof row[3] === 'number') {
            parsedPos.push({
              platform,
              name: String(row[0]),
              amount: row[3]
            });
          }
        });
      });
      // Sort positions by amount descending
      parsedPos.sort((a, b) => b.amount - a.amount);
      setPositions(parsedPos);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValPlatform || !newValAmount || !token) return;
    setIsAdding(true);
    
    try {
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Valuations!A:C:append?valueInputOption=USER_ENTERED`;
      const dateStr = new Date().toISOString().slice(0, 10);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [[dateStr, newValPlatform, parseFloat(newValAmount)]]
        })
      });

      if (!response.ok) throw new Error("Error adding valuation");
      
      setNewValAmount('');
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) return <div>Cargando Inversiones...</div>;
  if (error) return <div style={{color: 'var(--danger)'}}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <h3>Añadir Valoración 📈</h3>
        <form onSubmit={handleAddValuation} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <select
            value={newValPlatform}
            onChange={e => setNewValPlatform(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            required
          >
            {platformSheets.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Valor actual (€)" 
            value={newValAmount} 
            onChange={e => setNewValAmount(e.target.value)}
            style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            required 
          />
          <button type="submit" disabled={isAdding} style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: isAdding ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}>
            {isAdding ? '...' : 'Añadir'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Historial de Valoraciones</h3>
        <div style={{ overflowX: 'auto', marginTop: '16px', maxHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px' }}>Fecha</th>
                <th style={{ padding: '8px' }}>Plataforma</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{v.date}</td>
                  <td style={{ padding: '8px' }}>{v.platform}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                    {v.value.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Inversiones Activas (Posiciones)</h3>
        <div style={{ overflowX: 'auto', marginTop: '16px', maxHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px' }}>Plataforma</th>
                <th style={{ padding: '8px' }}>Activo</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Principal</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{p.platform}</td>
                  <td style={{ padding: '8px' }}>{p.name}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                    {p.amount.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvestmentsViewer;
