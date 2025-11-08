import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'solid' | 'premium';
  blur?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  opacity?: number;
}

export function CardContainer({ 
  children, 
  className, 
  variant = 'default',
  blur = 'xl',
  opacity = 0
}: CardContainerProps) {
  const baseStyles = "relative border rounded-2xl transition-all duration-300";
  
  const variantStyles = {
    default: `bg-black/${opacity} border-[#404448]`,
    glass: `bg-black/${opacity} backdrop-blur-${blur} border-[#404448]`,
    solid: `bg-black border-[#404448]`,
    premium: `bg-black/${opacity} backdrop-blur-${blur} border-[#00B2FF] shadow-2xl shadow-[#00B2FF]/30`
  };

  const blurStyles = blur !== 'none' ? `backdrop-blur-${blur}` : '';

  return (
    <div className={cn(
      baseStyles,
      variantStyles[variant],
      blurStyles,
      className
    )}>
      {children}
    </div>
  );
}

// Preset variants for common use cases
export function GlassCard({ children, className, ...props }: Omit<CardContainerProps, 'variant'>) {
  return (
    <CardContainer variant="glass" className={className} {...props}>
      {children}
    </CardContainer>
  );
}

export function SolidCard({ children, className, ...props }: Omit<CardContainerProps, 'variant'>) {
  return (
    <CardContainer variant="solid" className={className} {...props}>
      {children}
    </CardContainer>
  );
}

export function PremiumCard({ children, className, ...props }: Omit<CardContainerProps, 'variant'>) {
  return (
    <CardContainer variant="premium" className={className} {...props}>
      {children}
    </CardContainer>
  );
}