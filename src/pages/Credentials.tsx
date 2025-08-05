import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletCard, WalletHeader, WalletSection } from '@/components/ui/wallet-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { StorageService, StoredCredential } from '@/lib/storage';
import { CredentialService } from '@/lib/credential-service';
import { 
  CreditCard, 
  Plus, 
  Download, 
  Upload, 
  Eye, 
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  AlertTriangle
} from 'lucide-react';

const Credentials = () => {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentialDetail, setShowCredentialDetail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const storedCredentials = await StorageService.getAllCredentials();
      setCredentials(storedCredentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast({
        title: "Error",
        description: "Failed to load credentials. Please unlock wallet first.",
        variant: "destructive"
      });
    }
  };

  const viewCredential = async (credential: StoredCredential) => {
    setIsLoading(true);
    try {
      const fullCredential = await StorageService.getCredential(credential.vcId);
      setSelectedCredential(fullCredential);
      setShowCredentialDetail(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load credential details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCredential = async (vcId: string) => {
    try {
      await StorageService.deleteCredential(vcId);
      await loadCredentials();
      toast({
        title: "Deleted",
        description: "Credential deleted successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete credential",
        variant: "destructive"
      });
    }
  };

  const exportCredential = async (credential: StoredCredential) => {
    try {
      const fullCredential = await StorageService.getCredential(credential.vcId);
      
      const blob = new Blob([JSON.stringify(fullCredential, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credential-${credential.type}-${credential.vcId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        description: "Credential exported successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export credential",
        variant: "destructive"
      });
    }
  };

  const exportAllCredentials = async () => {
    try {
      setIsLoading(true);
      const allCredentials = [];
      
      for (const cred of credentials) {
        const fullCredential = await StorageService.getCredential(cred.vcId);
        allCredentials.push(fullCredential);
      }

      const exportData = {
        credentials: allCredentials,
        exportedAt: new Date().toISOString(),
        count: allCredentials.length
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-credentials-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        description: `${allCredentials.length} credentials exported successfully`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string, expirationDate?: Date) => {
    const isExpired = expirationDate && new Date(expirationDate) < new Date();
    
    if (status === 'revoked') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (isExpired) {
      return <Clock className="h-4 w-4 text-wallet-warning" />;
    }
    if (status === 'active') {
      return <CheckCircle2 className="h-4 w-4 text-wallet-success" />;
    }
    return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string, expirationDate?: Date) => {
    const isExpired = expirationDate && new Date(expirationDate) < new Date();
    
    if (status === 'revoked') {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary" className="text-wallet-warning border-wallet-warning">Expired</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="outline" className="text-wallet-success border-wallet-success">Active</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          
          <div className="lg:col-span-3 space-y-6">
            <WalletHeader 
              title="Verifiable Credentials"
              subtitle="Manage your digital credentials and attestations"
              action={
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportAllCredentials}
                    disabled={credentials.length === 0 || isLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              }
            />

            <WalletSection 
              title="Your Credentials" 
              description={`${credentials.length} credential${credentials.length !== 1 ? 's' : ''} in your wallet`}
            >
              {credentials.length === 0 ? (
                <WalletCard variant="subtle" className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Credentials Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any verifiable credentials yet. Issue or receive some to get started.
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Credential
                  </Button>
                </WalletCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {credentials.map((credential) => (
                    <WalletCard key={credential.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(credential.status, credential.expirationDate)}
                            <div>
                              <h3 className="font-semibold text-sm">{credential.type}</h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {credential.vcId.slice(0, 16)}...
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(credential.status, credential.expirationDate)}
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Issuer:</span>
                            <p className="font-mono truncate">{credential.issuer}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Issued:</span>
                            <p>{new Date(credential.issuanceDate).toLocaleDateString()}</p>
                          </div>
                          {credential.expirationDate && (
                            <div>
                              <span className="text-muted-foreground">Expires:</span>
                              <p>{new Date(credential.expirationDate).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => viewCredential(credential)}
                            disabled={isLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => exportCredential(credential)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteCredential(credential.vcId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </WalletCard>
                  ))}
                </div>
              )}
            </WalletSection>

            <WalletSection title="Credential Statistics" description="Overview of your credential portfolio">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{credentials.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-wallet-success/10">
                      <CheckCircle2 className="h-5 w-5 text-wallet-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {credentials.filter(c => c.status === 'active' && (!c.expirationDate || new Date(c.expirationDate) > new Date())).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-wallet-warning/10">
                      <Clock className="h-5 w-5 text-wallet-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {credentials.filter(c => c.expirationDate && new Date(c.expirationDate) < new Date()).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Expired</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {credentials.filter(c => c.status === 'revoked').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Revoked</p>
                    </div>
                  </div>
                </Card>
              </div>
            </WalletSection>
          </div>
        </div>
      </div>

      {/* Credential Detail Dialog */}
      <Dialog open={showCredentialDetail} onOpenChange={setShowCredentialDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Credential Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedCredential && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Credential Information</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Type:</dt>
                        <dd>{selectedCredential.type?.join(', ')}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">ID:</dt>
                        <dd className="font-mono text-xs">{selectedCredential.id}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Issuer:</dt>
                        <dd className="font-mono text-xs">{selectedCredential.issuer}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Subject:</dt>
                        <dd className="font-mono text-xs">{selectedCredential.credentialSubject?.id}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Credential Subject</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedCredential.credentialSubject, null, 2)}
                    </pre>
                  </div>
                </div>

                {selectedCredential.proof && (
                  <div>
                    <h4 className="font-medium mb-2">Proof</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="font-medium">Type:</dt>
                          <dd>{selectedCredential.proof.type}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Created:</dt>
                          <dd>{new Date(selectedCredential.proof.created).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Purpose:</dt>
                          <dd>{selectedCredential.proof.proofPurpose}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </WalletLayout>
  );
};

export default Credentials;