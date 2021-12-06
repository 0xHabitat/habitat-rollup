import { ethers } from 'ethers';
import { inflateRawSync } from 'zlib';
import nacl from 'tweetnacl';

import { fetch, fetchJson } from './utils.mjs';

const ROLLUP_ABI = [
  'event ClaimUsername(address indexed account, bytes32 indexed shortString)',
  'event ClaimedStakingReward(address indexed account, address indexed token, uint256 indexed epoch, uint256 amount)',
  'event CommunityCreated(address indexed governanceToken, bytes32 indexed communityId)',
  'event DelegatedAmount(address indexed account, address indexed delegatee, address indexed token, uint256 value)',
  'event DelegateeVotedOnProposal(address indexed account, bytes32 indexed proposalId, uint8 signalStrength, uint256 shares)',
  'event Deposit(address owner, address token, uint256 value, uint256 tokenType)',
  'event MetadataUpdated(uint256 indexed topic, bytes metadata)',
  'event ModuleRegistered(address indexed contractAddress, bytes metadata)',
  'event ProposalCreated(address indexed vault, bytes32 indexed proposalId, uint256 startDate)',
  'event ProposalProcessed(bytes32 indexed proposalId, uint256 indexed votingStatus)',
  'event RollupUpgrade(address target)',
  'event TokenTransfer(address indexed token, address indexed from, address indexed to, uint256 value, uint256 epoch)',
  'event VaultCreated(bytes32 indexed communityId, address indexed condition, address indexed vaultAddress)',
  'event VirtualERC20Created(address indexed account, address indexed token)',
  'event VotedOnProposal(address indexed account, bytes32 indexed proposalId, uint8 signalStrength, uint256 shares)',
  'event Withdraw(address owner, address token, uint256 value)',
];
const DISCORD_API = 'https://discord.com/api/v9/';
const {
  L2_RPC_URL,
  DISCORD_APPLICATION_ID,
  DISCORD_PUBLIC_KEY,
  DISCORD_TOKEN,
  DISCORD_STORAGE_CHANNEL_ID,
} = process.env;
const PUBKEY = Buffer.from(DISCORD_PUBLIC_KEY || '', 'hex');
const HEADERS = {
  'content-type': 'application/json',
  authorization: DISCORD_TOKEN
};
const COMMANDS = JSON.stringify([
  {
    type: 1,
    name: 'subscribe_treasury',
    description: 'Subscribe to new Proposals for a Treasury',
    options: [
      {
        type: 3,
        name: 'treasury_address',
        description: 'The address of the treasury',
        required: true,
      },
    ],
  },
]);
const HIT_CACHE = Object.create(null);
const VAULT_NAMES = {};
const TASKS = [];

const rollupInterface = new ethers.utils.Interface(ROLLUP_ABI);
let botId;

async function getMessages (channelId, before = '') {
  let args = '';
  if (before) {
    args = '?before=' + before;
  }
  const resp = JSON.parse(await fetch(DISCORD_API + '/channels/' + channelId + '/messages' + args, HEADERS));
  return resp;
}

async function postMessage (channelId, { content, title, description, url }) {
  const payload = {
    content,
    embeds: [
      {
        title,
        description,
        url,
      },
    ]
  };
  const resp = JSON.parse(await fetch(DISCORD_API + '/channels/' + channelId + '/messages', HEADERS, JSON.stringify(payload)));
  if (!resp.embeds) {
    throw new Error(resp.message);
  }

  // sleep
  await new Promise(resolve => setTimeout(resolve, 1000));
  return resp;
}

function parseMetadata (str) {
  try {
    const bytes = ethers.utils.arrayify(str);
    if (bytes[0] !== 123) {
      const json = inflateRawSync(bytes);
      return JSON.parse(json);
    } else {
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(bytes));
    }
  } catch (e) {
    console.error(e);
    return {};
  }
}

function remapValues (v) {
  return v.map(e => '0x' + e.replace('0x', '').padStart(64, '0'));
}

async function fetchVaults (vaults) {
  const topics = remapValues(vaults);
  const filter = {
    topics: [rollupInterface.getEventTopic('VaultCreated'), null, null, topics],
    toBlock: 1,
    includeTx: true,
  }

  const logs = await fetchJson(L2_RPC_URL, 'eth_getLogs', [filter]);
  for (const log of logs) {
    const metadata = parseMetadata(log.transaction.message.metadata);
    VAULT_NAMES[log.topics[3]] = metadata.title || '<unknown treasury>';
  }
}

const dateTimeFormat = new Intl.DateTimeFormat([], { dateStyle: 'short', timeStyle: 'long' });
async function fetchProposals (channelId, vaults) {
  const topics = remapValues(vaults);
  const filter = {
    topics: [rollupInterface.getEventTopic('ProposalCreated'), topics],
    fromBlock: 1,
    includeTx: true,
  }

  const logs = await fetchJson(L2_RPC_URL, 'eth_getLogs', [filter]);
  for (const log of logs) {
    const url = 'https://0xhabitat.org/app/#habitat-proposal,' + log.transactionHash;
    const key = channelId + url;
    if (HIT_CACHE[key]) {
      console.log('skipping', key);
      continue;
    }

    const vaultName = VAULT_NAMES[log.topics[1]];
    const startDate = dateTimeFormat.format(log.transaction.message.startDate * 1000);
    const description = `Opens on ${startDate}`;
    const metadata = parseMetadata(log.transaction.message.metadata);
    const title = metadata.title || '<no title>';
    const content = `New Proposal for ${vaultName}`;
    const ret = await postMessage(channelId, { content, title, description, url });
    HIT_CACHE[key] = ret.id || '1';
  }
}

function buildMessage (str) {
  return {
    type: 4,
    data: {
      content: str,
    },
  };
}

async function storeTask (obj) {
  console.log('store', obj);

  for (const task of TASKS) {
    let equal = true;
    for (const key in obj) {
      if (obj[key] !== task[key]) {
        equal = false;
        break;
      }
    }

    if (equal) {
      console.log('duplicate task', obj);
      return false;
    }
  }

  const payload = {
    content: JSON.stringify(obj),
  };
  const resp = JSON.parse(await fetch(DISCORD_API + '/channels/' + DISCORD_STORAGE_CHANNEL_ID + '/messages', HEADERS, JSON.stringify(payload)));
  if (!resp.embeds) {
    throw new Error(resp.message);
  }
  TASKS.push(obj);

  // sleep
  await new Promise(resolve => setTimeout(resolve, 1000));

  return true;
}

const SLASH_HANDLERS = Object.create(null);
SLASH_HANDLERS['subscribe_treasury'] = async function subscribeTreasury (channelId, options) {
  const treasuryAddress = options[0].value;
  if (!ethers.utils.isAddress(treasuryAddress)) {
    return buildMessage('invalid address');
  }

  const success = await storeTask({ handler: 'subscribe_treasury', channelId, treasuryAddress: treasuryAddress.toLowerCase() });

  return buildMessage(success ? 'success' : 'already subscribed');
}

export async function handleRequest (args, message, body, headers) {
  {
    const signature = Buffer.from(headers['x-signature-ed25519'] || '', 'hex');
    const timestamp = headers['x-signature-timestamp'] || '';
    const data = Buffer.from(timestamp + body);
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      PUBKEY
    );
    if (!isVerified) {
      throw new Error('invalid signature');
    }
  }

  if (message.type === 1) {
    // ACK
    return { type: 1 };
  }

  if (message.type === 2) {
    const name = message.data.name;
    const func = SLASH_HANDLERS[name];
    if (func) {
      return await func(message.channel_id, message.data.options);
    }
  }

  return buildMessage('invalid command');
}

async function checkChannel (channelId) {
  let messages = await getMessages(channelId);

  while (messages.length) {
    for (const message of messages) {
      if (message.author.id !== botId) {
        continue;
      }

      const embedded = message.embeds[0];
      if (!embedded || !embedded.url) {
        continue;
      }

      const key = channelId + embedded.url;

      if (HIT_CACHE[key]) {
        return;
      }

      HIT_CACHE[key] = message.id || '1';
    }
    if (messages.length) {
      messages = await getMessages(channelId, messages[messages.length - 1].id);
    }
  }
}

const PROC_HANDLERS = Object.create(null);
PROC_HANDLERS['subscribe_treasury'] = async function ({ channelId, treasuryAddress }) {
  const vaults = [treasuryAddress];

  await checkChannel(channelId);
  await fetchVaults(vaults);
  await fetchProposals(channelId, vaults);
}

async function doWork () {
  try {
    for (const obj of TASKS) {
      console.log('work', obj);

      try {
        await PROC_HANDLERS[obj.handler](obj);
      } catch (e) {
        console.error(e);
      }
    }
  } catch (e) {
    console.error(e);
  }

  setTimeout(doWork, 30000);
}

async function init () {
  if (!DISCORD_TOKEN) {
    return;
  }

  botId = JSON.parse(await fetch(DISCORD_API + '/users/@me', HEADERS)).id;
  {
    // register commands
    const resp = JSON.parse(await fetch(DISCORD_API + '/applications/' + DISCORD_APPLICATION_ID + '/commands', HEADERS, COMMANDS, 'PUT'));
    // TODO: check for errors
  }

  // load tasks
  let messages = await getMessages(DISCORD_STORAGE_CHANNEL_ID);
  while (messages.length) {
    for (const message of messages) {
      if (message.author.id !== botId) {
        continue;
      }
      const obj = JSON.parse(message.content);
      obj.id = message.id;
      TASKS.push(obj);
    }

    if (messages.length) {
      messages = await getMessages(DISCORD_STORAGE_CHANNEL_ID, messages[messages.length - 1].id);
    }
  }

  doWork();
}

init();
