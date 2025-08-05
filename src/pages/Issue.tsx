import React from 'react';
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletHeader } from '@/components/ui/wallet-layout';

const Issue = () => {
  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          <div className="lg:col-span-3">
            <WalletHeader 
              title="Issue Credentials"
              subtitle="Create and issue verifiable credentials"
            />
            <div className="glass-card p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground">Credential issuance interface</p>
            </div>
          </div>
        </div>
      </div>
    </WalletLayout>
  );
};

export default Issue;