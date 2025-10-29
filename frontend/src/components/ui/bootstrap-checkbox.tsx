import React from 'react';

interface BootstrapCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  id?: string;
  className?: string;
}

export const BootstrapCheckbox: React.FC<BootstrapCheckboxProps> = ({
  label,
  id,
  className = '',
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`form-check ${className}`}>
      <input
        className="form-check-input"
        type="checkbox"
        id={checkboxId}
        {...props}
      />
      {label && (
        <label className="form-check-label" htmlFor={checkboxId}>
          {label}
        </label>
      )}
    </div>
  );
};