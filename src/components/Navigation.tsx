import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Wallet, 
  CreditCard, 
  ArrowRightLeft, 
  FileText, 
  Settings,
  Shield
} from 'lucide-react';

const navigation = [
  {
    name: 'Identity',
    href: '/',
    icon: Shield,
    description: 'Manage your DID'
  },
  {
    name: 'Credentials', 
    href: '/credentials',
    icon: CreditCard,
    description: 'View & manage VCs'
  },
  {
    name: 'Exchange',
    href: '/exchange', 
    icon: ArrowRightLeft,
    description: 'OpenID4VCI/VP flows'
  },
  {
    name: 'Issue',
    href: '/issue',
    icon: FileText,
    description: 'Issue new credentials'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Wallet configuration'
  }
];

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="glass-card p-4 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 glow-primary">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            SSI Wallet
          </h1>
          <p className="text-xs text-muted-foreground">
            Self-Sovereign Identity
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth group",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 glow-primary" 
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};