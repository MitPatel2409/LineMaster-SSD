import React, { useEffect, useRef, useState } from 'react';
import './index.css';
import Dashboard from './components/Dashboard';
import ResultsPanel from './components/ResultsPanel';
import { ASSUMPTION_DEFAULTS } from './constants/assumptions';

const API_URL = import.meta.env.PROD 
  ? '/api/simulate' 
  : 'http://localhost:5000/api/simulate';
const REQUEST_TIMEOUT_MS = 12000;

function App() {
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastParams, setLastParams] = useState(null);

  // 'input' | 'results'
  const [activePage, setActivePage] = useState('input');
  const [assumptions, setAssumptions] = useState(() => ({ ...ASSUMPTION_DEFAULTS }));
  const requestControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }
    };
  }, []);

  const runSimulation = async (params) => {
    const requestPayload = {
      ...params,
      assumptions,
    };

    setLoading(true);
    setError(null);
    setLastParams(requestPayload);
    setActivePage('results');

    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.message || payload?.error || `Simulation failed with status ${response.status}.`;
        throw new Error(message);
      }

      setSimulationResult(payload);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out after 12 seconds. Check backend status and try again.');
      } else if (err instanceof TypeError) {
        setError('Unable to reach backend at http://localhost:5000. Start backend/app.py and retry.');
      } else {
        setError(err.message || 'Simulation failed. Please retry.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastParams) {
      runSimulation(lastParams);
    }
  };

  const handleReset = () => {
    setSimulationResult(null);
    setError(null);
    setActivePage('input');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo-mark" aria-hidden="true"></div>
        <div className="app-header-content">
          <h1 className="app-title">
            LineMaster<span>SSD</span>
          </h1>
          <p className="app-subtitle">Simulation-driven shift planning for Sub Same Day operations</p>
        </div>
      </header>

      <main className="main-content-flow">
        {activePage === 'input' && (
          <div className="centered-form-container">
            <Dashboard
              onSimulate={runSimulation}
              loading={loading}
              onReset={handleReset}
              assumptions={assumptions}
              onSaveAssumptions={setAssumptions}
              onResetAssumptions={() => setAssumptions({ ...ASSUMPTION_DEFAULTS })}
            />
          </div>
        )}

        {activePage === 'results' && (
          <div className="centered-results-container">
            <ResultsPanel
              result={simulationResult}
              error={error}
              loading={loading}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
