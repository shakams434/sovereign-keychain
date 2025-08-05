import { VerifiableCredential } from './credential-service';

export interface N8NConfig {
  webhookUrl?: string;
  backupEnabled: boolean;
  loggingEnabled: boolean;
  apiKey?: string;
}

export interface N8NBackupData {
  type: 'backup';
  timestamp: string;
  data: {
    did?: any;
    credentials?: VerifiableCredential[];
    metadata?: any;
  };
}

export interface N8NLogEntry {
  type: 'log';
  timestamp: string;
  action: string;
  details: any;
  userDID?: string;
}

export class N8NService {
  private static config: N8NConfig = {
    backupEnabled: false,
    loggingEnabled: false
  };

  // Configure N8N integration
  static setConfig(config: Partial<N8NConfig>) {
    this.config = { ...this.config, ...config };
  }

  static getConfig(): N8NConfig {
    return { ...this.config };
  }

  // Send backup data to N8N
  static async sendBackup(data: N8NBackupData['data']): Promise<boolean> {
    if (!this.config.backupEnabled || !this.config.webhookUrl) {
      return false;
    }

    try {
      const backupPayload: N8NBackupData = {
        type: 'backup',
        timestamp: new Date().toISOString(),
        data
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify(backupPayload)
      });

      console.log('Backup sent to N8N:', backupPayload);
      return true;
    } catch (error) {
      console.error('Failed to send backup to N8N:', error);
      return false;
    }
  }

  // Send log entry to N8N
  static async sendLog(action: string, details: any, userDID?: string): Promise<boolean> {
    if (!this.config.loggingEnabled || !this.config.webhookUrl) {
      return false;
    }

    try {
      const logEntry: N8NLogEntry = {
        type: 'log',
        timestamp: new Date().toISOString(),
        action,
        details,
        userDID
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify(logEntry)
      });

      console.log('Log sent to N8N:', logEntry);
      return true;
    } catch (error) {
      console.error('Failed to send log to N8N:', error);
      return false;
    }
  }

  // Auto-backup on DID changes
  static async backupDID(did: any): Promise<boolean> {
    return this.sendBackup({ did });
  }

  // Auto-backup on credential changes
  static async backupCredentials(credentials: VerifiableCredential[]): Promise<boolean> {
    return this.sendBackup({ credentials });
  }

  // Log user actions
  static async logAction(action: string, details: any, userDID?: string): Promise<boolean> {
    return this.sendLog(action, details, userDID);
  }

  // Predefined log actions
  static async logDIDCreated(userDID: string): Promise<boolean> {
    return this.logAction('did_created', { userDID }, userDID);
  }

  static async logCredentialIssued(credential: VerifiableCredential, userDID?: string): Promise<boolean> {
    return this.logAction('credential_issued', {
      credentialId: credential.id,
      credentialType: credential.type,
      issuer: credential.issuer
    }, userDID);
  }

  static async logCredentialReceived(credential: VerifiableCredential, userDID?: string): Promise<boolean> {
    return this.logAction('credential_received', {
      credentialId: credential.id,
      credentialType: credential.type,
      issuer: credential.issuer
    }, userDID);
  }

  static async logCredentialShared(credentialIds: string[], verifier: string, userDID?: string): Promise<boolean> {
    return this.logAction('credentials_shared', {
      credentialIds,
      verifier,
      credentialCount: credentialIds.length
    }, userDID);
  }

  static async logOpenIDVCIRequest(issuer: string, credentialTypes: string[], userDID?: string): Promise<boolean> {
    return this.logAction('openid4vci_request', {
      issuer,
      credentialTypes,
      timestamp: new Date().toISOString()
    }, userDID);
  }

  static async logOpenIDVPRequest(verifier: string, requestedTypes: string[], userDID?: string): Promise<boolean> {
    return this.logAction('openid4vp_request', {
      verifier,
      requestedTypes,
      timestamp: new Date().toISOString()
    }, userDID);
  }

  // Test webhook connectivity
  static async testWebhook(): Promise<boolean> {
    if (!this.config.webhookUrl) {
      return false;
    }

    try {
      const testPayload = {
        type: 'test',
        timestamp: new Date().toISOString(),
        message: 'SSI Wallet connectivity test'
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify(testPayload)
      });

      console.log('Test webhook successful');
      return true;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }

  // Generate example N8N workflow configuration
  static generateWorkflowExample(): any {
    return {
      name: "SSI Wallet Integration",
      nodes: [
        {
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
          parameters: {
            httpMethod: "POST",
            path: "ssi-wallet",
            responseMode: "responseNode"
          }
        },
        {
          name: "Filter Backup",
          type: "n8n-nodes-base.if",
          position: [450, 200],
          parameters: {
            conditions: {
              string: [
                {
                  value1: "={{$json.type}}",
                  operation: "equal",
                  value2: "backup"
                }
              ]
            }
          }
        },
        {
          name: "Save Backup",
          type: "n8n-nodes-base.function",
          position: [650, 200],
          parameters: {
            functionCode: "// Process backup data\nconst backupData = items[0].json.data;\nreturn [{ json: { processed: true, backup: backupData } }];"
          }
        },
        {
          name: "Filter Logs",
          type: "n8n-nodes-base.if",
          position: [450, 400],
          parameters: {
            conditions: {
              string: [
                {
                  value1: "={{$json.type}}",
                  operation: "equal",
                  value2: "log"
                }
              ]
            }
          }
        },
        {
          name: "Process Log",
          type: "n8n-nodes-base.function",
          position: [650, 400],
          parameters: {
            functionCode: "// Process log entry\nconst logEntry = items[0].json;\nreturn [{ json: { logged: true, entry: logEntry } }];"
          }
        }
      ],
      connections: {
        "Webhook": {
          "main": [
            [
              { "node": "Filter Backup", "type": "main", "index": 0 },
              { "node": "Filter Logs", "type": "main", "index": 0 }
            ]
          ]
        },
        "Filter Backup": {
          "main": [
            [
              { "node": "Save Backup", "type": "main", "index": 0 }
            ]
          ]
        },
        "Filter Logs": {
          "main": [
            [
              { "node": "Process Log", "type": "main", "index": 0 }
            ]
          ]
        }
      }
    };
  }
}