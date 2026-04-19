import React, { useMemo, useState } from 'react';
import { X, RotateCcw, Save, SlidersHorizontal, Search, ChevronDown, ChevronRight } from 'lucide-react';
import {
  ASSUMPTION_DEFAULTS,
  ASSUMPTION_FIELDS,
  ASSUMPTION_GROUPS,
  ASSUMPTION_RULES,
} from '../constants/assumptions';

const buildDraftValues = (assumptions) =>
  ASSUMPTION_FIELDS.reduce((accumulator, field) => {
    const sourceValue = assumptions[field.key] ?? ASSUMPTION_DEFAULTS[field.key];
    accumulator[field.key] = String(sourceValue);
    return accumulator;
  }, {});

const toNumericValue = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const AdvancedControls = ({ assumptions, onSaveAssumptions, onResetAssumptions, onClose }) => {
  const [draftValues, setDraftValues] = useState(() => buildDraftValues(assumptions));
  const [errors, setErrors] = useState({});
  const [statusText, setStatusText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const hasUnsavedChanges = useMemo(
    () =>
      ASSUMPTION_FIELDS.some((field) => {
        const draftNumericValue = toNumericValue(draftValues[field.key]);
        if (draftNumericValue === null) {
          return true;
        }
        return Math.abs(draftNumericValue - assumptions[field.key]) > 1e-9;
      }),
    [assumptions, draftValues]
  );

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return ASSUMPTION_FIELDS;
    const query = searchQuery.toLowerCase();
    return ASSUMPTION_FIELDS.filter(
      (field) =>
        field.label.toLowerCase().includes(query) ||
        field.description.toLowerCase().includes(query) ||
        field.group.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const visibleGroups = useMemo(() => {
    const groups = new Set(filteredFields.map((f) => f.group));
    return ASSUMPTION_GROUPS.filter((g) => groups.has(g));
  }, [filteredFields]);

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const clearErrorForField = (fieldKey) => {
    setErrors((previousErrors) => {
      if (!previousErrors[fieldKey] && !previousErrors.__global) {
        return previousErrors;
      }
      const nextErrors = { ...previousErrors };
      delete nextErrors[fieldKey];
      delete nextErrors.__global;
      return nextErrors;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraftValues((previousValues) => ({
      ...previousValues,
      [name]: value === '' ? '' : value,
    }));
    clearErrorForField(name);
    if (statusText) {
      setStatusText('');
    }
  };

  const validateDraft = () => {
    const parsedValues = {};
    const nextErrors = {};

    ASSUMPTION_FIELDS.forEach((field) => {
      const parsedValue = toNumericValue(draftValues[field.key]);
      if (parsedValue === null) {
        nextErrors[field.key] = 'Enter a valid number.';
        return;
      }

      const rules = ASSUMPTION_RULES[field.key];
      if (parsedValue < rules.min || parsedValue > rules.max) {
        nextErrors[field.key] = `Use a value between ${rules.min} and ${rules.max}.`;
        return;
      }

      parsedValues[field.key] = parsedValue;
    });

    if (
      parsedValues.shiftMinutes !== undefined &&
      parsedValues.maxSimulationMinutes !== undefined &&
      parsedValues.maxSimulationMinutes < parsedValues.shiftMinutes
    ) {
      nextErrors.maxSimulationMinutes = 'Simulation cutoff must be ≥ shift minutes.';
    }

    if (
      parsedValues.basePenaltyThreshold !== undefined &&
      parsedValues.minPenaltyThreshold !== undefined &&
      parsedValues.minPenaltyThreshold > parsedValues.basePenaltyThreshold
    ) {
      nextErrors.minPenaltyThreshold = 'Min threshold cannot exceed base threshold.';
    }

    if (
      parsedValues.searchStepLarge !== undefined &&
      parsedValues.searchCap !== undefined &&
      parsedValues.searchStepLarge > parsedValues.searchCap
    ) {
      nextErrors.searchStepLarge = 'Large step cannot exceed search cap.';
    }

    return {
      parsedValues,
      errors: nextErrors,
      isValid: Object.keys(nextErrors).length === 0,
    };
  };

  const handleApply = (event) => {
    event.preventDefault();
    const validationResult = validateDraft();
    setErrors(validationResult.errors);
    if (!validationResult.isValid) {
      return;
    }
    onSaveAssumptions(validationResult.parsedValues);
    setStatusText('Controls applied. Your next simulation will use these settings.');
  };

  const handleResetDefaults = () => {
    onResetAssumptions();
    setDraftValues(buildDraftValues(ASSUMPTION_DEFAULTS));
    setErrors({});
    setStatusText('Reset to defaults.');
  };

  // Auto-expand groups when searching
  const isGroupExpanded = (groupName) => {
    if (searchQuery.trim()) return true;
    return expandedGroups.has(groupName);
  };

  return (
    <div className="advanced-drawer-inner">
      <div className="drawer-header">
        <h2 className="drawer-title">
          <SlidersHorizontal size={18} color="var(--primary)" /> Advanced Controls
        </h2>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Close drawer">
          <X size={20} />
        </button>
      </div>

      <div className="drawer-search">
        <Search size={16} className="drawer-search-icon" />
        <input
          type="text"
          placeholder="Search parameters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field drawer-search-input"
        />
      </div>

      <form id="advanced-controls-form" className="drawer-form" onSubmit={handleApply} noValidate>
        {visibleGroups.map((groupName) => {
          const groupFields = filteredFields.filter((field) => field.group === groupName);
          const expanded = isGroupExpanded(groupName);

          return (
            <section className="drawer-group" key={groupName}>
              <button
                type="button"
                className="drawer-group-header"
                onClick={() => toggleGroup(groupName)}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>{groupName}</span>
                <span className="drawer-group-count">{groupFields.length}</span>
              </button>

              {expanded && (
                <div className="drawer-group-fields">
                  {groupFields.map((field) => (
                    <div className="form-group" key={field.key}>
                      <label htmlFor={field.key}>{field.label}</label>
                      <input
                        id={field.key}
                        name={field.key}
                        type="number"
                        value={draftValues[field.key]}
                        onChange={handleChange}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className={`input-field ${errors[field.key] ? 'input-error' : ''}`}
                        aria-invalid={Boolean(errors[field.key])}
                      />
                      {errors[field.key] ? (
                        <p className="field-error">{errors[field.key]}</p>
                      ) : (
                        <p className="hint-text">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {statusText && <p className="drawer-status">{statusText}</p>}
        {errors.__global && <p className="field-error section-error">{errors.__global}</p>}
      </form>

      <div className="drawer-footer">
        <button type="button" className="btn-ghost" onClick={handleResetDefaults}>
          <RotateCcw size={14} /> Reset Defaults
        </button>
        <button
          type="submit"
          className="btn-primary"
          form="advanced-controls-form"
          disabled={!hasUnsavedChanges}
        >
          <Save size={14} /> Apply
        </button>
      </div>
    </div>
  );
};

export default AdvancedControls;
