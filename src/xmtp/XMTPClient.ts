import { Signer, Client } from '@xmtp/browser-sdk';
import { JsonRpcSigner } from 'ethers';
import { Hex, hexToBytes } from 'viem';
import XMTPConversations from './XMTPConversations';

// Convert Uint8Array to Base64 String
export function uint8ArrayToBase64(uint8Array?: Uint8Array): string {
  if (uint8Array) return btoa(String.fromCharCode(...uint8Array));
  else return '';
}

// Convert Base64 String back to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
}

class XMTPClient {
  private client: Client | undefined = undefined;
  private installationKey: string | undefined = undefined;
  private inboxId: string | undefined = undefined;
  public conversations: XMTPConversations;

  constructor() {
    this.client = undefined;
    this.installationKey = undefined;
    this.inboxId = undefined;
    this.conversations = new XMTPConversations();
  }

  async createInstallation(signer: JsonRpcSigner): Promise<void> {
    const encryptionKey: Uint8Array = window.crypto.getRandomValues(new Uint8Array(32));

    this.installationKey = uint8ArrayToBase64(encryptionKey);
    await this.createClient(signer, encryptionKey);
  }

  async buildInstallation(signer: JsonRpcSigner, encryptionKey: string): Promise<void> {
    const recoveredKey = base64ToUint8Array(encryptionKey);
    this.installationKey = encryptionKey;
    await this.createClient(signer, recoveredKey);
  }

  private async createSigner(signer: JsonRpcSigner): Promise<Signer> {
    return {
      getIdentifier: async () => {
        return { identifier: await signer.getAddress(), identifierKind: 'Ethereum' };
      },
      signMessage: async (message: string) => {
        const signMessage = await signer.signMessage(message);
        return hexToBytes(signMessage as Hex);
      },
      type: 'EOA'
    };
  }

  private async createClient(signer: JsonRpcSigner, encryptionKey: Uint8Array): Promise<void> {
    const xmtpSigner = await this.createSigner(signer);
    this.client = await Client.create(xmtpSigner, encryptionKey, {
      env: 'dev',
      dbPath: `./${await signer.getAddress()}-xmtp-v3.db3`
    });
    const isCreated = await this.client.isRegistered();
    if (!isCreated) {
      this.client = undefined;
      throw new Error('XMTP Client not created');
    }
    this.inboxId = this.client.inboxId;
    this.conversations = new XMTPConversations(this.client);
    console.log('XMTP Client Created:', this.client);
  }

  getClient(): Client | undefined {
    return this.client;
  }

  async getInboxId(): Promise<string | undefined> {
    return this.inboxId;
  }

  async getInstallationKey(): Promise<string | undefined> {
    return this.installationKey;
  }
}

export default XMTPClient;
