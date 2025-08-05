import React from 'react';
import { cn } from '@/lib/utils';

interface WalletLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const WalletLayout = ({ children, className }: WalletLayoutProps) => {
  return (
    <div className={cn(
      "min-h-screen bg-background relative overflow-hidden",
      className
    )}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

interface WalletCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'subtle';
}

export const WalletCard = ({ children, className, variant = 'default' }: WalletCardProps) => {
  const variants = {
    default: "glass-card",
    glass: "glass-card glow-primary",
    subtle: "glass-subtle"
  };

  return (
    <div className={cn(
      "rounded-xl p-6 transition-smooth hover:scale-[1.02]",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};

interface WalletHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const WalletHeader = ({ title, subtitle, action, className }: WalletHeaderProps) => {
  return (
    <div className={cn("flex items-center justify-between mb-8", className)}>
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};

interface WalletSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const WalletSection = ({ title, description, children, className }: WalletSectionProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
};