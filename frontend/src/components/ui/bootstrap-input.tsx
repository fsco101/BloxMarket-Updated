import React from 'react';

interface BootstrapInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: 'sm' | 'lg';
  noWrapper?: boolean;
}

export const BootstrapInput = React.forwardRef<HTMLInputElement, BootstrapInputProps>(({
  label,
  error,
  size,
  className = '',
  id,
  noWrapper = false,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const sizeClass = size ? `form-control-${size}` : '';
  const errorClass = error ? 'is-invalid' : '';

  const combinedClasses = [
    'form-control',
    sizeClass,
    errorClass,
    className
  ].filter(Boolean).join(' ');

  const inputElement = (
    <input
      ref={ref}
      id={inputId}
      className={combinedClasses}
      {...props}
    />
  );

  if (noWrapper) {
    return inputElement;
  }

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      {inputElement}
      {error && (
        <div className="invalid-feedback">
          {error}
        </div>
      )}
    </div>
  );
});