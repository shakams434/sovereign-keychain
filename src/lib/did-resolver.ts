import { ethers } from 'ethers';

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  keyAgreement: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  ethereumAddress?: string;
  publicKeyHex?: string;
}

export class DIDResolver {
  private static readonly DID_REGISTRY_ADDRESS = '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b'; // Ethereum mainnet
  
  static async resolveDID(did: string): Promise<DIDDocument | null> {
    try {
      // Extract address from did:ethr:<address>
      const address = this.extractAddressFromDID(did);
      if (!address) return null;

      // Create basic DID document for did:ethr
      const didDocument: DIDDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/secp256k1recovery-2020/v2'
        ],
        id: did,
        verificationMethod: [
          {
            id: `${did}#controller`,
            type: 'EcdsaSecp256k1RecoveryMethod2020',
            controller: did,
            ethereumAddress: address
          }
        ],
        authentication: [`${did}#controller`],
        assertionMethod: [`${did}#controller`],
        keyAgreement: [`${did}#controller`],
        capabilityInvocation: [`${did}#controller`],
        capabilityDelegation: [`${did}#controller`]
      };

      return didDocument;
    } catch (error) {
      console.error('Error resolving DID:', error);
      return null;
    }
  }

  static extractAddressFromDID(did: string): string | null {
    const match = did.match(/^did:ethr:(.+)$/);
    return match ? match[1] : null;
  }

  static isValidDID(did: string): boolean {
    const address = this.extractAddressFromDID(did);
    return address ? ethers.isAddress(address) : false;
  }

  static createDID(address: string): string {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    return `did:ethr:${address}`;
  }

  // Get verification method for signing
  static getSigningKey(didDocument: DIDDocument): VerificationMethod | null {
    return didDocument.verificationMethod.find(vm => 
      vm.type === 'EcdsaSecp256k1RecoveryMethod2020'
    ) || null;
  }

  // Validate DID document structure
  static validateDIDDocument(doc: any): boolean {
    return (
      doc &&
      typeof doc.id === 'string' &&
      Array.isArray(doc.verificationMethod) &&
      Array.isArray(doc.authentication) &&
      this.isValidDID(doc.id)
    );
  }
}