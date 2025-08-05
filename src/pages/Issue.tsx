import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletHeader } from '@/components/ui/wallet-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, FileText, Users, Copy, Download } from 'lucide-react';
import { CredentialService, CredentialRequest } from '@/lib/credential-service';
import { StorageService } from '@/lib/storage';
import { N8NService } from '@/lib/n8n-service';

const Issue = () => {
  const { toast } = useToast();
  const [userDID, setUserDID] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Single credential form
  const [singleForm, setSingleForm] = useState({
    type: '',
    recipientDID: '',
    attributes: [{ key: '', value: '' }]
  });

  // Bulk credential form
  const [bulkForm, setBulkForm] = useState({
    type: '',
    csvData: ''
  });

  // Credential templates
  const credentialTemplates = [
    { value: 'IdentityCredential', label: 'Identity Document', fields: ['name', 'email', 'dateOfBirth'] },
    { value: 'EducationCredential', label: 'Education Certificate', fields: ['degree', 'institution', 'graduationDate'] },
    { value: 'EmploymentCredential', label: 'Employment Verification', fields: ['position', 'company', 'startDate'] },
    { value: 'SkillCredential', label: 'Skill Certification', fields: ['skill', 'level', 'certifyingBody'] },
    { value: 'MembershipCredential', label: 'Membership Badge', fields: ['organization', 'membershipType', 'validUntil'] }
  ];

  useEffect(() => {
    loadUserDID();
  }, []);

  const loadUserDID = async () => {
    try {
      const did = await StorageService.getDID('current');
      if (did) {
        setUserDID(did.did);
      }
    } catch (error) {
      console.error('Failed to load user DID:', error);
    }
  };

  const addAttribute = () => {
    setSingleForm(prev => ({
      ...prev,
      attributes: [...prev.attributes, { key: '', value: '' }]
    }));
  };

  const updateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    setSingleForm(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  const removeAttribute = (index: number) => {
    setSingleForm(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const applyTemplate = (templateValue: string) => {
    const template = credentialTemplates.find(t => t.value === templateValue);
    if (template) {
      setSingleForm(prev => ({
        ...prev,
        type: template.value,
        attributes: template.fields.map(field => ({ key: field, value: '' }))
      }));
    }
  };

  const issueSingleCredential = async () => {
    if (!singleForm.type || !singleForm.recipientDID) {
      toast({
        title: "Missing Information",
        description: "Please fill in credential type and recipient DID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Build credential subject from attributes
      const credentialSubject: any = {};
      singleForm.attributes.forEach(attr => {
        if (attr.key && attr.value) {
          credentialSubject[attr.key] = attr.value;
        }
      });

      if (Object.keys(credentialSubject).length === 0) {
        toast({
          title: "No Attributes",
          description: "Please add at least one attribute to the credential",
          variant: "destructive"
        });
        return;
      }

      const request: CredentialRequest = {
        type: singleForm.type,
        subject: credentialSubject
      };

      // Create and sign credential
      const credential = await CredentialService.createCredential(
        request,
        userDID,
        singleForm.recipientDID
      );

      const signedCredential = await CredentialService.signCredential(credential, userDID);

      // Save to storage
      await StorageService.storeCredential(signedCredential);

      // Log to N8N if enabled
      await N8NService.logCredentialIssued(signedCredential, userDID);

      toast({
        title: "Credential Issued",
        description: `Successfully issued ${singleForm.type} to ${singleForm.recipientDID.slice(0, 20)}...`
      });

      // Reset form
      setSingleForm({
        type: '',
        recipientDID: '',
        attributes: [{ key: '', value: '' }]
      });

    } catch (error) {
      toast({
        title: "Issuance Failed",
        description: error instanceof Error ? error.message : "Failed to issue credential",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const issueBulkCredentials = async () => {
    if (!bulkForm.type || !bulkForm.csvData) {
      toast({
        title: "Missing Information",
        description: "Please provide credential type and CSV data",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Parse CSV data
      const lines = bulkForm.csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1);

      let successCount = 0;
      let failCount = 0;

      for (const row of rows) {
        try {
          const values = row.split(',').map(v => v.trim());
          if (values.length !== headers.length) continue;

          const recipientDID = values[0]; // First column should be DID
          const credentialSubject: any = {};
          
          // Map remaining columns to attributes
          for (let i = 1; i < headers.length; i++) {
            credentialSubject[headers[i]] = values[i];
          }

          const request: CredentialRequest = {
            type: bulkForm.type,
            subject: credentialSubject
          };

          const credential = await CredentialService.createCredential(
            request,
            userDID,
            recipientDID
          );

          const signedCredential = await CredentialService.signCredential(credential, userDID);
          await StorageService.storeCredential(signedCredential);
          await N8NService.logCredentialIssued(signedCredential, userDID);

          successCount++;
        } catch (error) {
          failCount++;
          console.error('Failed to issue credential for row:', row, error);
        }
      }

      toast({
        title: "Bulk Issuance Complete",
        description: `Issued ${successCount} credentials successfully. ${failCount} failed.`
      });

      setBulkForm({ type: '', csvData: '' });

    } catch (error) {
      toast({
        title: "Bulk Issuance Failed",
        description: error instanceof Error ? error.message : "Failed to process bulk credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyDID = () => {
    navigator.clipboard.writeText(userDID);
    toast({
      title: "Copied",
      description: "Your DID has been copied to clipboard"
    });
  };

  const exportCSVTemplate = () => {
    const template = credentialTemplates.find(t => t.value === bulkForm.type);
    if (template) {
      const headers = ['recipientDID', ...template.fields];
      const csvContent = headers.join(',') + '\n# Add recipient data below, one per line';
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.value}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          <div className="lg:col-span-3">
            <WalletHeader 
              title="Issue Credentials"
              subtitle="Create and issue verifiable credentials to other DIDs"
            />

            {/* Issuer Info Card */}
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Issuer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Label>Your DID (Issuer):</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {userDID || 'No DID available'}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyDID}
                    disabled={!userDID}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="single" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="single">Single Credential</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Issuance</TabsTrigger>
              </TabsList>

              {/* Single Credential Tab */}
              <TabsContent value="single">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Issue Single Credential
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label>Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
                        {credentialTemplates.map(template => (
                          <Badge
                            key={template.value}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => applyTemplate(template.value)}
                          >
                            {template.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="credentialType">Credential Type *</Label>
                        <Input
                          id="credentialType"
                          value={singleForm.type}
                          onChange={(e) => setSingleForm(prev => ({ ...prev, type: e.target.value }))}
                          placeholder="e.g., IdentityCredential"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recipientDID">Recipient DID *</Label>
                        <Input
                          id="recipientDID"
                          value={singleForm.recipientDID}
                          onChange={(e) => setSingleForm(prev => ({ ...prev, recipientDID: e.target.value }))}
                          placeholder="did:ethr:0x..."
                        />
                      </div>
                    </div>

                    {/* Attributes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Credential Attributes</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addAttribute}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Attribute
                        </Button>
                      </div>

                      {singleForm.attributes.map((attr, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label>Attribute Name</Label>
                            <Input
                              value={attr.key}
                              onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                              placeholder="e.g., name, email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Attribute Value</Label>
                            <div className="flex gap-2">
                              <Input
                                value={attr.value}
                                onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                                placeholder="Enter value"
                                className="flex-1"
                              />
                              {singleForm.attributes.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeAttribute(index)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={issueSingleCredential}
                      disabled={isLoading || !userDID}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? 'Issuing...' : 'Issue Credential'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Bulk Issuance Tab */}
              <TabsContent value="bulk">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Bulk Credential Issuance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulkType">Credential Type *</Label>
                        <Select onValueChange={(value) => setBulkForm(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select credential type" />
                          </SelectTrigger>
                          <SelectContent>
                            {credentialTemplates.map(template => (
                              <SelectItem key={template.value} value={template.value}>
                                {template.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Download Template</Label>
                        <Button
                          variant="outline"
                          onClick={exportCSVTemplate}
                          disabled={!bulkForm.type}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download CSV Template
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="csvData">CSV Data *</Label>
                      <Textarea
                        id="csvData"
                        value={bulkForm.csvData}
                        onChange={(e) => setBulkForm(prev => ({ ...prev, csvData: e.target.value }))}
                        placeholder="Paste CSV data here..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-sm text-muted-foreground">
                        First column should be recipient DID, followed by attribute columns as per template.
                      </p>
                    </div>

                    <Button
                      onClick={issueBulkCredentials}
                      disabled={isLoading || !userDID}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? 'Processing...' : 'Issue Bulk Credentials'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </WalletLayout>
  );
};

export default Issue;