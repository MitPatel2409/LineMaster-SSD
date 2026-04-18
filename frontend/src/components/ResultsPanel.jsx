import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const ResultsPanel = ({ result, error }) => {
  if (error) {
    return (
      <div className="glass-panel" style={{ border: '1px solid #ef4444' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Simulation Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', color: 'var(--text-muted)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <p>Enter parameters and run simulation to view optimizations.</p>
      </div>
    );
  }

  const { T1, T2, max_wip, unstowed, rem_b, rem_j, history } = result;
  
  // Custom tooltip to show throttle status
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', fontSize: '0.875rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Minute {label}</p>
          {payload.map(p => (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.name}: {p.value.toFixed(1)}{p.dataKey === 'utilization' ? '%' : ''}
            </p>
          ))}
          {data.throttled && (
            <p style={{ color: '#ef4444', marginTop: '8px', fontWeight: 600 }}>Belt Throttled (WIP Limit)</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="metric-card">
          <div className="metric-value">{max_wip.toFixed(0)}</div>
          <div className="metric-label">Max WIP Level</div>
        </div>
        <div className="metric-card">
          <div className={`metric-value ${(rem_b + rem_j) > 0 ? 'warning' : ''}`}>{(rem_b + rem_j)}</div>
          <div className="metric-label">Remaining Uninducted Vol</div>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px'}}>Boxes: {rem_b} • Jiffies: {rem_j}</p>
        </div>
        <div className="metric-card">
          <div className={`metric-value ${unstowed > 0 ? 'warning' : ''}`}>{unstowed}</div>
          <div className="metric-label">Unstowed Vol at 75m</div>
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: 600 }}>Optimal Induct Recipe (Timeline)</h2>
        <div style={{ marginLeft: '12px' }}>
          {T1 > 0 && (
            <div className="timeline-event">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Minute 0 - {T1 - 1}</h3>
              <p style={{ color: 'var(--text-muted)' }}>Line 1: Box • Line 2: Box</p>
            </div>
          )}
          {T2 > T1 && (
            <div className="timeline-event">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Minute {T1} - {T2 - 1}</h3>
              <p style={{ color: 'var(--text-muted)' }}>Line 1: Box • Line 2: Jiffy</p>
            </div>
          )}
          {T2 < 75 && (
            <div className="timeline-event">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Minute {T2} - 74</h3>
              <p style={{ color: 'var(--text-muted)' }}>Line 1: Jiffy • Line 2: Jiffy</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ paddingBottom: '40px' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: 600 }}>Simulation Physics</h2>
        
        {/* Chart 1: Bag Utilization */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>System Bag Utilization (%)</h3>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="minute" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="utilization" stroke="#10b981" fillOpacity={1} fill="url(#colorUtil)" name="Utilization" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: WIP Levels */}
        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Work In Progress (WIP) on Floor</h3>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="minute" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="wip" stroke="#3b82f6" strokeWidth={3} dot={false} name="Floor WIP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResultsPanel;
