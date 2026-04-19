import React, { useMemo, useState, useCallback } from 'react';
import { Play, Package, Users, Settings2, Box, Info, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import StepIndicator from './StepIndicator';
import PresetSelector from './PresetSelector';
import RatioBar from './RatioBar';
import AdvancedControls from './AdvancedControls';

const DEFAULT_FORM_DATA = {
  totalBoxes: 1500,
  totalJiffies: 3000,
  excellent: 2,
  good: 3,
  bad: 1,
  aisles: 10,
  ratioBoxOV: 1,
  ratioBoxBig: 10,
  ratioBoxMed: 25,
  ratioJiffySB: 1,
  ratioJiffyJif: 5,
};

const FIELD_RULES = {
  totalBoxes: { min: 0, max: 100000 },
  totalJiffies: { min: 0, max: 100000 },
  excellent: { min: 0, max: 100 },
  good: { min: 0, max: 100 },
  bad: { min: 0, max: 100 },
  aisles: { min: 1, max: 200 },
  ratioBoxOV: { min: 0, max: 1000 },
  ratioBoxBig: { min: 0, max: 1000 },
  ratioBoxMed: { min: 0, max: 1000 },
  ratioJiffySB: { min: 0, max: 1000 },
  ratioJiffyJif: { min: 0, max: 1000 },
};

const STEP_FIELDS = {
  1: ['totalBoxes', 'totalJiffies'],
  2: ['ratioBoxOV', 'ratioBoxBig', 'ratioBoxMed', 'ratioJiffySB', 'ratioJiffyJif'],
  3: ['excellent', 'good', 'bad', 'aisles'],
};

const STAFFING_FIELD_HINTS = {
  excellent: 'Strong performers over 400/hr',
  good: 'Consistent 300-400/hr performers',
  bad: 'Developing performers below 300/hr',
};

const toNumericValue = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const Dashboard = ({ onSimulate, loading, onReset, assumptions, onSaveAssumptions, onResetAssumptions }) => {
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_DATA }));
  const [formErrors, setFormErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activePresetId, setActivePresetId] = useState('standard');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totalStowers = useMemo(
    () =>
      (toNumericValue(formData.excellent) ?? 0) +
      (toNumericValue(formData.good) ?? 0) +
      (toNumericValue(formData.bad) ?? 0),
    [formData.excellent, formData.good, formData.bad]
  );

  const estimatedThroughput = useMemo(() => {
    const e = toNumericValue(formData.excellent) ?? 0;
    const g = toNumericValue(formData.good) ?? 0;
    const b = toNumericValue(formData.bad) ?? 0;
    return Math.round(e * 450 + g * 325 + b * 250);
  }, [formData.excellent, formData.good, formData.bad]);

  const totalVolume = useMemo(
    () => (toNumericValue(formData.totalBoxes) ?? 0) + (toNumericValue(formData.totalJiffies) ?? 0),
    [formData.totalBoxes, formData.totalJiffies]
  );

  const boxMixSegments = useMemo(
    () => [
      { label: 'Oversize', value: toNumericValue(formData.ratioBoxOV) ?? 0 },
      { label: 'Big', value: toNumericValue(formData.ratioBoxBig) ?? 0 },
      { label: 'Medium', value: toNumericValue(formData.ratioBoxMed) ?? 0 },
    ],
    [formData.ratioBoxOV, formData.ratioBoxBig, formData.ratioBoxMed]
  );

  const jiffyMixSegments = useMemo(
    () => [
      { label: 'Small Box', value: toNumericValue(formData.ratioJiffySB) ?? 0 },
      { label: 'Jiffy', value: toNumericValue(formData.ratioJiffyJif) ?? 0 },
    ],
    [formData.ratioJiffySB, formData.ratioJiffyJif]
  );

  const clearErrorForField = useCallback((fieldName) => {
    setFormErrors((prevErrors) => {
      const nextErrors = { ...prevErrors };
      delete nextErrors[fieldName];
      delete nextErrors.__volume;
      delete nextErrors.__staffing;
      delete nextErrors.__ratiosBox;
      delete nextErrors.__ratiosJiffy;
      return nextErrors;
    });
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value === '' ? '' : value,
    }));
    setActivePresetId('custom');
    clearErrorForField(name);
  }, [clearErrorForField]);

  const handlePresetSelect = useCallback((preset) => {
    setFormData({ ...preset.values });
    setActivePresetId(preset.id);
    setFormErrors({});
  }, []);

  const validateStepFields = useCallback((stepNumber) => {
    const errors = {};
    const fields = STEP_FIELDS[stepNumber];
    const parsedValues = {};

    fields.forEach((fieldName) => {
      const rule = FIELD_RULES[fieldName];
      const value = toNumericValue(formData[fieldName]);
      if (value === null) {
        errors[fieldName] = 'Enter a valid number.';
        return;
      }
      if (value < rule.min || value > rule.max) {
        errors[fieldName] = `Use a value between ${rule.min} and ${rule.max}.`;
        return;
      }
      parsedValues[fieldName] = value;
    });

    // Cross-field validations per step
    if (stepNumber === 1) {
      if ((parsedValues.totalBoxes ?? 0) + (parsedValues.totalJiffies ?? 0) <= 0) {
        errors.__volume = 'Backlog volume cannot be zero. Add boxes or jiffies.';
      }
    }
    if (stepNumber === 2) {
      if ((parsedValues.ratioBoxOV ?? 0) + (parsedValues.ratioBoxBig ?? 0) + (parsedValues.ratioBoxMed ?? 0) <= 0) {
        errors.__ratiosBox = 'Box cart mix must be greater than zero.';
      }
      if ((parsedValues.ratioJiffySB ?? 0) + (parsedValues.ratioJiffyJif ?? 0) <= 0) {
        errors.__ratiosJiffy = 'Jiffy cart mix must be greater than zero.';
      }
    }
    if (stepNumber === 3) {
      if ((parsedValues.excellent ?? 0) + (parsedValues.good ?? 0) + (parsedValues.bad ?? 0) <= 0) {
        errors.__staffing = 'At least one stower is required.';
      }
    }

    return { errors, isValid: Object.keys(errors).length === 0, parsedValues };
  }, [formData]);

  const validateAllFields = useCallback(() => {
    const errors = {};
    const parsedValues = {};

    Object.entries(FIELD_RULES).forEach(([fieldName, rule]) => {
      const value = toNumericValue(formData[fieldName]);
      if (value === null) {
        errors[fieldName] = 'Enter a valid number.';
        return;
      }
      if (value < rule.min || value > rule.max) {
        errors[fieldName] = `Use a value between ${rule.min} and ${rule.max}.`;
        return;
      }
      parsedValues[fieldName] = value;
    });

    if ((parsedValues.totalBoxes ?? 0) + (parsedValues.totalJiffies ?? 0) <= 0) {
      errors.__volume = 'Backlog volume cannot be zero. Add boxes or jiffies.';
    }
    if ((parsedValues.excellent ?? 0) + (parsedValues.good ?? 0) + (parsedValues.bad ?? 0) <= 0) {
      errors.__staffing = 'At least one stower is required.';
    }
    if ((parsedValues.ratioBoxOV ?? 0) + (parsedValues.ratioBoxBig ?? 0) + (parsedValues.ratioBoxMed ?? 0) <= 0) {
      errors.__ratiosBox = 'Box cart mix must be greater than zero.';
    }
    if ((parsedValues.ratioJiffySB ?? 0) + (parsedValues.ratioJiffyJif ?? 0) <= 0) {
      errors.__ratiosJiffy = 'Jiffy cart mix must be greater than zero.';
    }

    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, parsedValues };
  }, [formData]);

  const handleNextStep = useCallback(() => {
    const { errors, isValid } = validateStepFields(currentStep);
    setFormErrors(errors);
    if (!isValid) return;

    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((s) => Math.min(s + 1, 3));
  }, [currentStep, validateStepFields]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleStepClick = useCallback((step) => {
    setCurrentStep(step);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const { isValid, parsedValues } = validateAllFields();
    if (!isValid) return;
    setCompletedSteps([1, 2, 3]);
    onSimulate(parsedValues);
  }, [validateAllFields, onSimulate]);

  const handleReset = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setFormErrors({});
    setCurrentStep(1);
    setCompletedSteps([]);
    setActivePresetId('standard');
    onReset();
  }, [onReset]);

  const fieldHasError = (fieldName) => Boolean(formErrors[fieldName]);

  return (
    <>
      <div className="glass-panel planner-panel">
        <div className="planner-header">
          <div className="planner-header-row">
            <h2 className="planner-title">
              <Settings2 size={20} color="var(--primary)" /> Shift Planner
            </h2>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setShowAdvanced(true)}
              title="Advanced Controls"
              aria-label="Open advanced controls"
            >
              <Settings2 size={18} />
            </button>
          </div>
          <p className="planner-subtitle">
            Configure your shift scenario and generate a waterspider action plan.
          </p>
        </div>

        <div className="wizard-presets-area">
          <PresetSelector activePresetId={activePresetId} onSelectPreset={handlePresetSelect} />
        </div>

        <div className="wizard-step-area">
          <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} completedSteps={completedSteps} />
        </div>

        <form onSubmit={handleSubmit} className="planner-form" noValidate>
          {/* Step 1: Volume */}
          <div className={`wizard-step-content ${currentStep === 1 ? 'wizard-step-visible' : ''}`}>
            <section className="planner-section">
              <h3 className="section-title">
                <Package size={16} /> Total Backlog Volume
              </h3>
              <p className="section-description">How many packages are expected for this shift?</p>
              <div className="field-grid two-column-grid">
                <div className="form-group">
                  <label htmlFor="totalBoxes">Total Boxes</label>
                  <input
                    id="totalBoxes"
                    type="number"
                    name="totalBoxes"
                    value={formData.totalBoxes}
                    onChange={handleChange}
                    className={`input-field ${fieldHasError('totalBoxes') ? 'input-error' : ''}`}
                    min="0"
                    max="100000"
                    step="1"
                    aria-invalid={fieldHasError('totalBoxes')}
                  />
                  {fieldHasError('totalBoxes') && (
                    <p className="field-error">{formErrors.totalBoxes}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="totalJiffies">Total Jiffies</label>
                  <input
                    id="totalJiffies"
                    type="number"
                    name="totalJiffies"
                    value={formData.totalJiffies}
                    onChange={handleChange}
                    className={`input-field ${fieldHasError('totalJiffies') ? 'input-error' : ''}`}
                    min="0"
                    max="100000"
                    step="1"
                    aria-invalid={fieldHasError('totalJiffies')}
                  />
                  {fieldHasError('totalJiffies') && (
                    <p className="field-error">{formErrors.totalJiffies}</p>
                  )}
                </div>
              </div>
              {formErrors.__volume && <p className="field-error section-error">{formErrors.__volume}</p>}

              {totalVolume > 0 && (
                <div className="volume-summary-pill">
                  <Package size={14} />
                  <span>Total volume: <strong>{totalVolume.toLocaleString()}</strong> packages</span>
                </div>
              )}
            </section>
          </div>

          {/* Step 2: Cart Mix */}
          <div className={`wizard-step-content ${currentStep === 2 ? 'wizard-step-visible' : ''}`}>
            <section className="planner-section">
              <h3 className="section-title">
                <Box size={16} /> Expected Cart Mix Ratios
              </h3>
              <p className="section-description">What's the expected distribution of package types in carts?</p>

              <div className="mix-card">
                <label className="mix-title">Box Carts (Oversize : Big : Medium)</label>
                <div className="field-grid three-column-grid">
                  <div className="form-group tight-group">
                    <label htmlFor="ratioBoxOV">Oversize</label>
                    <input
                      id="ratioBoxOV"
                      type="number"
                      name="ratioBoxOV"
                      value={formData.ratioBoxOV}
                      onChange={handleChange}
                      className={`input-field ${fieldHasError('ratioBoxOV') ? 'input-error' : ''}`}
                      min="0" max="1000" step="1"
                    />
                  </div>
                  <div className="form-group tight-group">
                    <label htmlFor="ratioBoxBig">Big</label>
                    <input
                      id="ratioBoxBig"
                      type="number"
                      name="ratioBoxBig"
                      value={formData.ratioBoxBig}
                      onChange={handleChange}
                      className={`input-field ${fieldHasError('ratioBoxBig') ? 'input-error' : ''}`}
                      min="0" max="1000" step="1"
                    />
                  </div>
                  <div className="form-group tight-group">
                    <label htmlFor="ratioBoxMed">Medium</label>
                    <input
                      id="ratioBoxMed"
                      type="number"
                      name="ratioBoxMed"
                      value={formData.ratioBoxMed}
                      onChange={handleChange}
                      className={`input-field ${fieldHasError('ratioBoxMed') ? 'input-error' : ''}`}
                      min="0" max="1000" step="1"
                    />
                  </div>
                </div>
                <RatioBar segments={boxMixSegments} />
              </div>

              <div className="mix-card">
                <label className="mix-title">Jiffy Carts (Small Box : Jiffy)</label>
                <div className="field-grid two-column-grid">
                  <div className="form-group tight-group">
                    <label htmlFor="ratioJiffySB">Small Box</label>
                    <input
                      id="ratioJiffySB"
                      type="number"
                      name="ratioJiffySB"
                      value={formData.ratioJiffySB}
                      onChange={handleChange}
                      className={`input-field ${fieldHasError('ratioJiffySB') ? 'input-error' : ''}`}
                      min="0" max="1000" step="1"
                    />
                  </div>
                  <div className="form-group tight-group">
                    <label htmlFor="ratioJiffyJif">Jiffy</label>
                    <input
                      id="ratioJiffyJif"
                      type="number"
                      name="ratioJiffyJif"
                      value={formData.ratioJiffyJif}
                      onChange={handleChange}
                      className={`input-field ${fieldHasError('ratioJiffyJif') ? 'input-error' : ''}`}
                      min="0" max="1000" step="1"
                    />
                  </div>
                </div>
                <RatioBar segments={jiffyMixSegments} />
              </div>

              {formErrors.__ratiosBox && <p className="field-error section-error">{formErrors.__ratiosBox}</p>}
              {formErrors.__ratiosJiffy && <p className="field-error section-error">{formErrors.__ratiosJiffy}</p>}
            </section>
          </div>

          {/* Step 3: Staffing */}
          <div className={`wizard-step-content ${currentStep === 3 ? 'wizard-step-visible' : ''}`}>
            <section className="planner-section">
              <h3 className="section-title">
                <Users size={16} /> Available Stowers and Space
              </h3>
              <p className="section-description">How many stowers are available and how much aisle space is open?</p>

              <div className="staffing-list">
                <div className="staff-row staff-row-excellent">
                  <div>
                    <label htmlFor="excellent">Excellent (&gt;400/hr)</label>
                    <p className="hint-text">{STAFFING_FIELD_HINTS.excellent}</p>
                  </div>
                  <input
                    id="excellent"
                    type="number"
                    name="excellent"
                    value={formData.excellent}
                    onChange={handleChange}
                    className={`input-field ${fieldHasError('excellent') ? 'input-error' : ''}`}
                    min="0" max="100" step="1"
                  />
                </div>

                <div className="staff-row staff-row-good">
                  <div>
                    <label htmlFor="good">Good (300-400/hr)</label>
                    <p className="hint-text">{STAFFING_FIELD_HINTS.good}</p>
                  </div>
                  <input
                    id="good"
                    type="number"
                    name="good"
                    value={formData.good}
                    onChange={handleChange}
                    className={`input-field ${fieldHasError('good') ? 'input-error' : ''}`}
                    min="0" max="100" step="1"
                  />
                </div>

                <div className="staff-row staff-row-low">
                  <div>
                    <label htmlFor="bad">Low (&lt;300/hr)</label>
                    <p className="hint-text">{STAFFING_FIELD_HINTS.bad}</p>
                  </div>
                  <input
                    id="bad"
                    type="number"
                    name="bad"
                    value={formData.bad}
                    onChange={handleChange}
                    className={`input-field ${fieldHasError('bad') ? 'input-error' : ''}`}
                    min="0" max="100" step="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="aisles">Active Aisles</label>
                <input
                  id="aisles"
                  type="number"
                  name="aisles"
                  value={formData.aisles}
                  onChange={handleChange}
                  className={`input-field ${fieldHasError('aisles') ? 'input-error' : ''}`}
                  min="1" max="200" step="1"
                />
                <p className="hint-text hint-with-icon">
                  <Info size={12} /> Assumes around 18 functional bags per open aisle.
                </p>
              </div>

              <div className="staffing-stats-row">
                <div className="staffing-summary">
                  <Users size={14} />
                  Total stowers: <strong>{totalStowers}</strong>
                </div>
                {estimatedThroughput > 0 && (
                  <div className="staffing-summary staffing-throughput">
                    ~<strong>{estimatedThroughput.toLocaleString()}</strong> pkgs/hr capacity
                  </div>
                )}
              </div>
              {formErrors.__staffing && <p className="field-error section-error">{formErrors.__staffing}</p>}
            </section>
          </div>

          {/* Navigation */}
          <div className="wizard-nav">
            {currentStep > 1 && (
              <button type="button" className="btn-secondary" onClick={handlePrevStep}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {currentStep === 1 && <div />}

            {currentStep < 3 ? (
              <button type="button" className="btn-primary wizard-next-btn" onClick={handleNextStep}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <div className="wizard-final-actions">
                <button type="button" className="btn-ghost" onClick={handleReset} disabled={loading}>
                  <RotateCcw size={16} /> Reset
                </button>
                <button type="submit" className={`btn-primary ${loading ? 'is-loading' : ''}`} disabled={loading} aria-busy={loading}>
                  <Play size={18} />
                  {loading ? 'Running...' : 'Generate Plan'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Advanced Controls Drawer */}
      {showAdvanced && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAdvanced(false)} />
          <div className="drawer-container">
            <AdvancedControls
              assumptions={assumptions}
              onSaveAssumptions={onSaveAssumptions}
              onResetAssumptions={onResetAssumptions}
              onClose={() => setShowAdvanced(false)}
            />
          </div>
        </>
      )}
    </>
  );
};

export default Dashboard;
