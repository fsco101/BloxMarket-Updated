import React from 'react';

interface BootstrapBadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  pill?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const BootstrapBadge: React.FC<BootstrapBadgeProps> = ({
  variant = 'primary',
  pill = false,
  className = '',
  children
}) => {
  const baseClasses = 'badge';
  const variantClass = `bg-${variant}`;
  const pillClass = pill ? 'rounded-pill' : '';

  const combinedClasses = [
    baseClasses,
    variantClass,
    pillClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  );
};