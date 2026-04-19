import React from 'react';

const ResultsTabs = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="results-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={`results-tab ${activeTab === tab.id ? 'results-tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ResultsTabs;
