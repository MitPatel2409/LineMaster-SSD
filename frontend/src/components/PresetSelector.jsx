import React from 'react';
import { SCENARIO_PRESETS } from '../constants/presets';

const PresetSelector = ({ activePresetId, onSelectPreset }) => {
  return (
    <div className="preset-selector">
      <span className="preset-label">Quick Start</span>
      <div className="preset-chips">
        {SCENARIO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-chip ${activePresetId === preset.id ? 'preset-chip-active' : ''}`}
            onClick={() => onSelectPreset(preset)}
            title={preset.description}
          >
            <span className="preset-chip-icon">{preset.icon}</span>
            <span className="preset-chip-text">{preset.label}</span>
          </button>
        ))}
        {activePresetId === 'custom' && (
          <span className="preset-chip preset-chip-custom">
            ✏️ Custom
          </span>
        )}
      </div>
    </div>
  );
};

export default PresetSelector;
