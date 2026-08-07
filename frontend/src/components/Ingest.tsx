import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

  const processFile = async (file: File) => {
    setFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'xls' || ext === 'xlsx') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
      setParsedData(jsonData);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data);
        }
      });
    }
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

  const [selectedBank, setSelectedBank] = useState<string>('AUTO');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);

  const handleIngest = async () => {
    if (!parsedData.length || !file) return;
    setIsIngesting(true);

    try {
      const token = localStorage.getItem('google_token');
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      if (!token || !spreadsheetId) throw new Error("Missing auth or spreadsheet ID");

      let isTradeRepublic = 'counterparty_name' in parsedData[0];
      let isRevolut = 'Completed Date' in parsedData[0] || 'Type' in parsedData[0] || 'Tipo' in parsedData[0];
      
      if (selectedBank !== 'AUTO') {
        isTradeRepublic = selectedBank === 'TRADE_REPUBLIC';
        isRevolut = selectedBank === 'REVOLUT';
      }

      let values: any[] = [];
      let bankName = 'Unknown';

      // 1. Fetch current rows to calculate index and deduplicate
      const cashResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cash!A2:C?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!cashResponse.ok) throw new Error("Could not fetch Cash data for deduplication");
      const cashData = await cashResponse.json();
      
      const existingRows = cashData.values || [];
      const startRow = 2 + existingRows.length;
      
      // Build a set of existing transactions for deduplication
      const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
      const MS_PER_DAY = 86_400_000;
      const existingSet = new Set(existingRows.map((r: any[]) => {
        const dateNum = r[0];
        const desc = r[1] || '';
        const amt = r[2] || 0;
        let dateStr = '';
        if (typeof dateNum === 'number') {
          dateStr = new Date(EXCEL_EPOCH_UTC_MS + dateNum * MS_PER_DAY).toISOString().slice(0, 10);
        } else {
          dateStr = String(dateNum).trim(); // fallback
        }
        return `${dateStr}_${String(desc).trim()}_${amt}`;
      }));

      parsedData.forEach((row: any) => {
        let dateStr = '';
        let description = '';
        let amount = 0;
        
        // Helper to find keys despite broken encodings
        const getVal = (rowObj: any, matchers: string[]) => {
          const key = Object.keys(rowObj).find(k => matchers.some(m => k.toLowerCase().includes(m.toLowerCase())));
          return key ? String(rowObj[key]) : '';
        };

        if (isTradeRepublic) {
          bankName = 'Trade Republic';
          dateStr = String(row['date'] || '').trim();
          description = String(row['description'] || row['name'] || '').trim();
          amount = parseFloat(row['amount']);
        } else if (isRevolut) {
          bankName = 'Revolut';
          const dateRaw = getVal(row, ['completed date', 'started date', 'fecha de inicio', 'fecha de fin']);
          dateStr = dateRaw.trim().split(' ')[0];
          description = getVal(row, ['description', 'descrip']);
          amount = parseFloat(getVal(row, ['amount', 'importe']));
        } else {
          bankName = 'OTHER';
          dateStr = new Date().toISOString().slice(0, 10);
          description = JSON.stringify(row);
          amount = 0;
        }

        if (dateStr && !isNaN(amount)) {
          const dedupeKey = `${dateStr}_${description}_${amount}`;
          if (!existingSet.has(dedupeKey)) {
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
            existingSet.add(dedupeKey); // Prevent duplicates within the CSV itself
          }
        }
      });

      if (values.length === 0) {
        setIngestSuccess(true);
        setParsedData([]);
        setFile(null);
        alert("No hay transacciones nuevas para ingerir (todas son duplicadas).");
        return;
      }

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
          accept=".csv,.tsv,.xls,.xlsx" 
          style={{ display: 'none' }} 
          onChange={handleChange}
        />
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
        <h3>Sube tu extracto</h3>
        <p style={{ color: 'var(--text-muted)' }}>Arrastra aquí un archivo CSV, Excel (.xlsx, .xls) o TSV de tu banco, o haz clic para seleccionar.</p>
      </div>

      {file && parsedData.length > 0 && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Banco origen:</label>
            <select 
              value={selectedBank} 
              onChange={e => setSelectedBank(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginTop: '8px' }}
            >
              <option value="AUTO">Detectar automáticamente</option>
              <option value="REVOLUT">Revolut</option>
              <option value="TRADE_REPUBLIC">Trade Republic</option>
              <option value="BBVA">BBVA</option>
              <option value="SABADELL">Banco Sabadell</option>
            </select>
          </div>
          
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
