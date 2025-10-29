import React from 'react';

interface BootstrapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
}

interface BootstrapDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface BootstrapDialogHeaderProps {
  children: React.ReactNode;
}

interface BootstrapDialogTitleProps {
  children: React.ReactNode;
}

export const BootstrapDialog: React.FC<BootstrapDialogProps> = ({
  open,
  onOpenChange,
  children,
  size = 'md'
}) => {
  if (!open) return null;

  const sizeClass = size !== 'md' ? `modal-${size}` : '';

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={() => onOpenChange(false)}
      ></div>
      <div
        className={`modal fade show d-block ${sizeClass}`}
        tabIndex={-1}
        role="dialog"
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export const BootstrapDialogContent: React.FC<BootstrapDialogContentProps> = ({
  children,
  className = ''
}) => (
  <div className={`modal-body ${className}`}>
    {children}
  </div>
);

export const BootstrapDialogHeader: React.FC<BootstrapDialogHeaderProps> = ({
  children
}) => (
  <div className="modal-header">
    {children}
    <button
      type="button"
      className="btn-close"
      data-bs-dismiss="modal"
      aria-label="Close"
    ></button>
  </div>
);

export const BootstrapDialogTitle: React.FC<BootstrapDialogTitleProps> = ({
  children
}) => (
  <h5 className="modal-title">{children}</h5>
);