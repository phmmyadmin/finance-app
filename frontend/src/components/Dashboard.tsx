import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Scrollable KPIs */}
      <div className="kpi-scroll-container">
        <div className="kpi-card">
          <div className="kpi-label">PATRIMONIO</div>
          <div className="kpi-value">145.230 €</div>
          <div className="kpi-trend pos">↑ 2.4% este mes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">INVERSIONES</div>
          <div className="kpi-value">12.050 €</div>
          <div className="kpi-trend pos">↑ 1.1% este mes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">GASTO MES</div>
          <div className="kpi-value">1.120 €</div>
          <div className="kpi-trend neg">↓ 300€ vs mes pasado</div>
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
          {/* Dummy bars */}
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
        <div className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>Restaurantes</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>14 transacciones</div>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>320 €</div>
        </div>
        <div className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>Compra</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>4 transacciones</div>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>215 €</div>
        </div>
        <div className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>Transporte</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>6 transacciones</div>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>85 €</div>
        </div>
      </div>
      
    </div>
  );
}

export default Dashboard;
