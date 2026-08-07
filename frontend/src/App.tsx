import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingest' | 'chat'>('dashboard');

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      // In a real app, you'd store this securely or exchange it
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
          <div className="emoji-icon" style={{ fontSize: '48px' }}>💸</div>
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
    <>
      <div className="container">
        <header style={{ marginBottom: '24px' }}>
          <h1>
            {activeTab === 'dashboard' && 'Resumen 📊'}
            {activeTab === 'ingest' && 'Ingesta 📥'}
            {activeTab === 'chat' && 'Asistente 💬'}
          </h1>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard />
        )}

        {activeTab === 'ingest' && (
          <div className="card">
            <h2>Subir Extractos</h2>
            <p>Aquí irá la subida de CSV para BBVA, Sabadell y Revolut.</p>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-bubble ai">¡Hola! Soy tu asistente financiero. ¿Qué necesitas?</div>
            <div className="chat-bubble user">¿Cuánto gasté en restaurantes?</div>
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input type="text" className="chat-input" placeholder="Pregunta algo..." />
            <button className="chat-send">↑</button>
          </div>
        </div>
      )}

      <nav className="bottom-bar">
        <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <span className="tab-icon">📊</span>
          Dashboard
        </button>
        <button className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`} onClick={() => setActiveTab('ingest')}>
          <span className="tab-icon">📥</span>
          Ingesta
        </button>
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <span className="tab-icon">💬</span>
          Asistente
        </button>
      </nav>
    </>
  );
}

export default App;
