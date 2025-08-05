import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

export class CryptoService {
  // Generate a new DID using did:ethr method
  static generateDID(): { did: string; privateKey: string; publicKey: string; address: string } {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    const publicKey = wallet.publicKey;
    
    // Format as did:ethr:<address>
    const did = `did:ethr:${address}`;
    
    return {
      did,
      privateKey,
      publicKey,
      address
    };
  }

  // Encrypt data with AES-GCM
  static encrypt(data: any, passphrase: string): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, passphrase).toString();
    return encrypted;
  }

  // Decrypt data with AES-GCM
  static decrypt(encryptedData: string, passphrase: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, passphrase);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Failed to decrypt data. Invalid passphrase.');
    }
  }

  // Sign data with private key
  static async signData(data: any, privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    const dataString = JSON.stringify(data);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
    const signature = await wallet.signMessage(ethers.getBytes(hash));
    return signature;
  }

  // Verify signature
  static verifySignature(data: any, signature: string, address: string): boolean {
    try {
      const dataString = JSON.stringify(data);
      const hash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(hash), signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  // Generate random passphrase
  static generatePassphrase(): string {
    return ethers.encodeBase64(ethers.randomBytes(32));
  }
}