import React, { useMemo } from 'react';

const COLORS = [
  'var(--primary)',
  '#8b5cf6',
  'var(--accent)',
  'var(--warning)',
  '#f472b6',
];

const RatioBar = ({ segments = [] }) => {
  const total = useMemo(
    () => segments.reduce((sum, seg) => sum + Math.max(0, seg.value || 0), 0),
    [segments]
  );

  if (total <= 0) {
    return (
      <div className="ratio-bar-container">
        <div className="ratio-bar-track">
          <div className="ratio-bar-empty">No data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ratio-bar-container">
      <div className="ratio-bar-track">
        {segments.map((seg, i) => {
          const pct = ((Math.max(0, seg.value || 0) / total) * 100);
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              className="ratio-bar-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
              title={`${seg.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="ratio-bar-labels">
        {segments.map((seg, i) => {
          const pct = ((Math.max(0, seg.value || 0) / total) * 100);
          if (pct <= 0) return null;
          return (
            <span key={seg.label} className="ratio-bar-label">
              <span
                className="ratio-bar-dot"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {seg.label} {pct.toFixed(0)}%
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default RatioBar;
