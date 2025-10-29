import React, { useState } from 'react';

interface BootstrapTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface BootstrapTabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface BootstrapTabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface BootstrapTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContextType {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

export const BootstrapTabs: React.FC<BootstrapTabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const contextValue: TabsContextType = {
    activeTab: value,
    onTabChange: handleValueChange
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const BootstrapTabsList: React.FC<BootstrapTabsListProps> = ({
  children,
  className = ''
}) => (
  <ul className={`nav nav-tabs ${className}`} role="tablist">
    {children}
  </ul>
);

export const BootstrapTabsTrigger: React.FC<BootstrapTabsTriggerProps> = ({
  value,
  children,
  className = ''
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.activeTab === value;

  return (
    <li className="nav-item" role="presentation">
      <button
        className={`nav-link ${isActive ? 'active' : ''} ${className}`}
        type="button"
        role="tab"
        onClick={() => context?.onTabChange?.(value)}
      >
        {children}
      </button>
    </li>
  );
};

export const BootstrapTabsContent: React.FC<BootstrapTabsContentProps> = ({
  value,
  children,
  className = ''
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.activeTab === value;

  if (!isActive) return null;

  return (
    <div className={`tab-pane fade ${isActive ? 'show active' : ''} ${className}`}>
      {children}
    </div>
  );
};