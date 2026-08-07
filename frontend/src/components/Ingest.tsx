import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { categorize } from '../utils/categorize';

const Ingest: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data); // Store all parsed rows, don't slice!
      }
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);

  const handleIngest = async () => {
    if (!parsedData.length || !file) return;
    setIsIngesting(true);

    try {
      const token = localStorage.getItem('google_token');
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      if (!token || !spreadsheetId) throw new Error("Missing auth or spreadsheet ID");

      const isTradeRepublic = 'counterparty_name' in parsedData[0];
      const isRevolut = 'Completed Date' in parsedData[0] || 'Type' in parsedData[0];
      
      const values: any[] = [];
      let bankName = 'Unknown';

      // 1. Fetch current row count to know where to insert formulas
      const colAResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cash!A2:A?valueRenderOption=UNFORMATTED_VALUE`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!colAResponse.ok) throw new Error("Could not fetch Cash!A2:A to calculate row index");
      const colAData = await colAResponse.json();
      const startRow = 2 + (colAData.values?.length || 0);

      parsedData.forEach((row: any, i: number) => {
        let dateStr = '';
        let description = '';
        let amount = 0;
        
        if (isTradeRepublic) {
          bankName = 'TRADE_REPUBLIC';
          dateStr = String(row['date'] || '').trim();
          description = String(row['name'] || row['description'] || '').trim();
          amount = parseFloat(row['amount']);
        } else if (isRevolut) {
          bankName = 'REVOLUT';
          dateStr = String(row['Completed Date'] || row['Started Date'] || '').trim().split(' ')[0];
          description = String(row['Description'] || '').trim();
          amount = parseFloat(row['Amount']);
        } else {
          bankName = 'OTHER';
          dateStr = new Date().toISOString().slice(0, 10);
          description = JSON.stringify(row);
          amount = 0;
        }

        if (dateStr && !isNaN(amount)) {
          const category = categorize({ description, amount });
          const r = startRow + values.length; // Current row number in Excel
          values.push([
            dateStr,
            description,
            amount,
            `=TODAY()-A${r}`,
            `=SUM(C$2:C${r})`,
            bankName,
            category
          ]);
        }
      });

      if (values.length === 0) throw new Error("No valid rows to ingest");

      const endRow = startRow + values.length - 1;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cash!A${startRow}:G${endRow}?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to update rows");
      }

      setIngestSuccess(true);
      setParsedData([]);
      setFile(null);
      
    } catch (err: any) {
      alert("Error ingiriendo datos: " + err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {ingestSuccess && (
        <div style={{ padding: '16px', background: 'var(--accent)', color: 'white', borderRadius: '8px', textAlign: 'center' }}>
          ¡Datos ingeridos correctamente a tu hoja Cash!
        </div>
      )}
      <div 
        className={`card ${dragActive ? 'drag-active' : ''}`}
        style={{ 
          border: dragActive ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          textAlign: 'center',
          padding: '40px 20px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          setIngestSuccess(false);
          document.getElementById('file-upload')?.click();
        }}
      >
        <input 
          id="file-upload" 
          type="file" 
          accept=".csv" 
          style={{ display: 'none' }} 
          onChange={handleChange}
        />
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
        <h3>Sube tu extracto</h3>
        <p style={{ color: 'var(--text-muted)' }}>Arrastra aquí un archivo de tu banco (BBVA, Sabadell, Revolut, Trade Republic) o haz clic para seleccionar.</p>
      </div>

      {file && parsedData.length > 0 && (
        <div className="card">
          <h3>Vista Previa ({file.name})</h3>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {Object.keys(parsedData[0]).map(key => (
                    <th key={key} style={{ padding: '8px' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} style={{ padding: '8px', color: 'var(--text-muted)' }}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            onClick={handleIngest}
            disabled={isIngesting}
            style={{
            marginTop: '20px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isIngesting ? 'not-allowed' : 'pointer',
            opacity: isIngesting ? 0.7 : 1,
            width: '100%'
          }}>
            {isIngesting ? 'Ingiriendo...' : 'Ingerir Datos'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Ingest;
