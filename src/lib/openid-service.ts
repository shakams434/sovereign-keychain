import { CredentialService, VerifiableCredential } from './credential-service';
import { StorageService } from './storage';

export interface OpenID4VCICredentialOffer {
  credential_issuer: string;
  credentials: string[];
  grants?: {
    authorization_code?: {
      issuer_state?: string;
    };
    'urn:ietf:params:oauth:grant-type:pre-authorized_code'?: {
      'pre-authorized_code': string;
      user_pin_required?: boolean;
    };
  };
}

export interface OpenID4VPRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  nonce?: string;
  presentation_definition?: {
    id: string;
    input_descriptors: Array<{
      id: string;
      name?: string;
      purpose?: string;
      constraints: {
        fields: Array<{
          path: string[];
          filter?: any;
        }>;
      };
    }>;
  };
}

export interface CredentialRequestMetadata {
  types: string[];
  format: string;
  credentialSubject?: any;
}

export class OpenIDService {
  // Parse OpenID4VCI credential offer from URL or QR
  static parseCredentialOffer(url: string): OpenID4VCICredentialOffer | null {
    try {
      // Handle credential_offer_uri parameter
      const urlObj = new URL(url);
      const credentialOfferParam = urlObj.searchParams.get('credential_offer');
      const credentialOfferUriParam = urlObj.searchParams.get('credential_offer_uri');
      
      if (credentialOfferParam) {
        return JSON.parse(decodeURIComponent(credentialOfferParam));
      }
      
      if (credentialOfferUriParam) {
        // In real implementation, you would fetch from this URI
        throw new Error('credential_offer_uri requires HTTP fetch - not implemented in demo');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse credential offer:', error);
      return null;
    }
  }

  // Process OpenID4VCI credential offer
  static async processCredentialOffer(
    offer: OpenID4VCICredentialOffer,
    userDID: string
  ): Promise<VerifiableCredential[]> {
    try {
      const credentials: VerifiableCredential[] = [];
      
      // In a real implementation, you would:
      // 1. Get access token using authorization_code or pre-authorized_code
      // 2. Request credentials from the issuer's credential endpoint
      // 3. Verify the issuer's signature
      
      // For demo purposes, we'll simulate receiving credentials
      for (const credentialType of offer.credentials) {
        const mockCredential = await this.simulateCredentialFromIssuer(
          credentialType,
          offer.credential_issuer,
          userDID
        );
        credentials.push(mockCredential);
      }
      
      return credentials;
    } catch (error) {
      throw new Error(`Failed to process credential offer: ${error}`);
    }
  }

  // Simulate receiving credential from issuer (for demo)
  private static async simulateCredentialFromIssuer(
    credentialType: string,
    issuerEndpoint: string,
    subjectDID: string
  ): Promise<VerifiableCredential> {
    // Create mock issuer DID
    const issuerDID = `did:ethr:0x${Math.random().toString(16).substr(2, 40)}`;
    
    // Generate mock credential data based on type
    let credentialSubject: any = {};
    
    switch (credentialType.toLowerCase()) {
      case 'universitydegree':
      case 'universitydegreecredential':
        credentialSubject = {
          degree: {
            type: 'Bachelor of Science',
            name: 'Computer Science'
          },
          university: 'Example University'
        };
        break;
      case 'driverlicense':
      case 'driverlicensecredential':
        credentialSubject = {
          licenseNumber: `DL${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          class: 'Class A',
          restrictions: 'None'
        };
        break;
      default:
        credentialSubject = {
          type: credentialType,
          value: `Mock value for ${credentialType}`
        };
    }

    const credential = await CredentialService.createCredential(
      {
        type: credentialType,
        subject: credentialSubject
      },
      issuerDID,
      subjectDID
    );

    // In real implementation, this would be signed by the actual issuer
    return credential;
  }

  // Parse OpenID4VP presentation request
  static parsePresentationRequest(url: string): OpenID4VPRequest | null {
    try {
      const urlObj = new URL(url);
      
      return {
        response_type: urlObj.searchParams.get('response_type') || 'vp_token',
        client_id: urlObj.searchParams.get('client_id') || '',
        redirect_uri: urlObj.searchParams.get('redirect_uri') || '',
        scope: urlObj.searchParams.get('scope') || 'openid',
        state: urlObj.searchParams.get('state') || undefined,
        nonce: urlObj.searchParams.get('nonce') || undefined,
        presentation_definition: urlObj.searchParams.get('presentation_definition') 
          ? JSON.parse(decodeURIComponent(urlObj.searchParams.get('presentation_definition')!))
          : undefined
      };
    } catch (error) {
      console.error('Failed to parse presentation request:', error);
      return null;
    }
  }

  // Generate presentation response for OpenID4VP
  static async generatePresentationResponse(
    request: OpenID4VPRequest,
    selectedCredentials: VerifiableCredential[],
    holderDID: string
  ): Promise<string> {
    try {
      // Create presentation
      const presentation = await CredentialService.createPresentation(
        selectedCredentials,
        holderDID,
        request.nonce,
        request.client_id
      );

      // Sign presentation
      const signedPresentation = await CredentialService.signPresentation(
        presentation,
        holderDID
      );

      // Create response URL
      const responseUrl = new URL(request.redirect_uri);
      responseUrl.searchParams.set('vp_token', JSON.stringify(signedPresentation));
      
      if (request.state) {
        responseUrl.searchParams.set('state', request.state);
      }

      return responseUrl.toString();
    } catch (error) {
      throw new Error(`Failed to generate presentation response: ${error}`);
    }
  }

  // Filter credentials based on presentation definition
  static filterCredentialsForRequest(
    credentials: VerifiableCredential[],
    presentationDefinition?: OpenID4VPRequest['presentation_definition']
  ): VerifiableCredential[] {
    if (!presentationDefinition) {
      return credentials;
    }

    const matchingCredentials: VerifiableCredential[] = [];

    for (const descriptor of presentationDefinition.input_descriptors) {
      for (const credential of credentials) {
        // Simple matching based on type
        const credentialTypes = credential.type || [];
        const matchesType = descriptor.constraints.fields.some(field => 
          field.path.some(path => {
            if (path === '$.type') {
              return credentialTypes.some(type => 
                type.toLowerCase().includes(descriptor.id.toLowerCase())
              );
            }
            return false;
          })
        );

        if (matchesType && !matchingCredentials.find(c => c.id === credential.id)) {
          matchingCredentials.push(credential);
        }
      }
    }

    return matchingCredentials;
  }

  // Create OpenID4VCI authorization URL
  static createAuthorizationUrl(
    issuerEndpoint: string,
    credentialTypes: string[],
    clientId: string,
    redirectUri: string
  ): string {
    const authUrl = new URL(`${issuerEndpoint}/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', credentialTypes.join(' '));
    authUrl.searchParams.set('state', crypto.randomUUID());
    
    return authUrl.toString();
  }

  // Validate presentation definition format
  static validatePresentationDefinition(definition: any): boolean {
    try {
      return (
        definition &&
        typeof definition.id === 'string' &&
        Array.isArray(definition.input_descriptors) &&
        definition.input_descriptors.every((desc: any) => 
          desc.id && desc.constraints && Array.isArray(desc.constraints.fields)
        )
      );
    } catch {
      return false;
    }
  }
}