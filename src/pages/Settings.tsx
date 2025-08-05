import React from 'react';
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletHeader } from '@/components/ui/wallet-layout';

const Settings = () => {
  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          <div className="lg:col-span-3">
            <WalletHeader 
              title="Wallet Settings"
              subtitle="Configure your SSI wallet preferences"
            />
            <div className="glass-card p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground">Wallet configuration and backup options</p>
            </div>
          </div>
        </div>
      </div>
    </WalletLayout>
  );
};

export default Settings;