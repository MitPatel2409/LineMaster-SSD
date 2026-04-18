import React, { useState } from 'react';
import './index.css';
import Dashboard from './components/Dashboard';
import ResultsPanel from './components/ResultsPanel';

function App() {
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Simulation failed');
      }
      
      const data = await response.json();
      setSimulationResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary-glow)' }}></div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>LineMaster<span style={{ color: 'var(--primary)' }}>SSD</span></h1>
      </header>
      
      <main className="dashboard-grid">
        <Dashboard onSimulate={runSimulation} loading={loading} />
        <ResultsPanel result={simulationResult} error={error} />
      </main>
    </div>
  );
}

export default App;
