import React from 'react';

const MetricCard = ({ icon, label, value, unit, status }) => {
  return (
    <div className={`metric-card ${status ? `metric-card-${status}` : ''}`}>
      <div className="metric-card-icon">{icon}</div>
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value">
          {value}
          {unit && <span className="metric-card-unit">{unit}</span>}
        </span>
      </div>
    </div>
  );
};

export default MetricCard;
