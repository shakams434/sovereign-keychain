import Dexie, { Table } from 'dexie';
import { CryptoService } from './crypto';

export interface StoredDID {
  id: string;
  did: string;
  encryptedPrivateKey: string;
  publicKey: string;
  address: string;
  metadata: any;
  createdAt: Date;
}

export interface StoredCredential {
  id: string;
  vcId: string;
  type: string;
  encryptedData: string;
  issuer: string;
  subject: string;
  issuanceDate: Date;
  expirationDate?: Date;
  status: 'active' | 'revoked' | 'expired';
}

export interface StoredActivity {
  id: string;
  type: 'did_created' | 'did_deleted' | 'vc_issued' | 'vc_received' | 'vc_shared' | 'vc_verified' | 'vc_deleted' | 'wallet_imported';
  description: string;
  metadata: any;
  timestamp: Date;
}

class SSIDatabase extends Dexie {
  dids!: Table<StoredDID>;
  credentials!: Table<StoredCredential>;
  activities!: Table<StoredActivity>;

  constructor() {
    super('SSIWalletDB');
    this.version(1).stores({
      dids: '++id, did, address, createdAt',
      credentials: '++id, vcId, type, issuer, subject, issuanceDate, status',
      activities: '++id, type, timestamp'
    });
  }
}

export const db = new SSIDatabase();

export class StorageService {
  private static masterPassword: string | null = null;

  static setMasterPassword(password: string) {
    this.masterPassword = password;
  }

  static getMasterPassword(): string {
    if (!this.masterPassword) {
      throw new Error('Master password not set. Please unlock wallet first.');
    }
    return this.masterPassword;
  }

  static clearMasterPassword() {
    this.masterPassword = null;
  }

  // DID Management
  static async storeDID(did: string, privateKey: string, publicKey: string, address: string, metadata: any = {}) {
    const masterPassword = this.getMasterPassword();
    const encryptedPrivateKey = CryptoService.encrypt(privateKey, masterPassword);
    
    const storedDID: Omit<StoredDID, 'id'> = {
      did,
      encryptedPrivateKey,
      publicKey,
      address,
      metadata,
      createdAt: new Date()
    };

    const id = await db.dids.add(storedDID as StoredDID);
    await this.logActivity('did_created', `DID created: ${did}`, { did, address });
    return id;
  }

  static async getDID(did: string): Promise<{ did: string; privateKey: string; publicKey: string; address: string; metadata: any } | null> {
    const masterPassword = this.getMasterPassword();
    const stored = await db.dids.where('did').equals(did).first();
    
    if (!stored) return null;

    const privateKey = CryptoService.decrypt(stored.encryptedPrivateKey, masterPassword);
    
    return {
      did: stored.did,
      privateKey,
      publicKey: stored.publicKey,
      address: stored.address,
      metadata: stored.metadata
    };
  }

  static async getAllDIDs(): Promise<StoredDID[]> {
    return await db.dids.toArray();
  }

  static async deleteDID(did: string): Promise<void> {
    await db.dids.where('did').equals(did).delete();
    await this.logActivity('did_deleted', `DID deleted: ${did}`, { did });
  }

  // Credential Management
  static async storeCredential(credential: any): Promise<void> {
    const masterPassword = this.getMasterPassword();
    const encryptedData = CryptoService.encrypt(credential, masterPassword);
    
    const storedCredential: Omit<StoredCredential, 'id'> = {
      vcId: credential.id,
      type: credential.type?.[1] || 'VerifiableCredential',
      encryptedData,
      issuer: credential.issuer,
      subject: credential.credentialSubject?.id || '',
      issuanceDate: new Date(credential.issuanceDate),
      expirationDate: credential.expirationDate ? new Date(credential.expirationDate) : undefined,
      status: 'active'
    };

    await db.credentials.add(storedCredential as StoredCredential);
    await this.logActivity('vc_received', `Credential received: ${storedCredential.type}`, { vcId: credential.id });
  }

  static async getCredential(vcId: string): Promise<any | null> {
    const masterPassword = this.getMasterPassword();
    const stored = await db.credentials.where('vcId').equals(vcId).first();
    
    if (!stored) return null;

    return CryptoService.decrypt(stored.encryptedData, masterPassword);
  }

  static async getAllCredentials(): Promise<StoredCredential[]> {
    return await db.credentials.orderBy('issuanceDate').reverse().toArray();
  }

  static async deleteCredential(vcId: string): Promise<void> {
    await db.credentials.where('vcId').equals(vcId).delete();
    await this.logActivity('vc_deleted', `Credential deleted: ${vcId}`, { vcId });
  }

  static async updateCredentialStatus(vcId: string, status: 'active' | 'revoked' | 'expired'): Promise<void> {
    await db.credentials.where('vcId').equals(vcId).modify({ status });
  }

  // Activity Logging
  static async logActivity(type: StoredActivity['type'], description: string, metadata: any = {}): Promise<void> {
    const activity: Omit<StoredActivity, 'id'> = {
      type,
      description,
      metadata,
      timestamp: new Date()
    };

    await db.activities.add(activity as StoredActivity);
  }

  static async getActivities(limit: number = 50): Promise<StoredActivity[]> {
    return await db.activities.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  // Export/Import
  static async exportWallet(): Promise<{ dids: any[]; credentials: any[]; activities: StoredActivity[] }> {
    const masterPassword = this.getMasterPassword();
    
    const dids = await db.dids.toArray();
    const credentials = await db.credentials.toArray();
    const activities = await db.activities.toArray();

    // Decrypt sensitive data for export
    const decryptedDIDs = dids.map(did => ({
      ...did,
      privateKey: CryptoService.decrypt(did.encryptedPrivateKey, masterPassword)
    }));

    const decryptedCredentials = credentials.map(cred => ({
      ...cred,
      credential: CryptoService.decrypt(cred.encryptedData, masterPassword)
    }));

    return {
      dids: decryptedDIDs,
      credentials: decryptedCredentials,
      activities
    };
  }

  static async importWallet(data: any, newMasterPassword?: string): Promise<void> {
    const password = newMasterPassword || this.getMasterPassword();
    
    // Clear existing data
    await db.dids.clear();
    await db.credentials.clear();
    await db.activities.clear();

    // Import DIDs
    if (data.dids) {
      for (const did of data.dids) {
        const encryptedPrivateKey = CryptoService.encrypt(did.privateKey, password);
        await db.dids.add({
          ...did,
          encryptedPrivateKey
        });
      }
    }

    // Import Credentials
    if (data.credentials) {
      for (const cred of data.credentials) {
        const encryptedData = CryptoService.encrypt(cred.credential, password);
        await db.credentials.add({
          ...cred,
          encryptedData
        });
      }
    }

    // Import Activities
    if (data.activities) {
      await db.activities.bulkAdd(data.activities);
    }

    await this.logActivity('wallet_imported', 'Wallet data imported successfully', { itemCount: data.dids?.length + data.credentials?.length || 0 });
  }

  // Wallet status
  static async isWalletInitialized(): Promise<boolean> {
    const didCount = await db.dids.count();
    return didCount > 0;
  }

  static async clearAllData(): Promise<void> {
    await db.dids.clear();
    await db.credentials.clear();
    await db.activities.clear();
  }

  // Get storage information
  static async getStorageInfo(): Promise<{ used: number; quota: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      }
      return { used: 0, quota: 0 };
    } catch {
      return { used: 0, quota: 0 };
    }
  }

  // Clear all data
  static async clearAll(): Promise<void> {
    await this.clearAllData();
  }
}