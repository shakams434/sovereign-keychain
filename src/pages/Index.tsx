import React, { useState, useEffect } from 'react';
// SSI Wallet Main Component - Build v1.1
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletCard, WalletHeader, WalletSection } from '@/components/ui/wallet-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { StorageService } from '@/lib/storage';
import { CryptoService } from '@/lib/crypto';
import { DIDResolver } from '@/lib/did-resolver';
import { 
  Shield, 
  Plus, 
  Copy, 
  Download, 
  Upload, 
  Eye, 
  EyeOff,
  Key,
  Wallet,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentDID, setCurrentDID] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDID, setShowCreateDID] = useState(false);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      const initialized = await StorageService.isWalletInitialized();
      setWalletInitialized(initialized);
    } catch (error) {
      console.error('Error checking wallet status:', error);
    }
  };

  const unlockWallet = async () => {
    if (!masterPassword) {
      toast({
        title: "Error",
        description: "Please enter your master password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      StorageService.setMasterPassword(masterPassword);
      
      // Try to get a DID to verify password
      const dids = await StorageService.getAllDIDs();
      if (dids.length > 0) {
        const firstDID = await StorageService.getDID(dids[0].did);
        if (firstDID) {
          setCurrentDID(firstDID);
        }
      }
      
      setIsUnlocked(true);
      toast({
        title: "Wallet Unlocked",
        description: "Welcome back to your SSI Wallet",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Unlock Failed",
        description: "Invalid password or corrupted data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewDID = async () => {
    if (!isUnlocked) return;

    setIsLoading(true);
    try {
      const { did, privateKey, publicKey, address } = CryptoService.generateDID();
      
      await StorageService.storeDID(did, privateKey, publicKey, address, {
        name: 'Primary Identity',
        created: new Date().toISOString()
      });

      setCurrentDID({ did, privateKey, publicKey, address });
      setShowCreateDID(false);
      
      toast({
        title: "DID Created",
        description: `Your new DID: ${did}`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create new DID",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWallet = async () => {
    if (!masterPassword) {
      toast({
        title: "Error",
        description: "Please set a master password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      StorageService.setMasterPassword(masterPassword);
      
      // Create first DID
      const { did, privateKey, publicKey, address } = CryptoService.generateDID();
      await StorageService.storeDID(did, privateKey, publicKey, address, {
        name: 'Primary Identity',
        created: new Date().toISOString()
      });

      setCurrentDID({ did, privateKey, publicKey, address });
      setWalletInitialized(true);
      setIsUnlocked(true);
      
      toast({
        title: "Wallet Initialized",
        description: "Your SSI Wallet has been created successfully!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize wallet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
      variant: "default"
    });
  };

  const exportDID = async () => {
    if (!currentDID) return;

    try {
      const exportData = {
        did: currentDID.did,
        privateKey: currentDID.privateKey,
        publicKey: currentDID.publicKey,
        address: currentDID.address,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `did-${currentDID.address.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "DID Exported",
        description: "DID exported successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export DID",
        variant: "destructive"
      });
    }
  };

  if (!walletInitialized) {
    return (
      <WalletLayout>
        <div className="container mx-auto p-6 max-w-md">
          <WalletCard variant="glass" className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 glow-primary">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Welcome to SSI Wallet</h1>
              <p className="text-muted-foreground">
                Initialize your Self-Sovereign Identity Wallet
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Master Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong master password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={initializeWallet} 
                disabled={isLoading || !masterPassword}
                className="w-full"
              >
                {isLoading ? "Initializing..." : "Initialize Wallet"}
              </Button>
            </div>
          </WalletCard>
        </div>
      </WalletLayout>
    );
  }

  if (!isUnlocked) {
    return (
      <WalletLayout>
        <div className="container mx-auto p-6 max-w-md">
          <WalletCard variant="glass" className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 glow-primary">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Unlock Wallet</h1>
              <p className="text-muted-foreground">
                Enter your master password to access your wallet
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Master Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your master password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && unlockWallet()}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={unlockWallet} 
                disabled={isLoading || !masterPassword}
                className="w-full"
              >
                {isLoading ? "Unlocking..." : "Unlock Wallet"}
              </Button>
            </div>
          </WalletCard>
        </div>
      </WalletLayout>
    );
  }

  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          
          <div className="lg:col-span-3 space-y-6">
            <WalletHeader 
              title="Digital Identity"
              subtitle="Manage your decentralized identifier (DID)"
              action={
                <Dialog open={showCreateDID} onOpenChange={setShowCreateDID}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New DID
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New DID</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This will create a new decentralized identifier using the did:ethr method.
                      </p>
                      <Button onClick={createNewDID} disabled={isLoading} className="w-full">
                        {isLoading ? "Creating..." : "Create DID"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              }
            />

            {currentDID ? (
              <WalletSection title="Current Identity" description="Your active decentralized identifier">
                <WalletCard>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-wallet-success/10">
                          <CheckCircle2 className="h-5 w-5 text-wallet-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Primary Identity</h3>
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={exportDID}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          DID
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                            {currentDID.did}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(currentDID.did, 'DID')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Ethereum Address
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                            {currentDID.address}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(currentDID.address, 'Address')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Public Key
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                            {currentDID.publicKey}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(currentDID.publicKey, 'Public Key')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </WalletCard>
              </WalletSection>
            ) : (
              <WalletSection title="No Identity Found" description="Create your first DID to get started">
                <WalletCard variant="subtle" className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No DID Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any decentralized identifiers yet. Create one to get started.
                  </p>
                  <Button onClick={() => setShowCreateDID(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First DID
                  </Button>
                </WalletCard>
              </WalletSection>
            )}

            <WalletSection title="Quick Actions" description="Common identity operations">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Manage Keys</h4>
                      <p className="text-xs text-muted-foreground">View and export keys</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Import DID</h4>
                      <p className="text-xs text-muted-foreground">Import from file</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Backup</h4>
                      <p className="text-xs text-muted-foreground">Export identity</p>
                    </div>
                  </div>
                </Card>
              </div>
            </WalletSection>
          </div>
        </div>
      </div>
    </WalletLayout>
  );
};

export default Index;