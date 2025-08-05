import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileText, Key, AlertTriangle } from 'lucide-react';
import { StorageService } from '@/lib/storage';
import { VerifiableCredential } from '@/lib/credential-service';
import { N8NService } from '@/lib/n8n-service';

interface ImportExportDialogProps {
  trigger: React.ReactNode;
  type: 'did' | 'credentials';
  onImportComplete?: () => void;
}

export const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  trigger,
  type,
  onImportComplete
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [password, setPassword] = useState('');

  const exportData = async () => {
    setIsLoading(true);
    try {
      let exportContent: any;
      let filename: string;

      if (type === 'did') {
        const didData = await StorageService.getDID('current');
        if (!didData) {
          toast({
            title: "No DID Found",
            description: "No DID available to export",
            variant: "destructive"
          });
          return;
        }

        exportContent = {
          type: 'did',
          version: '1.0',
          timestamp: new Date().toISOString(),
          data: didData
        };
        filename = `did-${didData.did.slice(-8)}-${Date.now()}.json`;

        // Log DID export
        await N8NService.logAction('did_exported', { didId: didData.did });
      } else {
        const storedCredentials = await StorageService.getAllCredentials();
        const credentials = await Promise.all(
          storedCredentials.map(async (stored) => {
            return await StorageService.getCredential(stored.vcId);
          })
        );
        if (credentials.length === 0) {
          toast({
            title: "No Credentials Found",
            description: "No credentials available to export",
            variant: "destructive"
          });
          return;
        }

        exportContent = {
          type: 'credentials',
          version: '1.0',
          timestamp: new Date().toISOString(),
          count: credentials.length,
          data: credentials
        };
        filename = `credentials-${Date.now()}.json`;

        // Backup to N8N if enabled
        await N8NService.backupCredentials(credentials);
        
        // Log credentials export
        await N8NService.logAction('credentials_exported', { 
          count: credentials.length,
          credentialIds: credentials.map(c => c.id)
        });
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportContent, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `${type === 'did' ? 'DID' : 'Credentials'} exported successfully`
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const importFromFile = async (file: File) => {
    setIsLoading(true);
    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (data.type !== type) {
        toast({
          title: "Invalid File Type",
          description: `This file contains ${data.type} data, expected ${type}`,
          variant: "destructive"
        });
        return;
      }

      if (type === 'did') {
        await importDID(data.data);
      } else {
        await importCredentials(data.data);
      }

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const importFromText = async () => {
    if (!importData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste the JSON data to import",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = JSON.parse(importData);

      if (data.type !== type) {
        toast({
          title: "Invalid Data Type",
          description: `This data contains ${data.type}, expected ${type}`,
          variant: "destructive"
        });
        return;
      }

      if (type === 'did') {
        await importDID(data.data);
      } else {
        await importCredentials(data.data);
      }

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const importDID = async (didData: any) => {
    try {
      // Validate DID data structure
      if (!didData.did || !didData.privateKey || !didData.address) {
        throw new Error('Invalid DID data structure');
      }

      // Check if DID already exists
      const existingDID = await StorageService.getDID('current');
      if (existingDID) {
        throw new Error('A DID already exists. Please export it first if you want to replace it.');
      }

      // Save the imported DID
      await StorageService.storeDID(didData.did, didData.privateKey, didData.publicKey, didData.address, didData.metadata);

      toast({
        title: "DID Imported Successfully",
        description: `DID ${didData.did} has been imported`
      });

      // Log DID import
      await N8NService.logAction('did_imported', { didId: didData.did });

      setIsOpen(false);
      onImportComplete?.();
    } catch (error) {
      throw new Error(`DID import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const importCredentials = async (credentialsData: VerifiableCredential[]) => {
    try {
      if (!Array.isArray(credentialsData)) {
        throw new Error('Invalid credentials data format');
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const credential of credentialsData) {
        try {
          // Check if credential already exists
          const existing = await StorageService.getCredential(credential.id);
          if (existing) {
            skippedCount++;
            continue;
          }

          // Validate credential structure
          if (!credential.id || !credential.type || !credential.issuer) {
            console.warn('Skipping invalid credential:', credential);
            skippedCount++;
            continue;
          }

          await StorageService.storeCredential(credential);
          importedCount++;

          // Log credential import
          await N8NService.logCredentialReceived(credential);
        } catch (error) {
          console.error('Failed to import credential:', credential.id, error);
          skippedCount++;
        }
      }

      if (importedCount > 0) {
        // Backup imported credentials to N8N
        const allStoredCredentials = await StorageService.getAllCredentials();
        const newCredentials = await Promise.all(
          allStoredCredentials.map(async (stored) => {
            return await StorageService.getCredential(stored.vcId);
          })
        );
        await N8NService.backupCredentials(newCredentials);
      }

      toast({
        title: "Credentials Imported",
        description: `Imported ${importedCount} credentials. ${skippedCount > 0 ? `Skipped ${skippedCount} duplicates/invalid.` : ''}`
      });

      setIsOpen(false);
      onImportComplete?.();
    } catch (error) {
      throw new Error(`Credentials import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFromFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import/Export {type === 'did' ? 'DID' : 'Credentials'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export {type === 'did' ? 'DID' : 'Credentials'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {type === 'did' 
                    ? 'Export your DID and private key as a secure JSON file. Keep this file safe!'
                    : 'Export all your verifiable credentials as a JSON file for backup purposes.'
                  }
                </p>
                {type === 'did' && (
                  <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-800 dark:text-orange-200">
                      This file contains your private key. Store it securely!
                    </span>
                  </div>
                )}
              </div>

              <Button onClick={exportData} disabled={isLoading} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {isLoading ? 'Exporting...' : `Export ${type === 'did' ? 'DID' : 'Credentials'}`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import {type === 'did' ? 'DID' : 'Credentials'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {type === 'did' 
                    ? 'Import a previously exported DID from a JSON file or paste the JSON data.'
                    : 'Import verifiable credentials from a JSON file or paste the JSON data.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-import">Import from File</Label>
                  <Input
                    id="file-import"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                  />
                </div>

                <div className="text-center text-muted-foreground">or</div>

                <div className="space-y-2">
                  <Label htmlFor="text-import">Paste JSON Data</Label>
                  <Textarea
                    id="text-import"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste the exported JSON data here..."
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={importFromText} 
                  disabled={isLoading || !importData.trim()} 
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Importing...' : `Import ${type === 'did' ? 'DID' : 'Credentials'}`}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};