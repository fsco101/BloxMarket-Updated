import React from 'react';

interface BootstrapAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: React.ReactNode;
}

export const BootstrapAvatar: React.FC<BootstrapAvatarProps> = ({
  src,
  alt,
  size = 'md',
  className = '',
  children
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className={`rounded-circle overflow-hidden bg-secondary d-flex align-items-center justify-content-center ${sizeClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-100 h-100 object-fit-cover"
        />
      ) : (
        <span className="text-white fw-bold">
          {children}
        </span>
      )}
    </div>
  );
};