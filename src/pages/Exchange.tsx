import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { WalletLayout, WalletHeader } from '@/components/ui/wallet-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Download, Upload, Share, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { OpenIDService, OpenID4VCICredentialOffer, OpenID4VPRequest } from '@/lib/openid-service';
import { CredentialService, VerifiableCredential } from '@/lib/credential-service';
import { StorageService } from '@/lib/storage';
import { N8NService } from '@/lib/n8n-service';

const Exchange = () => {
  const { toast } = useToast();
  const [userDID, setUserDID] = useState<string>('');
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // OpenID4VCI state
  const [vciUrl, setVciUrl] = useState('');
  const [parsedOffer, setParsedOffer] = useState<OpenID4VCICredentialOffer | null>(null);
  
  // OpenID4VP state
  const [vpUrl, setVpUrl] = useState('');
  const [parsedRequest, setParsedRequest] = useState<OpenID4VPRequest | null>(null);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [matchingCredentials, setMatchingCredentials] = useState<VerifiableCredential[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const did = await StorageService.getCurrentDID();
      if (did) {
        setUserDID(did.did);
      }
      
      const userCredentials = await StorageService.getAllCredentials();
      setCredentials(userCredentials);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // OpenID4VCI Functions
  const parseVCIUrl = () => {
    if (!vciUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid OpenID4VCI URL",
        variant: "destructive"
      });
      return;
    }

    try {
      const offer = OpenIDService.parseCredentialOffer(vciUrl);
      if (offer) {
        setParsedOffer(offer);
        toast({
          title: "Credential Offer Parsed",
          description: `Found ${offer.credentials.length} credential(s) available`
        });
      } else {
        toast({
          title: "Parse Failed",
          description: "Could not parse credential offer from URL",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse URL",
        variant: "destructive"
      });
    }
  };

  const acceptCredentialOffer = async () => {
    if (!parsedOffer || !userDID) return;

    setIsLoading(true);
    try {
      const receivedCredentials = await OpenIDService.processCredentialOffer(
        parsedOffer,
        userDID
      );

      // Save credentials to storage
      for (const credential of receivedCredentials) {
        await StorageService.saveCredential(credential);
        await N8NService.logCredentialReceived(credential, userDID);
      }

      // Backup to N8N if enabled
      await N8NService.backupCredentials(receivedCredentials);

      toast({
        title: "Credentials Received",
        description: `Successfully received ${receivedCredentials.length} credential(s)`
      });

      // Refresh credentials list
      await loadUserData();
      
      // Reset form
      setVciUrl('');
      setParsedOffer(null);

      // Log OpenID4VCI request
      await N8NService.logOpenIDVCIRequest(
        parsedOffer.credential_issuer,
        parsedOffer.credentials,
        userDID
      );

    } catch (error) {
      toast({
        title: "Failed to Receive Credentials",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OpenID4VP Functions
  const parseVPUrl = () => {
    if (!vpUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid OpenID4VP URL",
        variant: "destructive"
      });
      return;
    }

    try {
      const request = OpenIDService.parsePresentationRequest(vpUrl);
      if (request) {
        setParsedRequest(request);
        
        // Filter matching credentials
        const matching = OpenIDService.filterCredentialsForRequest(
          credentials,
          request.presentation_definition
        );
        setMatchingCredentials(matching);
        
        toast({
          title: "Presentation Request Parsed",
          description: `Found ${matching.length} matching credential(s)`
        });
      } else {
        toast({
          title: "Parse Failed",
          description: "Could not parse presentation request from URL",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse URL",
        variant: "destructive"
      });
    }
  };

  const shareCredentials = async () => {
    if (!parsedRequest || !userDID || selectedCredentials.length === 0) return;

    setIsLoading(true);
    try {
      const credentialsToShare = credentials.filter(c => 
        selectedCredentials.includes(c.id)
      );

      const responseUrl = await OpenIDService.generatePresentationResponse(
        parsedRequest,
        credentialsToShare,
        userDID
      );

      // Open response URL (or copy to clipboard)
      navigator.clipboard.writeText(responseUrl);
      
      toast({
        title: "Presentation Created",
        description: "Response URL copied to clipboard. You can now share it with the verifier."
      });

      // Log the sharing event
      await N8NService.logCredentialShared(
        selectedCredentials,
        parsedRequest.client_id,
        userDID
      );

      // Log OpenID4VP request
      await N8NService.logOpenIDVPRequest(
        parsedRequest.client_id,
        credentialsToShare.map(c => c.type).flat(),
        userDID
      );

      // Reset form
      setVpUrl('');
      setParsedRequest(null);
      setSelectedCredentials([]);
      setMatchingCredentials([]);

    } catch (error) {
      toast({
        title: "Failed to Create Presentation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCredentialSelection = (credentialId: string) => {
    setSelectedCredentials(prev => 
      prev.includes(credentialId)
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    );
  };

  // Generate example URLs for testing
  const generateExampleVCIUrl = () => {
    const exampleOffer: OpenID4VCICredentialOffer = {
      credential_issuer: "https://issuer.example.com",
      credentials: ["UniversityDegreeCredential", "DriverLicenseCredential"],
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          'pre-authorized_code': 'adhjhdjajkdkhjhdj'
        }
      }
    };
    
    const url = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(exampleOffer))}`;
    setVciUrl(url);
  };

  const generateExampleVPUrl = () => {
    const params = new URLSearchParams({
      response_type: 'vp_token',
      client_id: 'https://verifier.example.com',
      redirect_uri: 'https://verifier.example.com/callback',
      scope: 'openid',
      nonce: 'random-nonce-123',
      presentation_definition: JSON.stringify({
        id: 'example-request',
        input_descriptors: [{
          id: 'university_degree',
          name: 'University Degree',
          constraints: {
            fields: [{
              path: ['$.type'],
              filter: { contains: 'University' }
            }]
          }
        }]
      })
    });
    
    const url = `openid4vp://authorize?${params.toString()}`;
    setVpUrl(url);
  };

  return (
    <WalletLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Navigation />
          <div className="lg:col-span-3">
            <WalletHeader 
              title="OpenID4VCI/VP Exchange"
              subtitle="Receive and share credentials using OpenID standards"
            />

            <Tabs defaultValue="receive" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="receive">Receive (VCI)</TabsTrigger>
                <TabsTrigger value="share">Share (VP)</TabsTrigger>
              </TabsList>

              {/* OpenID4VCI - Receive Credentials */}
              <TabsContent value="receive">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Receive Credentials (OpenID4VCI)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vciUrl">Credential Offer URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="vciUrl"
                            value={vciUrl}
                            onChange={(e) => setVciUrl(e.target.value)}
                            placeholder="openid-credential-offer://..."
                            className="flex-1"
                          />
                          <Button onClick={parseVCIUrl} variant="outline">
                            Parse
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateExampleVCIUrl}
                        >
                          Load Example URL
                        </Button>
                      </div>
                    </div>

                    {parsedOffer && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Credential Offer Details
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Issuer:</strong>
                              <p className="text-muted-foreground">{parsedOffer.credential_issuer}</p>
                            </div>
                            <div>
                              <strong>Grant Type:</strong>
                              <p className="text-muted-foreground">
                                {parsedOffer.grants?.authorization_code ? 'Authorization Code' : 'Pre-authorized'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <strong>Available Credentials:</strong>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {parsedOffer.credentials.map((credential, index) => (
                                <Badge key={index} variant="secondary">
                                  {credential}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={acceptCredentialOffer}
                            disabled={isLoading || !userDID}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {isLoading ? 'Receiving...' : 'Accept Credential Offer'}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* OpenID4VP - Share Credentials */}
              <TabsContent value="share">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share className="h-5 w-5" />
                      Share Credentials (OpenID4VP)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vpUrl">Presentation Request URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="vpUrl"
                            value={vpUrl}
                            onChange={(e) => setVpUrl(e.target.value)}
                            placeholder="openid4vp://authorize?..."
                            className="flex-1"
                          />
                          <Button onClick={parseVPUrl} variant="outline">
                            Parse
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateExampleVPUrl}
                        >
                          Load Example URL
                        </Button>
                      </div>
                    </div>

                    {parsedRequest && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Presentation Request Details
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Verifier:</strong>
                              <p className="text-muted-foreground">{parsedRequest.client_id}</p>
                            </div>
                            <div>
                              <strong>Response Type:</strong>
                              <p className="text-muted-foreground">{parsedRequest.response_type}</p>
                            </div>
                          </div>

                          {matchingCredentials.length > 0 ? (
                            <div className="space-y-4">
                              <h5 className="font-medium">Select Credentials to Share:</h5>
                              <div className="space-y-2">
                                {matchingCredentials.map((credential) => (
                                  <div key={credential.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                                    <Checkbox
                                      id={credential.id}
                                      checked={selectedCredentials.includes(credential.id)}
                                      onCheckedChange={() => toggleCredentialSelection(credential.id)}
                                    />
                                    <div className="flex-1">
                                      <Label htmlFor={credential.id} className="font-medium">
                                        {credential.type.join(', ')}
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Issued by: {credential.issuer.slice(0, 20)}...
                                      </p>
                                    </div>
                                    <Badge variant="outline">
                                      {credential.credentialSubject ? 
                                        Object.keys(credential.credentialSubject).filter(k => k !== 'id').length + ' attrs'
                                        : '0 attrs'
                                      }
                                    </Badge>
                                  </div>
                                ))}
                              </div>

                              <Button
                                onClick={shareCredentials}
                                disabled={isLoading || selectedCredentials.length === 0}
                                className="w-full"
                              >
                                <Share className="h-4 w-4 mr-2" />
                                {isLoading ? 'Creating Presentation...' : `Share ${selectedCredentials.length} Credential(s)`}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center p-4 border rounded-lg">
                              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                              <p className="text-muted-foreground">
                                No matching credentials found for this request.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
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

export default Exchange;