import React from 'react';

interface BootstrapLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const BootstrapLabel: React.FC<BootstrapLabelProps> = ({
  children,
  className = '',
  ...props
}) => (
  <label className={`form-label ${className}`} {...props}>
    {children}
  </label>
);