import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { LayoutDashboard, Wallet, TrendingUp, UploadCloud, MessageSquare, LogOut, Landmark } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Ingest from './components/Ingest';
import Chat from './components/Chat';
import CashViewer from './components/CashViewer';
import InvestmentsViewer from './components/InvestmentsViewer';

function App() {
  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('google_token');
    const expiresAt = localStorage.getItem('google_token_expires_at');
    if (savedToken && expiresAt && Date.now() < parseInt(expiresAt, 10)) {
      return savedToken;
    }
    // Token expired or not found
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_token_expires_at');
    return null;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cash' | 'investments' | 'ingest' | 'chat'>('dashboard');

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      const expiresIn = codeResponse.expires_in || 3599; // Default to 1 hour if not provided
      localStorage.setItem('google_token', codeResponse.access_token);
      localStorage.setItem('google_token_expires_at', (Date.now() + expiresIn * 1000).toString());
      setToken(codeResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error),
    // We request scopes for Google Sheets read/write
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  if (!token) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', paddingBottom: 0 }}>
        <div className="card" style={{ textAlign: 'center', width: '100%' }}>
          <Landmark size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
          <h1>Finance App</h1>
          <p style={{ marginBottom: '24px' }}>Inicia sesión para gestionar tu patrimonio y extractos directamente desde tu navegador.</p>
          <button 
            onClick={() => login()} 
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Entrar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '20px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>
          {activeTab === 'dashboard' && 'Resumen'}
          {activeTab === 'cash' && 'Gastos'}
          {activeTab === 'investments' && 'Inversiones'}
          {activeTab === 'ingest' && 'Ingesta'}
          {activeTab === 'chat' && 'Asistente'}
        </h1>
        <button 
          onClick={() => {
            localStorage.removeItem('google_token');
            setToken(null);
          }}
          style={{
            background: 'var(--bg-subtle)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <LogOut size={14} /> Salir
        </button>
      </header>

      <div className="tab-group">
        <button className={`tab-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={16} /> <span>Inicio</span>
        </button>
        <button className={`tab-item ${activeTab === 'cash' ? 'active' : ''}`} onClick={() => setActiveTab('cash')}>
          <Wallet size={16} /> <span>Cash</span>
        </button>
        <button className={`tab-item ${activeTab === 'investments' ? 'active' : ''}`} onClick={() => setActiveTab('investments')}>
          <TrendingUp size={16} /> <span>Inv</span>
        </button>
        <button className={`tab-item ${activeTab === 'ingest' ? 'active' : ''}`} onClick={() => setActiveTab('ingest')}>
          <UploadCloud size={16} /> <span>Sube</span>
        </button>
        <button className={`tab-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={16} /> <span>IA</span>
        </button>
      </div>

      {activeTab === 'dashboard' && <Dashboard token={token} />}
      {activeTab === 'cash' && <CashViewer token={token} />}
      {activeTab === 'investments' && <InvestmentsViewer token={token} />}
      {activeTab === 'ingest' && <Ingest />}
      {activeTab === 'chat' && <Chat />}
    </div>
  );
}

export default App;
