import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Volume' },
  { number: 2, label: 'Cart Mix' },
  { number: 3, label: 'Staffing' },
];

const StepIndicator = ({ currentStep, onStepClick, completedSteps = [] }) => {
  return (
    <div className="step-indicator">
      {STEPS.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = completedSteps.includes(step.number);
        const isClickable = isCompleted || step.number <= currentStep;

        return (
          <React.Fragment key={step.number}>
            {index > 0 && (
              <div className={`step-connector ${isCompleted || isActive ? 'step-connector-active' : ''}`} />
            )}
            <button
              type="button"
              className={`step-node ${isActive ? 'step-node-active' : ''} ${isCompleted ? 'step-node-completed' : ''}`}
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${step.number}: ${step.label}`}
            >
              <span className="step-circle">
                {isCompleted ? <Check size={14} strokeWidth={3} /> : step.number}
              </span>
              <span className="step-label">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
