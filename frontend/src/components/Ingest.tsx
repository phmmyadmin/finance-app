import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

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
        setParsedData(results.data.slice(0, 5)); // Just preview the first 5
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        onClick={() => document.getElementById('file-upload')?.click()}
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

      {file && (
        <div className="card">
          <h3>Vista Previa ({file.name})</h3>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {parsedData.length > 0 && Object.keys(parsedData[0]).map(key => (
                    <th key={key} style={{ padding: '8px' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} style={{ padding: '8px', color: 'var(--text-muted)' }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button style={{
            marginTop: '20px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%'
          }}>
            Ingerir Datos
          </button>
        </div>
      )}
    </div>
  );
}

export default Ingest;
