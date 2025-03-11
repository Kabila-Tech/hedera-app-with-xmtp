import { Client, Conversation, DecodedMessage, SafeGroupMember } from '@xmtp/browser-sdk';

class XMTPConversations {
  private client: Client | undefined = undefined;

  constructor(client?: Client) {
    this.client = client;
  }

  async syncAll(): Promise<void> {
    await this.client?.conversations.syncAll();
  }

  async createGroup(addresses: string[]): Promise<Conversation> {
    const groupCreated: Conversation | undefined = await this.client?.conversations.newGroup(addresses);
    if (!groupCreated) {
      throw new Error('Group not created');
    }
    return groupCreated;
  }

  async createDirectConversation(addresses: string[]): Promise<Conversation> {
    const groupCreated: Conversation | undefined = await this.client?.conversations.newGroup(addresses);
    if (!groupCreated) {
      throw new Error('Group not created');
    }
    return groupCreated;
  }

  async listGroups(): Promise<Conversation[] | undefined> {
    await this.client?.conversations.sync();
    return this.client?.conversations.listGroups();
  }

  // Conversation can be a group or a DM
  async getMessages(conversation: Conversation): Promise<DecodedMessage[]> {
    await conversation.sync();
    return conversation.messages();
  }

  async getGroupMembers(conversation: Conversation): Promise<SafeGroupMember[]> {
    return conversation.members();
  }

  async getAll(): Promise<Conversation[] | undefined> {
    return this.client?.conversations.list();
  }

  async getDms(): Promise<Conversation[] | undefined> {
    return this.client?.conversations.listDms();
  }

  async getGroups(): Promise<Conversation[] | undefined> {
    return this.client?.conversations.listGroups();
  }

  /*async addGroupMembers(conversation: Conversation, addresses: string[]): Promise<void> {
    return conversation.(addresses);
  }*/

  // Conversation can be a group or a DM
  async sendMessage(message: string, conversation?: Conversation, address?: string): Promise<void> {
    if (address) {
      conversation = await this.client?.conversations.newDm(address);
    }
    conversation?.send(message);
  }
}

export default XMTPConversations;
