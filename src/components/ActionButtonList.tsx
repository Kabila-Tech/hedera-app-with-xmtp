import {
  useDisconnect,
  useAppKitAccount,
  useAppKitNetworkCore,
  useAppKitState,
  useAppKitProvider,
} from "@reown/appkit/react";
import {
  BrowserProvider,
  // JsonRpcSigner,
  formatEther,
  JsonRpcSigner,
  parseEther,
  Wallet,
} from "ethers";
import {
  transactionToBase64String,
  HederaWalletConnectProvider,
} from "../lib/adapters/hedera";
import { useState } from "react";
import {
  AccountInfo,
  AccountInfoQuery,
  Hbar,
  Transaction as HederaTransaction,
  TransactionId,
  TransferTransaction,
} from "@hashgraph/sdk";
import {
  queryToBase64String,
  SignAndExecuteQueryParams,
  SignMessageParams,
} from "@hashgraph/hedera-wallet-connect";
import { hederaNamespace } from "../config";
import XMTPClient from "../xmtp/XMTPClient";
import { Conversation } from "@xmtp/browser-sdk";
// import { universalHederaAdapter } from "../config";

// Example receiver addresses

const testEthReceiver = "0xE53F9824319B891CD4D6050dBF2b242Be7e13344";
const testNativeReceiver = "0.0.4848542";

// Example types, and message (EIP-712)

const types = {
  Person: [
    { name: "name", type: "string" },
    { name: "wallet", type: "address" },
  ],
  Mail: [
    { name: "from", type: "Person" },
    { name: "to", type: "Person" },
    { name: "contents", type: "string" },
  ],
};

const message = {
  from: {
    name: "Alice",
    wallet: Wallet.createRandom().address, // example address
  },
  to: {
    name: "Bob",
    wallet: Wallet.createRandom().address, // example address
  },
  contents: "Hello, Bob!",
};



interface ActionButtonListProps {
  sendHash: (hash: string) => void;
  sendTxId: (id: string) => void;
  sendSignMsg: (hash: string) => void;
  sendBalance: (balance: string) => void;

  sendNodeAddresses: (nodes: string[]) => void;
}

interface Conversation2 {
  id: string;
  messages: string[];
}

let xmtpClient: XMTPClient | undefined = undefined;

export const ActionButtonList = ({
  sendHash,
  sendTxId,
  sendSignMsg,
  sendBalance,
  sendNodeAddresses,
}: ActionButtonListProps) => {
  const { disconnect } = useDisconnect();
  const { chainId } = useAppKitNetworkCore();
  const { isConnected, address } = useAppKitAccount();
  const { activeChain } = useAppKitState();
  const [signedHederaTx, setSignedHederaTx] = useState<HederaTransaction>();
  const [signedEthTx, setSignedEthTx] = useState<string>();
  const [message2, setMessage2] = useState<string>("");
  const [encriptionKey, setEncriptionKey] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation2[]>([]);
  const [groupConversation, setGroupConversations] = useState<Conversation>();
  const [conversationId, setConversationId] = useState<string>("");

  const { walletProvider } = useAppKitProvider(activeChain ?? hederaNamespace);



  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };


  // --- HIP-820 ---

  const getwalletProvider = () => {
    if (!walletProvider) throw Error("user is disconnected");
    return walletProvider as HederaWalletConnectProvider;
  };

  const getXMTPClient = async () => {
    if (xmtpClient) return xmtpClient;
    console.log("RECOVERING XMPT CLIENT WITH SOTRED KEY")
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");
    const provider = new BrowserProvider(walletProvider, chainId);
    const signerJsonRPC = new JsonRpcSigner(provider, address);
    
    const storedKey = localStorage.getItem("installationKey");
    if (storedKey) {
      setEncriptionKey(storedKey);
      xmtpClient = new XMTPClient();
      await xmtpClient.buildInstallation(signerJsonRPC, storedKey);
      console.log('Key -> ', xmtpClient.getInstallationKey());
      return xmtpClient;
    }

    console.log("You need Create a XMPT CLIENT")
  };

  const xmpt_create_group = async () => {
    await getXMTPClient();
    console.log("🚀 ~ consteth_list_xmtp_messages= ~ xmtpClient:", xmtpClient);

    if (xmtpClient) {
      console.log("Creating group");
      const newGroupConversation: Conversation = await xmtpClient.conversations.createGroup(['0x3bD4a856b5A90732d378B109b607354d4E7fE178', '0x7c589d7209a07981381251a264ea2053075821a3']);
      console.log("🚀 ~ createGroup ~ newGroupConversation:", newGroupConversation)
      setGroupConversations(newGroupConversation)
    }
  }


  const xmpt_get_groups = async () => {
    await getXMTPClient();
    console.log("🚀 ~ consteth_list_xmtp_messages= ~ xmtpClient:", xmtpClient);

    if (xmtpClient) {
      console.log("getting group");
      const convos = await xmtpClient.conversations.getGroups()
      console.log("🚀 ~ constxmpt_get_groups= ~ convos:", convos)
      if (convos && convos[0]) {
        setGroupConversations(convos[0])
      }
    }
  }

  const xmpt_get_members = async () => {
    await getXMTPClient();
    console.log("🚀 ~ consteth_list_xmtp_messages= ~ xmtpClient:", xmtpClient);

    if (xmtpClient && groupConversation) {
      console.log("Creating group");
      const members = await xmtpClient.conversations.getGroupMembers(groupConversation)
      console.log("🚀 ~ constxmpt_get_members= ~ members:", members)
    }
  }

  const xmtp_send_message_to_group = async () => {
    await getXMTPClient();
    if (xmtpClient && groupConversation) {
      const message = "hello world " + new Date().toISOString();
      await xmtpClient.conversations.syncAll();
      await xmtpClient.conversations.sendMessage(message, groupConversation);
    }
  };

  const hedera_getNodeAddresses = async () => {
    const walletProvider = getwalletProvider();
    const result = await walletProvider.hedera_getNodeAddresses();

    window.alert("Node addresses: " + JSON.stringify(result.nodes));
    sendNodeAddresses(result.nodes);
  };

  const hedera_executeTransaction = async () => {
    const walletProvider = getwalletProvider();
    if (!signedHederaTx) {
      throw Error("Transaction not signed, use hedera_signTransaction first");
    }

    const transactionList = transactionToBase64String(signedHederaTx);

    const result = await walletProvider.hedera_executeTransaction({
      transactionList,
    });
    setSignedHederaTx(undefined);

    window.alert("Transaction Id: " + result.transactionId);
    sendTxId(result.transactionId);
  };

  const hedera_signMessage = async () => {
    const walletProvider = getwalletProvider();

    const params: SignMessageParams = {
      signerAccountId: "hedera:testnet:" + address,
      message: "Test Message for AppKit Example",
    };

    const { signatureMap } = await walletProvider.hedera_signMessage(params);

    window.alert("Signed message: " + signatureMap);
    sendSignMsg(signatureMap);
  };

  const hedera_signTransaction = async () => {
    const walletProvider = getwalletProvider();

    const accountId = address!;
    const hbarAmount = new Hbar(Number(1));
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
      .setMaxTransactionFee(new Hbar(Number(1)))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount);

    const transactionSigned = await walletProvider.hedera_signTransaction({
      signerAccountId: "hedera:testnet:" + address,
      transactionBody: transaction,
    });
    window.alert(
      "Signed transaction: " +
        JSON.stringify(
          (transactionSigned as HederaTransaction).getSignatures(),
        ),
    );
    setSignedHederaTx(transactionSigned as HederaTransaction);
  };

  const hedera_signAndExecuteQuery = async () => {
    const walletProvider = getwalletProvider();
    const accountId = address!;
    const query = new AccountInfoQuery().setAccountId(accountId);

    const params: SignAndExecuteQueryParams = {
      signerAccountId: "hedera:testnet:" + accountId,
      query: queryToBase64String(query),
    };

    const result = await walletProvider.hedera_signAndExecuteQuery(params);
    const bytes = Buffer.from(result.response, "base64");
    const accountInfo = AccountInfo.fromBytes(bytes);
    window.alert(
      "hedera_signAndExecuteQuery result: " + JSON.stringify(accountInfo),
    );
  };
  const hedera_signAndExecuteTransaction = async () => {
    const walletProvider = getwalletProvider();

    const accountId = address!;
    const hbarAmount = new Hbar(Number(1));
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount);

    const result = await walletProvider.hedera_signAndExecuteTransaction({
      signerAccountId: "hedera:testnet:" + accountId,
      transactionList: transactionToBase64String(transaction),
    });
    window.alert("Transaction Id: " + result.transactionId);
    sendTxId(result.transactionId);
  };

  // --- EIP-155 ---

  // function to send a tx
  const eth_sendTransaction = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);

    const tx = await signer.sendTransaction({
      to: testEthReceiver,
      value: parseEther("1"), // 1 Hbar
      gasLimit: 1_000_000,
    });
    window.alert("Transaction hash: " + tx.hash);
    sendHash(tx.hash);
  };

  // function to sing a msg
  const eth_signMessage = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);
    const sig = await signer?.signMessage("Hello Reown AppKit!");
    window.alert("Message signature: " + sig);
    sendSignMsg(sig);
  };



      // accountId: 0.0.4422825
      // pk: 0x2274ebff15443305e90fd5099e6a7d590c82f8985d4efc043cd5c51e32edee5a
      // inboxId : 0c5a3dbcbb3987d01b105d2be285053ce3526464f82804c31c940b461a7cbb31
      // EVM: 0x3bD4a856b5A90732d378B109b607354d4E7fE178

     // accountid: 0.0.1800
     // pk: 0xfe808e80a50ef654aeb1b3b3f4c0059f1c614a9973885e3d71bce9faf363135b
     // EVM: 0x7c589d7209a07981381251a264ea2053075821a3

     //await xmtpClient.conversations.newGroup([], { name: 'This is another group' })
    // ecc3b35fa0948c82bd57a1db78732030
/*
0xcb01cab55870cf25f08b9670fb98af0acf0dcf03
0x7c589d7209a07981381251a264ea2053075821a3
*/

  const eth_create_xmtp_client = async () => {
    if (xmtpClient) return;
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");
    const provider = new BrowserProvider(walletProvider, chainId);
    const signerJsonRPC = new JsonRpcSigner(provider, address);
    xmtpClient = new XMTPClient();
    await xmtpClient.createInstallation(signerJsonRPC);
    const key = await xmtpClient.getInstallationKey();
    if (key) {
      localStorage.setItem("installationKey", key);
      setEncriptionKey(key);
    }
    console.log('Key -> ', key);
  }

  const eth_xmtp_send_message = async (message: string) => {
    await getXMTPClient();
    if (xmtpClient) {
      const identifier =  await (xmtpClient.getClient()?.accountIdentifier());
      if (identifier) {
        console.log("🚀 ~ consteth_xmtp_send_message= ~ identifier:", identifier)
        const myAddress = identifier.identifier
        const address = myAddress == "0x7C589D7209a07981381251a264EA2053075821a3" ? "0x3bD4a856b5A90732d378B109b607354d4E7fE178" : "0x7c589d7209a07981381251a264ea2053075821a3";
        console.log("🚀 ~ consteth_xmtp_send_message= ~ myAddress:", myAddress);
        console.log("🚀 ~ consteth_xmtp_send_message= ~ address:", address);
        await xmtpClient.conversations.syncAll();
        await xmtpClient.conversations.sendMessage(message, undefined, address);
      }
    }
  };

  const eth_xmtp_send_message_to_conversations = async (message: string, conversationId: string) => {
    await getXMTPClient();
    if (xmtpClient) {
      if (conversationId) {
        await xmtpClient.conversations.syncAll();
        await xmtpClient.conversations.sendMessageByConversationId(message, conversationId);
      }
    }
  };

  const eth_list_xmtp_messages = async () => {
    await getXMTPClient();
    console.log("🚀 ~ consteth_list_xmtp_messages= ~ xmtpClient:", xmtpClient);

    if (xmtpClient) {
      const convos = await xmtpClient.conversations.getAll();
      console.log("🚀 ~ listMessages ~ convos:", convos);
      if (convos) {
        const convosWithMessages = await Promise.all(
          convos.map(async (c) => {
            const messages = await xmtpClient!.conversations.getMessages(c);
            console.log("convo", c)
            console.log("🚀 ~ convos.map ~ messages:", messages)
            return {
              id: c.id,
              messages: messages.map((msg) => { 
                if (typeof msg.content == "string") {
                  return msg.content 
                }
                return "No processed content"
              }),
            };
          })
        );
        setConversations(convosWithMessages);
      }
    }
  };
  
  /*
  const eth_createXmtpClient_2 = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signerJsonRPC = new JsonRpcSigner(provider, address);

    const signer: Signer = {
      getAddress: () => signerJsonRPC.getAddress(),
      signMessage: async (message: string) => {
        const signMessage = await signerJsonRPC.signMessage(message);
        return hexToBytes(signMessage as Hex);
      },
    };
    {
      "responses": [
          {
              "address": "0x7c589d7209a07981381251a264ea2053075821a3",
              "inboxId": "5bd8a579a5cf8ec1b3b8d3febe8d9be1f415df6aaecb1e867a5854a6378c56a1"
          }
      ]
  }
    // Recover the Key
    const recoveredKey = base64ToUint8Array("5tgwinfsYsaKMFld8GXhp3dqqzEWt8r39XxYgf1XyTU=");

    const xmtpClient = await XMTPClient.create(signer, recoveredKey, {
      env: 'dev',
      dbPath: './xmtp5.db3',
     })
    /*const canMessage = await xmtpClient.canMessage(['0x7c589d7209a07981381251a264ea2053075821a3'])
    console.log("🚀 ~ consteth_createXmtpClient= ~ canMessage:", canMessage)
    const conver = await xmtpClient.conversations.newDm('0x7c589d7209a07981381251a264ea2053075821a3');
    console.log("🚀 ~ consteth_createXmtpClient= ~ conver:", conver)
    await conver.send('Hello patri');
    await xmtpClient.conversations.syncAll();
   await xmtpClient.conversations.sync();
    const syncChats = await xmtpClient.conversations.list();
    console.log("🚀 ~ consteth_createXmtpClient= ~ syncChats:", syncChats)
    const groups = await xmtpClient.conversations.listGroups()
    console.log("🚀 ~ consteth_createXmtpClient= ~ groups:", groups)
   const firstGroup = groups[0]
    // await firstGroup.addMembers(['0x7c589d7209a07981381251a264ea2053075821a3'])
    console.log("🚀 ~ consteth_createXmtpClient= ~ groups:", groups)
    console.log("🚀 ~ consteth_createXmtpClient= ~ groups:", firstGroup.id)
    const messages = await firstGroup.messages()
    console.log("🚀 ~ consteth_createXmtpClient= ~ messages:", messages)
    // const syncChats = await xmtpClient.conversations.sync();
  }*/

  // function to sign a tx
  const eth_signTransaction = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);

    const txData = {
      to: testEthReceiver,
      value: parseEther("1"),
      gasLimit: 1_000_000,
    };
    const rawSignedTx = await signer.signTransaction(txData);

    window.alert("Signed transaction: " + rawSignedTx);
    // You might send this rawSignedTx back to your server or store it
    setSignedEthTx(rawSignedTx);
  };

  // send raw signed transaction
  const eth_sendRawTransaction = async () => {
    if (!signedEthTx) throw Error("No raw transaction found!");

    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    // Broadcast the raw signed transaction to the network
    const txHash = await provider.send("eth_sendRawTransaction", [signedEthTx]);

    window.alert("Transaction hash: " + txHash);
    setSignedEthTx(undefined);
    sendHash(txHash);
  };

  // function to sign typed data
  const eth_signTypedData = async () => {
    const walletProvider = getwalletProvider();
    if (!address) {
      throw Error("user is disconnected");
    }

    // Prepare Ethers signers
    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);

    // Sign typed data
    try {
      const domain = {
        name: "Reown AppKit",
        version: "1",
        chainId,
        verifyingContract: Wallet.createRandom().address, // example address
      };
      const signature = await signer.signTypedData(domain, types, message);
      window.alert("Typed data signature: " + signature);
      sendSignMsg(signature);
    } catch (err) {
      alert("Error signing typed data:" + err);
    }
  };

  // function to get the balance
  const eth_getBalance = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");
    const provider = new BrowserProvider(walletProvider, chainId);
    const balance = await provider.getBalance(address);
    const hbar = formatEther(balance);

    window.alert(`Balance: ${hbar}ℏ`);
    sendBalance(`${hbar}ℏ`);
  };

  return (
    <div>
      <div className="appkit-buttons">
        <appkit-button />
        {isConnected && (
          <>
            <appkit-network-button />
            <button onClick={handleDisconnect}>Disconnect</button>
          </>
        )}
      </div>
      {isConnected ? (
        <>
          {activeChain == "eip155" && (
            <>
              <div>
                <br />
                <strong>EIP-155 Methods:</strong>
              </div>
              <div>
                <button onClick={eth_getBalance}>eth_getBalance</button>
                <button onClick={eth_signMessage}>eth_signMessage</button>
                <button onClick={eth_signTransaction}>
                  eth_signTransaction
                </button>
                <button
                  onClick={eth_sendRawTransaction}
                  disabled={!signedEthTx}
                  title="Call eth_signTransaction first"
                >
                  eth_sendRawTransaction
                </button>
                <button onClick={eth_sendTransaction}>
                  eth_sendTransaction
                </button>
                <button onClick={eth_signTypedData}>eth_signTypedData</button>
                <div> installation key: {encriptionKey} </div>
                <button onClick={eth_create_xmtp_client}>Create client</button>
                <input
                  type="text"
                  value={message2}
                  onChange={(e) => setMessage2(e.target.value)}
                  placeholder="Enter your message"
                />
                <button onClick={() => eth_xmtp_send_message(message2)}>XMTP Send Message</button>
                <input
                  type="text"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="Enter your conversationId"
                />
                <button onClick={() => eth_xmtp_send_message_to_conversations(message2, conversationId)}>XMPT send message to conversations</button>
                <button onClick={xmpt_create_group}>XMTP Create group</button>
                <button onClick={xmpt_get_groups}>XMTP GET group</button>
                <button onClick={xmpt_get_members}>XMTP GET group members</button>
                <button onClick={xmtp_send_message_to_group}>XMTP send message to group</button>
                <button onClick={eth_list_xmtp_messages}>XMTP Get messages</button>
              </div>
              <div>
                <h2>Conversations</h2>
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="conversation">
                    <h3>Conversation ID: {conversation.id}</h3>
                    <div className="messages">
                      {conversation.messages.map((message, index) => (
                        <div key={index} className="message">
                          {typeof message === "string" ? message : JSON.stringify(message)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}
          {activeChain == hederaNamespace && (
            <>
              <div>
                <br />
                <strong>HIP-820 Methods:</strong>
              </div>
              <div>
                <button onClick={hedera_getNodeAddresses}>
                  hedera_getNodeAddresses
                </button>
                <button onClick={hedera_signMessage}>hedera_signMessage</button>
                <button onClick={hedera_signTransaction}>
                  hedera_signTransaction
                </button>
                <button
                  onClick={hedera_executeTransaction}
                  disabled={!signedHederaTx}
                  title="Call hedera_signTransaction first"
                >
                  hedera_executeTransaction
                </button>
                <button onClick={hedera_signAndExecuteQuery}>
                  hedera_signAndExecuteQuery
                </button>
                <button onClick={hedera_signAndExecuteTransaction}>
                  hedera_signAndExecuteTransaction
                </button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
};
