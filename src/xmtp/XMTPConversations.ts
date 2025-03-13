import { Client, Conversation, DecodedMessage, SafeGroupMember, Identifier, Dm } from '@xmtp/browser-sdk';

class XMTPConversations {
  private client: Client | undefined = undefined;

  constructor(client?: Client) {
    this.client = client;
  }

  async syncAll(): Promise<void> {
    await this.client?.conversations.syncAll();
  }

  async createGroup(addresses: string[]): Promise<Conversation> {
    const identifiers: Identifier[] = addresses.map((address) => {
      return {
        identifier: address,
        identifierKind: 'Ethereum'
      };
    });
    const groupCreated: Conversation | undefined = await this.client?.conversations.newGroupWithIdentifiers(
      identifiers
    );
    if (!groupCreated) {
      throw new Error('Group not created');
    }
    return groupCreated;
  }

  async createDirectConversation(addresses: string[]): Promise<Conversation> {
    const identifiers: Identifier[] = addresses.map((address) => {
      return {
        identifier: address,
        identifierKind: 'Ethereum'
      };
    });

    const groupCreated: Conversation | undefined = await this.client?.conversations.newGroupWithIdentifiers(
      identifiers
    );
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
    try {
      if (address) {
        const identifier: Identifier = {
          identifier: address,
          identifierKind: 'Ethereum'
        };
        const newConversation = await this.client?.conversations.newDmWithIdentifier(identifier);
        if (!newConversation) {
          throw new Error(`Failed to create a conversation with address: ${address}`);
        }
        conversation = newConversation;
      }

      if (!conversation) {
        throw new Error('No valid conversation provided.');
      }

      await conversation.send(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async sendMessageByConversationId(message: string, conversationId: string): Promise<void> {
    console.log('🚀 ~ XMTPConversations ~ sendMessageByConversationId ~ conversationId:', conversationId);
    try {
      const conversation = await this.client?.conversations.getConversationById(conversationId);

      if (!conversation) {
        throw new Error('No valid conversation provided.');
      }

      await conversation.send(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async sendMessageToInboxId(message: string, inboxId: string): Promise<void> {
    console.log('🚀 ~ XMTPConversations ~ sendMessageByToInboxId ~ inboxId:', inboxId);
    try {
      const dm: Dm | undefined = await this.client?.conversations.newDm(inboxId);

      if (!dm) {
        throw new Error('No valid dm provided.');
      }

      const result = await dm.send(message);
      console.log('🚀 ~ XMTPConversations ~ sendMessageByToInboxId ~ result:', result);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

export default XMTPConversations;
