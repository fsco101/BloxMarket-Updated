import React from 'react';

interface BootstrapScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  height?: string | number;
}

export const BootstrapScrollArea: React.FC<BootstrapScrollAreaProps> = ({
  children,
  className = '',
  height = 'auto'
}) => {
  const style = typeof height === 'number' ? { height: `${height}px` } : { height };

  return (
    <div
      className={`overflow-auto ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};