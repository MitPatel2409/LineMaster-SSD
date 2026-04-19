import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Package,
  Shuffle,
  Zap,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  BarChart3,
  ListChecks,
  Activity,
  Timer,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import ResultsTabs from './ResultsTabs';
import MetricCard from './MetricCard';

const FAILURE_REASON_COPY = {
  none: '',
  insufficient_capacity: 'Current staffing throughput cannot clear this volume inside the simulation window.',
  wip_safety_throttling: 'The floor repeatedly hit WIP safety limits, forcing belt pauses and slowing completion.',
  no_staffing: 'No active stowers were configured, so no work could be processed.',
};

const RESULT_TABS = [
  { id: 'summary', label: 'Summary', icon: <BarChart3 size={16} /> },
  { id: 'action', label: 'Action Plan', icon: <ListChecks size={16} /> },
  { id: 'telemetry', label: 'Telemetry', icon: <Activity size={16} /> },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">Minute {label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.value.toFixed(0)}
          {item.dataKey === 'utilization' ? '%' : ''}
        </p>
      ))}
      {data.throttled && (
        <p className="chart-tooltip-alert">
          <ShieldAlert size={14} /> Belt Paused (WIP safety cap)
        </p>
      )}
    </div>
  );
};

const ResultsPanel = ({ result, error, loading, onRetry, onReset }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="glass-panel state-panel" role="status" aria-live="polite">
        <div className="state-icon state-icon-spinner" aria-hidden="true"></div>
        <h3>Running Simulation...</h3>
        <p>Calculating phase transitions, WIP behavior, and completion forecast.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel state-panel error-panel" role="alert" aria-live="assertive">
        <div className="state-icon state-icon-error" aria-hidden="true">
          <AlertOctagon size={28} />
        </div>
        <h3>Simulation Error</h3>
        <p>{error}</p>
        <div className="state-actions">
          <button type="button" className="btn-secondary" onClick={onRetry}>
            <RefreshCw size={16} /> Retry
          </button>
          <button type="button" className="btn-ghost" onClick={onReset}>
            <RotateCcw size={16} /> Back to Planner
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="glass-panel state-panel" aria-live="polite">
        <div className="state-icon" aria-hidden="true">
          <Clock size={28} color="var(--primary)" />
        </div>
        <h3>Awaiting Parameters</h3>
        <p>Fill the planner form to generate a timed action plan with WIP and bag-utilization forecasts.</p>
      </div>
    );
  }

  const {
    T1,
    T2,
    ttc,
    max_wip,
    unstowed,
    penalty_threshold_used,
    history,
    status,
    failure_reason,
    guidance,
    throttle_minutes,
    recommended_extra_stowers,
    safe_wip_limit,
  } = result;

  const isFailed = status ? status === 'failed' : ttc >= 180;
  const hasHeavyOversize = penalty_threshold_used < 0.6;
  const hasHighWip = max_wip > safe_wip_limit;
  const customFailureText = FAILURE_REASON_COPY[failure_reason] || '';

  // Build action steps
  const actionSteps = [];
  if (T1 > 0) {
    actionSteps.push({
      key: 'phase-1',
      sortMin: 0,
      badgeClass: 'phase-badge phase-badge-primary',
      badgeIcon: <Package size={14} />,
      badgeText: 'Phase 1: Foundation',
      title: `Minute 0 → ${T1 - 1}`,
      detail: 'Assign BOX carts to both Line 1 and Line 2 to build bag structure first.',
    });
  }
  if (T2 > T1) {
    actionSteps.push({
      key: 'phase-2',
      sortMin: T1,
      badgeClass: 'phase-badge phase-badge-secondary',
      badgeIcon: <Shuffle size={14} />,
      badgeText: 'Phase 2: Blend',
      title: `Minute ${T1} → ${T2 - 1}`,
      detail: 'Keep BOX carts on Line 1 and switch Line 2 to JIFFY carts.',
    });
  }
  if (ttc > T2) {
    actionSteps.push({
      key: 'phase-3',
      sortMin: T2,
      badgeClass: 'phase-badge phase-badge-accent',
      badgeIcon: <Zap size={14} />,
      badgeText: 'Phase 3: Burndown',
      title: `Minute ${T2} → ${isFailed ? 'cutoff' : `Minute ${ttc}`}`,
      detail: 'Assign JIFFY carts to both lines and finish remaining volume without overfilling bags.',
    });
  }

  // Throttled blocks
  const throttledBlocks = [];
  let currentBlock = null;
  (history || []).forEach((entry) => {
    if (entry.throttled) {
      if (!currentBlock) {
        currentBlock = { start: entry.minute, end: entry.minute };
      } else {
        currentBlock.end = entry.minute;
      }
    } else {
      if (currentBlock) {
        throttledBlocks.push(currentBlock);
        currentBlock = null;
      }
    }
  });
  if (currentBlock) {
    throttledBlocks.push(currentBlock);
  }

  throttledBlocks.forEach((block, index) => {
    actionSteps.push({
      key: `belt-stop-${index}`,
      sortMin: block.start,
      badgeClass: 'phase-badge phase-badge-warning',
      badgeIcon: <ShieldAlert size={14} />,
      badgeText: `Belt Pause ${index + 1}`,
      title: `Minute ${block.start} → ${block.end}`,
      detail: `WIP cap hit! Belt paused for ${block.end - block.start + 1} min to clear floor space.`,
    });
  });

  actionSteps.sort((a, b) => a.sortMin - b.sortMin);

  const actionPlanText = actionSteps
    .map((step) => `${step.badgeText} | ${step.title} | ${step.detail}`)
    .join('\n');

  const handleCopyPlan = async () => {
    if (!actionPlanText) return;
    try {
      await navigator.clipboard.writeText(actionPlanText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="results-stack">
      {/* Hero Banner — Always visible */}
      <section className={`glass-panel result-hero ${isFailed ? 'result-hero-failed' : 'result-hero-success'}`}>
        <button type="button" className="result-hero-back" onClick={onReset}>
          <ArrowLeft size={16} /> Edit Inputs
        </button>
        <h2 className="result-eyebrow">{isFailed ? 'Simulation Failed' : 'Target Completion Time'}</h2>
        <div className="result-value" aria-live="polite">
          {isFailed ? <AlertOctagon size={48} /> : <CheckCircle2 size={48} />}
          <span>{isFailed ? '> 3 Hours' : `${ttc} Mins`}</span>
        </div>
        <p className="result-guidance">{guidance}</p>
        {isFailed && customFailureText && <p className="result-detail">{customFailureText}</p>}
      </section>

      {/* Tab Bar */}
      <ResultsTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={RESULT_TABS} />

      {/* Tab Content */}
      <div className="tab-content-area">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="tab-panel" role="tabpanel" id="tabpanel-summary">
            <div className="metrics-grid">
              <MetricCard
                icon={<Timer size={20} color="var(--primary)" />}
                label="Time to Complete"
                value={isFailed ? '>180' : ttc}
                unit="min"
                status={isFailed ? 'danger' : 'success'}
              />
              <MetricCard
                icon={<Gauge size={20} color="#8b5cf6" />}
                label="Peak WIP"
                value={max_wip.toFixed(0)}
                unit="pkgs"
                status={hasHighWip ? 'warning' : 'neutral'}
              />
              <MetricCard
                icon={<ShieldAlert size={20} color="var(--warning)" />}
                label="Belt Pauses"
                value={throttle_minutes}
                unit="min"
                status={throttle_minutes > 0 ? 'warning' : 'neutral'}
              />
              <MetricCard
                icon={<TrendingUp size={20} color="var(--accent)" />}
                label="Unstowed"
                value={unstowed}
                unit="pkgs"
                status={unstowed > 0 ? 'danger' : 'success'}
              />
            </div>

            <section className="alerts-section">
              <h3 className="section-label">
                <AlertTriangle size={18} color="var(--warning)" /> PA Operational Alerts
              </h3>
              <div className="alerts-grid">
                <article className="alert-card alert-card-info">
                  <h4>WIP Management</h4>
                  <p>
                    Predicted WIP peaks near <strong>{max_wip.toFixed(0)} packages</strong>.
                    {hasHighWip
                      ? ` Exceeds safety target of ${safe_wip_limit.toFixed(0)}, may pause belt.`
                      : ' Stays inside safety buffer.'}
                    {throttle_minutes > 0 ? ` Belt pauses: ${throttle_minutes} minute(s).` : ''}
                  </p>
                </article>

                <article className={`alert-card ${hasHeavyOversize ? 'alert-card-risk' : 'alert-card-neutral'}`}>
                  <h4>Oversize & Space Risk</h4>
                  <p>
                    {hasHeavyOversize
                      ? `Oversize-heavy mix lowers box efficiency past ${(penalty_threshold_used * 100).toFixed(0)}% utilization.`
                      : 'Space penalties stay manageable for this mix.'}
                  </p>
                </article>

                {unstowed > 0 && (
                  <article className="alert-card alert-card-warning">
                    <h4>Rolled Volume Risk</h4>
                    <p>
                      Unstowed volume: <strong>{unstowed}</strong> packages.
                      {recommended_extra_stowers > 0 && ` Add ~${recommended_extra_stowers} stower(s).`}
                    </p>
                  </article>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Action Plan Tab */}
        {activeTab === 'action' && (
          <div className="tab-panel" role="tabpanel" id="tabpanel-action">
            <div className="action-plan-header">
              <div>
                <h2>Waterspider Action Plan</h2>
                <p>Broadcast these chronological lane assignments to your team.</p>
              </div>
              <button type="button" className="btn-ghost btn-compact" onClick={handleCopyPlan}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="action-steps">
              {actionSteps.map((step) => (
                <article className="action-step" key={step.key}>
                  <div className={step.badgeClass}>
                    {step.badgeIcon}
                    {step.badgeText}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry Tab */}
        {activeTab === 'telemetry' && (
          <div className="tab-panel" role="tabpanel" id="tabpanel-telemetry">
            <div className="telemetry-grid">
              <div className="telemetry-block">
                <h3>System Bag Utilization (%)</h3>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="minute" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} minTickGap={16} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="utilization"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUtil)"
                        name="Bag Fill"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="telemetry-block">
                <h3>Work In Progress (Floor WIP)</h3>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="minute" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} minTickGap={16} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="wip"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={false}
                        name="Packages on Floor"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPanel;
