import React, { useState } from 'react';
import { Play } from 'lucide-react';

const Dashboard = ({ onSimulate, loading }) => {
  const [formData, setFormData] = useState({
    totalBoxes: 1500,
    totalJiffies: 3000,
    excellent: 2,
    good: 3,
    bad: 1,
    aisles: 10
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: Number(e.target.value) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSimulate(formData);
  };

  return (
    <div className="glass-panel">
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: 600 }}>Shift Parameters</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volume Input</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Total Boxes</label>
              <input type="number" name="totalBoxes" value={formData.totalBoxes} onChange={handleChange} className="input-field" min="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Total Jiffies</label>
              <input type="number" name="totalJiffies" value={formData.totalJiffies} onChange={handleChange} className="input-field" min="0" />
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stower Headcount</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem' }}>Excellent (450/hr)</label>
              <input type="number" name="excellent" value={formData.excellent} onChange={handleChange} className="input-field" min="0" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem' }}>Good (325/hr)</label>
              <input type="number" name="good" value={formData.good} onChange={handleChange} className="input-field" min="0" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem' }}>Bad (250/hr)</label>
              <input type="number" name="bad" value={formData.bad} onChange={handleChange} className="input-field" min="0" />
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Active Aisles</label>
          <input type="number" name="aisles" value={formData.aisles} onChange={handleChange} className="input-field" min="1" />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Assumes 18 bags (~200 capacity) per aisle.</p>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Simulating...' : <><Play size={18} /> Run Optimization</>}
        </button>
      </form>
    </div>
  );
};

export default Dashboard;
