import React, { useEffect, useState } from 'react';
import { categorize } from '../utils/categorize';

interface CashViewerProps {
  token: string | null;
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  bank: string;
  category: string;
  rowNumber: number;
}

const CashViewer: React.FC<CashViewerProps> = ({ token }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCash = async () => {
    if (!token) return;
    try {
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cash!A2:G?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Error fetching Cash sheet");
      const result = await response.json();
      
      const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
      const MS_PER_DAY = 86_400_000;
      
      const parsed = (result.values || []).map((row: any[], index: number) => {
        const rawDate = row[0];
        const dateStr = typeof rawDate === 'number' 
          ? new Date(EXCEL_EPOCH_UTC_MS + rawDate * MS_PER_DAY).toISOString().slice(0, 10)
          : String(rawDate || '');
        return {
          rowNumber: index + 2,
          date: dateStr,
          description: row[1] || '',
          amount: row[2] || 0,
          bank: row[5] || '',
          category: row[6] || 'uncategorized'
        };
      });
      // Sort by date descending
      parsed.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(parsed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCash();
  }, [token]);

  const handleCategorizeAll = async () => {
    if (!token) return;
    const toUpdate = transactions.filter(t => t.category === 'uncategorized' || !t.category);
    if (toUpdate.length === 0) {
      alert("No hay transacciones sin categorizar.");
      return;
    }
    
    // We will do a batchUpdate to set the new category for these rows
    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
    const data = toUpdate.map(t => {
      const newCat = categorize({ description: t.description, amount: t.amount });
      return {
        range: `Cash!G${t.rowNumber}`,
        values: [[newCat]]
      };
    });

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
      });
      if (!response.ok) throw new Error("Error updating categories");
      
      // Refresh
      setLoading(true);
      await fetchCash();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div>Cargando Cash...</div>;
  if (error) return <div style={{color: 'var(--danger)'}}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Gastos e Ingresos 💸</h3>
          <button onClick={handleCategorizeAll} style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '16px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}>
            Auto-Categorizar Todo
          </button>
        </div>
        
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px' }}>Fecha</th>
                <th style={{ padding: '8px' }}>Concepto</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Importe</th>
                <th style={{ padding: '8px' }}>Categoría</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.rowNumber} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{t.date}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: t.amount < 0 ? 'var(--text)' : 'var(--accent)' }}>
                    {t.amount.toFixed(2)} €
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      background: 'var(--border)',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {t.category}
                    </span>
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

export default CashViewer;
