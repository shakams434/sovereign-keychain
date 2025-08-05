import { CryptoService } from './crypto';
import { DIDResolver } from './did-resolver';
import { StorageService } from './storage';

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof?: Proof;
}

export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws?: string;
  signature?: string;
}

export interface CredentialRequest {
  type: string;
  subject: any;
  issuer?: string;
  expirationDate?: Date;
}

export class CredentialService {
  // Create a new Verifiable Credential
  static async createCredential(
    request: CredentialRequest,
    issuerDID: string,
    subjectDID?: string
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const vcId = `urn:uuid:${crypto.randomUUID()}`;
    
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: vcId,
      type: ['VerifiableCredential', request.type],
      issuer: issuerDID,
      issuanceDate: now.toISOString(),
      credentialSubject: {
        id: subjectDID || issuerDID,
        ...request.subject
      }
    };

    if (request.expirationDate) {
      credential.expirationDate = request.expirationDate.toISOString();
    }

    return credential;
  }

  // Sign a credential with issuer's private key
  static async signCredential(
    credential: VerifiableCredential,
    issuerDID: string
  ): Promise<VerifiableCredential> {
    try {
      const didData = await StorageService.getDID(issuerDID);
      if (!didData) {
        throw new Error('Issuer DID not found');
      }

      // Create proof
      const proof: Proof = {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `${issuerDID}#controller`
      };

      // Sign the credential
      const credentialToSign = { ...credential };
      const signature = await CryptoService.signData(credentialToSign, didData.privateKey);
      
      proof.signature = signature;

      return {
        ...credential,
        proof
      };
    } catch (error) {
      throw new Error(`Failed to sign credential: ${error}`);
    }
  }

  // Verify a credential's signature
  static async verifyCredential(credential: VerifiableCredential): Promise<boolean> {
    try {
      if (!credential.proof) {
        return false;
      }

      const issuerAddress = DIDResolver.extractAddressFromDID(credential.issuer);
      if (!issuerAddress) {
        return false;
      }

      // Remove proof from credential for verification
      const { proof, ...credentialWithoutProof } = credential;
      
      return CryptoService.verifySignature(
        credentialWithoutProof,
        proof.signature!,
        issuerAddress
      );
    } catch (error) {
      console.error('Credential verification failed:', error);
      return false;
    }
  }

  // Check if credential is expired
  static isExpired(credential: VerifiableCredential): boolean {
    if (!credential.expirationDate) {
      return false;
    }
    
    const expirationDate = new Date(credential.expirationDate);
    return expirationDate < new Date();
  }

  // Create atomic credentials (one per attribute)
  static async createAtomicCredentials(
    attributes: Record<string, any>,
    issuerDID: string,
    subjectDID?: string
  ): Promise<VerifiableCredential[]> {
    const credentials: VerifiableCredential[] = [];

    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      const request: CredentialRequest = {
        type: `${attributeName}Credential`,
        subject: {
          [attributeName]: attributeValue
        }
      };

      const credential = await this.createCredential(request, issuerDID, subjectDID);
      const signedCredential = await this.signCredential(credential, issuerDID);
      credentials.push(signedCredential);
    }

    return credentials;
  }

  // Create a presentation from selected credentials
  static async createPresentation(
    credentials: VerifiableCredential[],
    holderDID: string,
    challenge?: string,
    domain?: string
  ): Promise<any> {
    const presentation = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiablePresentation'],
      id: `urn:uuid:${crypto.randomUUID()}`,
      holder: holderDID,
      verifiableCredential: credentials,
      created: new Date().toISOString()
    };

    // Add challenge and domain if provided (for OpenID4VP)
    if (challenge) {
      (presentation as any).challenge = challenge;
    }
    if (domain) {
      (presentation as any).domain = domain;
    }

    return presentation;
  }

  // Sign a presentation
  static async signPresentation(
    presentation: any,
    holderDID: string
  ): Promise<any> {
    try {
      const didData = await StorageService.getDID(holderDID);
      if (!didData) {
        throw new Error('Holder DID not found');
      }

      const proof: Proof = {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        verificationMethod: `${holderDID}#controller`
      };

      const signature = await CryptoService.signData(presentation, didData.privateKey);
      proof.signature = signature;

      return {
        ...presentation,
        proof
      };
    } catch (error) {
      throw new Error(`Failed to sign presentation: ${error}`);
    }
  }

  // Verify a presentation
  static async verifyPresentation(presentation: any): Promise<boolean> {
    try {
      // Verify the presentation signature
      if (!presentation.proof) {
        return false;
      }

      const holderAddress = DIDResolver.extractAddressFromDID(presentation.holder);
      if (!holderAddress) {
        return false;
      }

      const { proof, ...presentationWithoutProof } = presentation;
      const presentationValid = CryptoService.verifySignature(
        presentationWithoutProof,
        proof.signature,
        holderAddress
      );

      if (!presentationValid) {
        return false;
      }

      // Verify all included credentials
      if (presentation.verifiableCredential) {
        for (const credential of presentation.verifiableCredential) {
          const credentialValid = await this.verifyCredential(credential);
          if (!credentialValid) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Presentation verification failed:', error);
      return false;
    }
  }

  // Get credential metadata
  static getCredentialMetadata(credential: VerifiableCredential) {
    return {
      id: credential.id,
      type: credential.type,
      issuer: credential.issuer,
      subject: credential.credentialSubject?.id,
      issuanceDate: credential.issuanceDate,
      expirationDate: credential.expirationDate,
      isExpired: this.isExpired(credential),
      attributes: Object.keys(credential.credentialSubject || {}).filter(key => key !== 'id')
    };
  }
}