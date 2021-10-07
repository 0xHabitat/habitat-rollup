import BRICK_ABI from './HabitatAbi.js';
import EXECUTION_PROXY_ABI from './ExecutionProxyAbi.js';
import TYPED_DATA from './typedData.js';
import {
  getConfig,
  getSigner,
  getProvider,
  getTokenV2,
  walletIsConnected,
  secondsToString,
  renderAddress,
  getCache,
  setCache,
  _addToTokenCache,
  RPC_CORS_HEADER_FIX
} from './utils.js';
import { L2_RPC_URL, ROOT_CHAIN_ID } from './config.js';
import { ROLLUP_ERROR_MESSAGES } from './messages.js';

import { ethers } from '/lib/extern/ethers.esm.min.js';
import { deflateRaw, inflateRaw } from '/lib/extern/pako.esm.js';

const { EVOLUTION_ENDPOINT, EXECUTION_PROXY_ADDRESS, VERC_FACTORY_ADDRESS } = getConfig();

export const VERC_FACTORY_ABI = [
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Erc20Created(address indexed proxy)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function allowance(address account, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function approveAndCall(address to, uint256 amount, bytes data) returns (bytes)',
  'function balanceOf(address account) view returns (uint256)',
  'function createProxy(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, bytes32 _domainSeparator) returns (address addr)',
  'function decimals() view returns (uint8)',
  'function getMetadata() pure returns (string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, bytes32 _domainSeparator)',
  'function init(address _initialOwner)',
  'function name() view returns (string)',
  'function nonces(address account) view returns (uint256)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function recoverLostTokens(address token)',
  'function redeemPermitAndCall(address to, bytes permitData, bytes data) returns (bytes)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferAndCall(address to, uint256 amount, bytes data) returns (bytes)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

export async function fetchJson (url, payload) {
  const ret = await fetch(url, { method: payload ? 'POST' : 'GET', body: JSON.stringify(payload) });
  return ret.json();
}

export async function getProviders () {
  if (document._rollupProviders) {
    return document._rollupProviders;
  }

  const childProvider = new ethers.providers.JsonRpcProvider({ url: L2_RPC_URL, headers: RPC_CORS_HEADER_FIX }, 'any');
  const network = await childProvider.detectNetwork();
  childProvider.detectNetwork = async () => network;

  const rootProvider = await getProvider(network.chainId);
  const bridgeAddress = await childProvider.send('web3_clientVersion', []);
  const habitat = new ethers.Contract(bridgeAddress, BRICK_ABI, childProvider);
  const bridge = habitat.connect(rootProvider);

  document._rollupProviders = { rootProvider, childProvider, habitat, bridge };

  // update virtual token list
  await updateVERC();

  return document._rollupProviders;
}

export async function simulateTransaction (primaryType, _message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();
  const message = Object.assign({}, _message);

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.callStatic.txNonces(signerAddress)).toHexString();
  }

  return await habitat.provider.send('eth_call', [{ from: signerAddress, primaryType, message }]);
}

export function parseError (e) {
  if (e.error && e.error.message) {
    if (ROLLUP_ERROR_MESSAGES.hasOwnProperty(e.error.message)) {
      return ROLLUP_ERROR_MESSAGES[e.error.message];
    }
    return e.error.message;
  }

  return e.message || e.toString();
}

export async function sendTransaction (primaryType, message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.callStatic.txNonces(signerAddress)).toHexString();
  }

  let callResult;
  try {
    callResult = await habitat.provider.send('eth_call', [{ from: signerAddress, primaryType, message }]);
  } catch (e) {
    throw new Error(parseError(e));
  }
  const errorSig = '0x08c379a0';

  if (callResult.startsWith(errorSig)) {
    const errMsg = ethers.utils.defaultAbiCoder.decode(['string'], callResult.replace(errorSig, '0x'));
    throw new Error(`calling contract: ${errMsg}`);
  }
  console.log({ callResult });

  const tx = Object.assign({ message, primaryType }, TYPED_DATA);
  const sig = await signer.provider.send('eth_signTypedData_v4', [signerAddress, JSON.stringify(tx)]);
  const { r, s, v } = ethers.utils.splitSignature(sig);
  const operatorMessage = (await fetchJson(`${EVOLUTION_ENDPOINT}/submitTransaction/`, { primaryType, message, r, s, v }));
  if (operatorMessage.error) {
    throw new Error(parseError(operatorMessage));
  }
  const txHash = operatorMessage.result;
  const receipt = await habitat.provider.getTransactionReceipt(txHash);

  console.log({ receipt });
  if (receipt.status === 0) {
    throw new Error('transaction reverted');
  }

  receipt.events = [];

  for (const obj of receipt.logs) {
    try {
      receipt.events.push(Object.assign({ transactionHash: obj.transactionHash }, habitat.interface.parseLog(obj)));
    } catch (e) {
      console.warn(e);
    }
  }

  return receipt;
}

export async function signBatch (txs) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();
  let nonce = BigInt(await habitat.callStatic.txNonces(signerAddress));

  for (const tx of txs) {
    tx.message.nonce = '0x' + (nonce++).toString(16);
    await sendTransaction(tx.primaryType, tx.message);
  }
}

export async function getReceipt (txHash) {
  const { habitat } = await getProviders();
  const receipt = await habitat.provider.getTransactionReceipt(txHash);

  receipt.events = [];
  for (const obj of receipt.logs) {
    try {
      receipt.events.push(habitat.interface.parseLog(obj));
    } catch (e) {
      console.warn(e);
    }
  }

  return receipt;
}

export async function getExecutionProxyContract (addr = EXECUTION_PROXY_ADDRESS) {
  const { rootProvider } = await getProviders();

  return new ethers.Contract(addr, EXECUTION_PROXY_ABI, rootProvider);
}

export async function lookupExecProxyForVault (vaultAddress) {
  const factoryContract = await getExecutionProxyContract();
  const { habitat } = await getProviders();
  const filter = factoryContract.filters.ProxyCreated(habitat.address, vaultAddress);
  filter.fromBlock = '0x1';
  filter.toBlock = 'latest';
  const logs = await factoryContract.provider.send('eth_getLogs', [filter]);

  if (!logs.length) {
    return;
  }

  return factoryContract.interface.parseLog(logs[0]).args.proxy;
}

export async function executeProposalActions (vaultAddress, proposalId, actions) {
  const addr = await lookupExecProxyForVault(vaultAddress);
  if (!addr) {
    throw new Error('No Execution Proxy found for this Treasury.');
  }
  const execProxy = await getExecutionProxyContract(addr);
  const signer = await getSigner();

  return execProxy.connect(signer).execute(proposalId, actions);
}

export function encodeExternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const addr = ary[i++].replace('0x', '').padStart(64, '0');
    const data = ary[i++].replace('0x', '');
    const dataSize = (data.length / 2).toString(16).padStart(64, '0')

    res += addr + dataSize + data;
  }

  return res;
}

export function encodeInternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const type = ary[i++].replace('0x', '').padStart(2, '0');

    if (type === '01') {
      const token = ary[i++].replace('0x', '').padStart(40, '0');
      const receiver = ary[i++].replace('0x', '').padStart(40, '0');
      const value = ary[i++].replace('0x', '').padStart(64, '0');
      res += type + token + receiver + value;
      continue;
    }

    throw new Error('unsupported type');
  }

  return res;
}

export function decodeExternalProposalActions (hexString) {
  const res = [];

  for (let i = hexString[1] === 'x' ? 2 : 0, len = hexString.length; i < len;) {
    // 32 bytes address
    const addr = hexString.substring(i += 24, i += 40).padStart(40, '0');
    res.push('0x' + addr);

    // 32 bytes calldata size
    const dataSize = parseInt(hexString.substring(i, i += 64), 16);
    if (dataSize) {
      // calldata
      const data = hexString.substring(i, i += (dataSize * 2));
      res.push('0x' + data);
    } else {
      res.push('0x');
    }
  }

  return res;
}

export function decodeInternalProposalActions (hexString) {
  // xxx support all types
  const TYPES = [
    'Reserved',
    'Token Transfer',
    'Update Metadata',
  ];
  const res = [];
  for (let i = hexString[1] === 'x' ? 2 : 0, len = hexString.length; i < len;) {
    const type = TYPES[Number(hexString.substring(i, i += 2))] || 'invalid type';
    const obj = { type };

    if (type === TYPES[1]) {
      obj.token = '0x' + hexString.substring(i, i += 40);
      obj.receiver = '0x' + hexString.substring(i, i += 40);
      obj.value = '0x' + hexString.substring(i, i += 64);
    }

    res.push(obj);
  }

  return res;
}

export function encodeMetadata (obj) {
  const options = {
    //Z_BEST_COMPRESSION
    level: 9,
    memLevel: 9,
    strategy: 0,
  };
  return ethers.utils.hexlify(deflateRaw(JSON.stringify(obj), options));
}

export function decodeMetadata (str) {
  try {
    return JSON.parse(inflateRaw(ethers.utils.arrayify(str), { to: 'string' }));
  } catch (e) {
    console.error(e);
    return {};
  }
}

export async function* pullEvents (habitat, filter, blocks = 100) {
  if (filter.toBlock === 0) {
    return;
  }

  filter.fromBlock = filter.toBlock - blocks;

  if (filter.fromBlock < 1) {
    filter.fromBlock = 1;
  }

  const logs = await habitat.provider.send('eth_getLogs', [filter]);
  for (const log of logs.reverse()) {
    const evt = habitat.interface.parseLog(log);
    yield Object.assign(evt, { transactionHash: log.transactionHash });
  }
  filter.toBlock = filter.fromBlock - 1;
}

export async function doQueryWithOptions (options, name, ...args) {
  const key = _genKey(options, name, args);
  {
    const cacheResult = _getLogCache(key);
    if (cacheResult) {
      return cacheResult;
    }
  }

  function encode (v) {
    if (v == undefined) {
      return null;
    }
    return ethers.utils.hexZeroPad(ethers.utils.hexlify(v), 32);
  }

  const { habitat } = await getProviders();
  const filter = {};
  filter.topics = [habitat.interface.getEventTopic(name)];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      const ret = [];
      for (const x of arg) {
        ret.push(encode(x));
      }
      filter.topics.push(ret);
      continue;
    }
    filter.topics.push(encode(arg));
  }
  Object.assign(filter, options);

  const logs = await habitat.provider.send('eth_getLogs', [filter]);

  for (const log of logs) {
    log.args = habitat.interface.parseLog(log).args;
  }

  _setLogCache(key, logs);
  return logs;
}

export async function doQuery (name, ...args) {
  return doQueryWithOptions({ fromBlock: 1 }, name, ...args);
}

export async function doQueryCustom (filter) {
  const { habitat } = await getProviders();
  return await habitat.provider.send('eth_getLogs', [filter]);
}

export function getShortString (str) {
  const buf = ethers.utils.toUtf8Bytes(str);
  if (buf.length > 32) {
    throw new Error('name is too long');
  }
  return ethers.utils.hexlify(buf).padEnd(66, '0');
}

export async function getUsername (address, force = false) {
  let username = force ? '' : getCache(address);
  if (username) {
    return username;
  }

  const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'ClaimUsername', address);
  username = renderAddress(address);

  if (logs.length) {
    try {
      const tmp = ethers.utils.toUtf8String(logs[logs.length - 1].topics[2]).split('\u0000');
      while (tmp.length) {
        const str = tmp.pop();
        if (str) {
          username = str;
          break;
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  setCache(address, username);
  return username;
}

export async function resolveUsername (str) {
  // xxx returns the last claimer of str, address should be double checked
  const { habitat } = await getProviders();
  const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'ClaimUsername', null, getShortString(str));

  if (logs.length) {
    const evt = logs[logs.length - 1];
    return evt.args.account;
  }
}

export async function fetchProposalStats ({ proposalId, communityId }) {
  let proposalClosedBlockN = 0;
  let proposalClosedTxIndex = 0;
  {
    const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'ProposalProcessed', proposalId);
    if (logs.length) {
      const log = logs[0];

      proposalClosedBlockN = Number(log.blockNumber)
      proposalClosedTxIndex = Number(log.transactionIndex);
    }
  }
  const filterOptions = { fromBlock: 1, toBlock: proposalClosedBlockN || 0 };
  const { habitat } = await getProviders();
  const governanceToken = await habitat.callStatic.tokenOfCommunity(communityId);
  const token = await getTokenV2(governanceToken);
  const tokenSymbol = token.symbol;
  const signals = {};
  const votes = {};
  let totalVotes = 0;
  for (const log of await doQueryWithOptions(filterOptions, 'VotedOnProposal', null, proposalId)) {
    if (Number(log.blockNumber) === proposalClosedBlockN && Number(log.transactionIndex) >= proposalClosedTxIndex) {
      break;
    }

    const { account, signalStrength, shares } = log.args;
    if (signals[account] === undefined) {
      totalVotes++;
    }
    signals[account] = Number(signalStrength);
    votes[account] = shares;
  }
  const delegatedSignals = {};
  const delegatedVotes = {};
  for (const log of await doQueryWithOptions(filterOptions, 'DelegateeVotedOnProposal', null, proposalId)) {
    if (Number(log.blockNumber) === proposalClosedBlockN && Number(log.transactionIndex) >= proposalClosedTxIndex) {
      break;
    }

    const { account, signalStrength, shares } = log.args;
    if (delegatedSignals[account] === undefined) {
      totalVotes++;
    }
    delegatedSignals[account] = Number(signalStrength);
    delegatedVotes[account] = shares;
  }

  // statistics
  let cumulativeSignals = 0;
  for (const k in signals) {
    cumulativeSignals += signals[k];
  }
  for (const k in delegatedSignals) {
    cumulativeSignals += delegatedSignals[k];
  }

  let defaultSliderValue = 50;
  let userShares = ethers.BigNumber.from(0);
  let userSignal = 0;
  let userBalance = ethers.BigNumber.from(0);
  let delegatedUserShares = '0';
  let delegatedUserSignal = 0;
  if (walletIsConnected()) {
    const signer = await getSigner();
    const account = await signer.getAddress();
    const userVote = votes[account] || ethers.BigNumber.from(0);

    // xxx: take active voting stake into account
    userBalance = ethers.utils.formatUnits(await habitat.callStatic.getBalance(token.address, account), token.decimals);
    if (userVote.gt(0)) {
      userShares = ethers.utils.formatUnits(userVote, token.decimals);
      userSignal = signals[account];
      if (userSignal) {
        defaultSliderValue = userSignal;
      }
    }

    delegatedUserShares = ethers.utils.formatUnits(delegatedVotes[account] || ethers.BigNumber.from(0), token.decimals);
    delegatedUserSignal = delegatedSignals[account] || 0;
  }
  let totalYes = 0;
  let totalNo = 0;
  let totalYesShares = ethers.BigNumber.from(0);
  let totalNoShares = ethers.BigNumber.from(0);

  for (const { s, v } of [{ s: signals, v: votes }, { s: delegatedSignals, v: delegatedVotes }]) {
    for (const account in s) {
      const signal = s[account];
      const shares = v[account];

      if (signal > 50) {
        totalYes++;
        totalYesShares = totalYesShares.add(shares);
      } else {
        totalNo++;
        totalNoShares = totalNoShares.add(shares);
      }
    }
  }
  const totalShares = ethers.utils.formatUnits(totalYesShares.add(totalNoShares), token.decimals);
  totalYesShares = ethers.utils.formatUnits(totalYesShares, token.decimals);
  totalNoShares = ethers.utils.formatUnits(totalNoShares, token.decimals);

  const numSignals = Object.keys(signals).length + Object.keys(delegatedSignals).length;
  const signalStrength = numSignals > 0 ? cumulativeSignals / numSignals : 0;
  const totalMembers = Number(await habitat.callStatic.getTotalMemberCount(communityId));
  const participationRate = (totalVotes / totalMembers) * 100;
  const proposalStatus = Number(await habitat.callStatic.getProposalStatus(proposalId));
  const proposalStatusText = VOTING_STATUS_TEXT[proposalStatus] || `Number:${proposalStatus}`;

  return {
    token,
    totalVotes,
    totalShares,
    totalMembers,
    totalYes,
    totalYesShares,
    totalNo,
    totalNoShares,
    participationRate,
    defaultSliderValue,
    signals,
    signalStrength,
    votes,
    userShares,
    userSignal,
    tokenSymbol,
    proposalStatus,
    proposalStatusText,
    userBalance,
    governanceToken,
    delegatedSignals,
    delegatedVotes,
    delegatedUserShares,
    delegatedUserSignal,
  };
}

export async function submitVote (communityId, proposalId, signalStrength, _shares, delegatee) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const governanceToken = await habitat.callStatic.tokenOfCommunity(communityId);
  const token = await getTokenV2(governanceToken);
  const shares = ethers.utils.parseUnits(_shares.toString(), token.decimals).toHexString();
  const args = {
    proposalId,
    shares,
    signalStrength,
    // xxx
    delegatedFor: delegatee || ethers.constants.AddressZero,
  };

  return sendTransaction('VoteOnProposal', args);
}

export async function getMetadataForTopic (topic) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'MetadataUpdated', topic);
  if (!logs.length) {
    return {};
  }
  return decodeMetadata(logs[0].args.metadata);
}

export async function getCommunityInformation (communityId) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'CommunityCreated', null, communityId);
  const evt = logs[logs.length - 1];
  const metadata = await getMetadataForTopic(evt.args.communityId);

  return Object.assign(metadata, { communityId: evt.args.communityId, governanceToken: evt.args.governanceToken });
}

export async function getModuleInformation (vaultAddress) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'VaultCreated', null, null, vaultAddress);
  const evt = logs[logs.length - 1];
  const metadata = await fetchModuleInformation(evt.args.condition);

  metadata.flavor = metadata.flavor || 'binary';

  return metadata;
}

export async function getProposalInformation (txHash) {
  // xxx
  const { habitat } = await getProviders();
  const tx = await habitat.provider.send('eth_getTransactionByHash', [txHash]);
  const receipt = await getReceipt(txHash);
  const evt = receipt.events[0];
  const proposalId = evt.args.proposalId;
  const startDate = Number(evt.args.startDate);
  const vaultAddress = evt.args.vault;
  const communityId = await habitat.callStatic.communityOfVault(vaultAddress);
  let metadata = {};
  let title = '???';
  try {
    metadata = decodeMetadata(tx.message.metadata);
    title = metadata.title || title;
  } catch (e) {
    console.warn(e);
  }

  const link = `#habitat-proposal,${txHash}`;
  return { title, proposalId, startDate, vaultAddress, communityId, link, metadata, tx };
}

export async function resolveName (str) {
  let ret;

  try {
    ret = await resolveUsername(str);
  } catch (e) {}

  if (!ret) {
    try {
      const provider = await getProvider();
      ret = await provider.resolveName(str);
    } catch (e) {}
  }

  if (!ret) {
    throw new Error(`Unable to resolve "${str}"`);
  }

  return ret;
}

export const VotingStatus = {
  UNKNOWN: 0,
  OPEN: 1,
  CLOSED: 2,
  PASSED: 3,
};

const VOTING_STATUS_TEXT = [
  'Unknown',
  'Open',
  'Closed',
  'Passed',
];

const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';

export async function getErc20Exit (tokenAddr, accountAddr) {
  const { bridge } = await getProviders();
  return bridge.getERC20Exit(tokenAddr, accountAddr, { from: ADDRESS_ONE });
}

export async function getExitStatusV2 (tokenAddr, accountAddr) {
  const tmp = {};
  const { habitat, bridge } = await getProviders();
  const pending = Number(await bridge.finalizedHeight()) + 1;

  // query transfer to zero from finalizedBlock + 1 - latest
  for (const log of await doQueryWithOptions({ fromBlock: pending }, 'TokenTransfer', tokenAddr, accountAddr, ethers.constants.AddressZero)) {
    const obj = tmp[log.blockNumber];
    if (obj) {
      obj.value = obj.value.add(log.args.value);
    } else {
      const e = { value: log.args.value, finalityEstimate: 0 };
      tmp[log.blockNumber] = e;
    }
  }

  const blockNumbers = Object.keys(tmp);
  const estimates = await habitat.provider.send('rollup_estimateFinality', blockNumbers);
  const pendingAmounts = [];

  for (let i = 0, len = blockNumbers.length; i < len; i++) {
    const e = tmp[blockNumbers[i]];
    const estimate = estimates[i];
    e.finalityEstimate = estimate;
    pendingAmounts.push(e);
  }

  const availableAmount = await getErc20Exit(tokenAddr, accountAddr);
  return { pendingAmounts, availableAmount };
}

export function getBlockExplorerLink (txHash) {
  return `/explorer/tx/#${txHash}`;
}

export async function queryTransfers (account) {
  const { habitat } = await getProviders();
  const options = { toBlock: 1 };
  // to or from
  const logs = await doQueryWithOptions(options, 'TokenTransfer', null, [null, account], [null, account]);
  const tokens = [];
  const transfers = [];

  for (const log of logs) {
    const { token, from, to, value } = log.args;
    const isDeposit = from === ethers.constants.AddressZero;
    const isIncoming = to === account;
    if (tokens.indexOf(token) === -1) {
      tokens.push(token);
    }
    transfers.push(Object.assign({ token, from, to, value }, { transactionHash: log.transactionHash }));
  }

  return { tokens, transfers: transfers.reverse() };
}

export async function getTokensForAccount (account) {
  const ZERO = BigInt(0);
  const { habitat } = await getProviders();
  const options = { toBlock: 1 };
  // to or from
  const logs = await doQueryWithOptions(options, 'TokenTransfer', null, [null, account], [null, account]);
  const tokens = [];
  const tmp = {};

  for (const log of logs) {
    const { token } = log.args;
    if (tmp[token]) {
      continue;
    }
    tmp[token] = true;

    const balance = BigInt(await habitat.callStatic.getBalance(token, account));
    if (balance > ZERO) {
      tokens.push({ address: token, balance });
    }
  }

  return tokens;
}

export async function fetchModuleInformation (condition) {
  const logs = await doQueryWithOptions({ maxResults: 1, fromBlock: 1 }, 'ModuleRegistered', condition);

  if (!logs.length) {
    return {};
  }

  return decodeMetadata(logs[0].args.metadata);
}

export async function simulateProcessProposal ({ proposalId, internalActions, externalActions }) {
  let votingStatus = VotingStatus.UNKNOWN;
  // infinity
  let secondsTillClose = -1;
  let quorumPercent = 0;
  try {
    const { habitat } = await getProviders();
    const ret = await habitat.provider.send(
      'eth_call',
      [{
        from: ethers.constants.AddressZero,
        primaryType: 'ProcessProposal',
        message: { nonce: '0x0', proposalId, internalActions, externalActions }
      }]
    );

    votingStatus = Number(ret.substring(0, 66)) || VotingStatus.UNKNOWN;
    secondsTillClose = parseInt(ret.substring(66, 130), 16);
    if (secondsTillClose > Number.MAX_SAFE_INTEGER) {
      secondsTillClose = -1;
    }
    quorumPercent = parseInt(ret.substring(130, 194), 16);
  } catch (e) {
    console.warn(e);
  }

  return { votingStatus, secondsTillClose, quorumPercent, statusText: VOTING_STATUS_TEXT[votingStatus] || '?' };
}

// xxx: validation
export async function fetchIssue (url) {
  const issuePart = url.split('github.com/')[1];
  const apiUrl = `https://api.github.com/repos/${issuePart}`;
  const resp = await fetch(apiUrl, { headers: { accept: 'application/vnd.github.v3.full+json' }});
  const issue = await resp.json();

  return issue;
}

export async function renderLabels (labels, labelContainer) {
  labelContainer.innerHTML = '';
  for (const label of labels) {
    const tmp = document.createElement('p');
    tmp.textContent = label.name;
    tmp.style['border-color'] = `#${label.color}`;
    labelContainer.appendChild(tmp);
  }
}

export async function queryTransactionHashForProposal (proposalId) {
  const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'ProposalCreated', null, proposalId);
  return logs[logs.length - 1].transactionHash;
}

export async function fetchLatestVote (account, proposalId) {
  const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'VotedOnProposal', account, proposalId);
  const log = logs[logs.length - 1];

  return log.args;
}

export async function getTotalDelegatedAmountForToken (tokenAddr, account) {
  const logs = await doQueryWithOptions({ toBlock: 1 }, 'DelegatedAmount', account, null, tokenAddr);
  const map = {};
  let cumulative = ethers.BigNumber.from(0);

  for (const log of logs) {
    const { account, value } = log.args;
    if (map[account]) {
      continue;
    }
    map[account] = true;
    cumulative = cumulative.add(value);
  }

  return cumulative;
}

export async function getDelegatedAmountsForToken (governanceToken, delegatee) {
  const tmp = {};
  const { habitat } = await getProviders();
  let total = ethers.BigNumber.from(0);

  for (const log of await doQueryWithOptions({ toBlock: 1 }, 'DelegatedAmount', null, delegatee, governanceToken)) {
    const { account, value } = log.args;
    if (tmp[account]) {
      continue;
    }

    tmp[account] = true;
    total = total.add(value);
  }

  const used = await habitat.callStatic.getActiveDelegatedVotingStake(governanceToken, delegatee);
  const free = total.sub(used);

  return { total, free, used };
}

export async function getGasTank (account) {
  const { value, ratePerTx, remainingEstimate } = await fetchJson(`${EVOLUTION_ENDPOINT}/gasTank/${account}`);

  return {
    value: BigInt(value),
    ratePerTx: BigInt(ratePerTx),
    remainingEstimate: BigInt(remainingEstimate),
  };
}

export async function getStakedProposals () {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();

  async function fetch (delegated = false) {
    const txs = [];
    const logs = await doQueryWithOptions({ toBlock: 1 }, delegated ? 'DelegateeVotedOnProposal' : 'VotedOnProposal', account);
    const tmp = {};

    for (const log of logs) {
      const { proposalId, shares } = log.args;
      if (tmp[proposalId]) {
        continue;
      }
      tmp[proposalId] = true;

      if (shares.eq(0)) {
        continue;
      }

      txs.push(
        {
          info: `Remove ${delegated ? 'Delegated' : ''} Vote from ${renderAddress(proposalId)}`,
          primaryType: 'VoteOnProposal',
          message: {
            proposalId,
            shares: 0,
            signalStrength: 0,
            delegatedFor: delegated ? account : ethers.constants.AddressZero
          }
        }
      );
    }
    return txs;
  }

  return (await fetch()).concat(await fetch(true));
}

export async function scavengeProposals () {
  const { habitat } = await getProviders();
  const txs = await getStakedProposals();
  const stat = [];
  for (const obj of txs) {
    const proposalId = obj.message.proposalId;
    const v = Number(await habitat.callStatic.getProposalStatus(proposalId));
    stat.push(v > VotingStatus.OPEN);
  }

  return txs.filter((e, i) => stat[i]);
}

export async function getIssueLinkForVault (vaultAddr) {
  const DEFAULT = 'https://github.com/0xHabitat/improvements-and-bugs/issues/new/choose';
  if (!vaultAddr) {
    return DEFAULT;
  }

  const metadata = await getMetadataForTopic(vaultAddr);
  if (metadata.link) {
    const TAIL = '/issues/new/choose';
    if (metadata.link.startsWith('https://github.com/') && !metadata.link.endsWith(TAIL)) {
      return metadata.link + TAIL;
    }
    return metadata.link;
  }

  return DEFAULT;
}

export async function updateVERC () {
  const logs = await doQueryWithOptions({ fromBlock: 1, includeTx: true }, 'VirtualERC20Created');
  for (const log of logs) {
    const msg = log.transaction.message;
    const address = log.args[1].toLowerCase();

    if (msg.factoryAddress !== VERC_FACTORY_ADDRESS) {
      console.warn('VERC skip', msg);
      continue;
    }

    try {
      const [name, symbol, decimals, totalSupply, domainSeparator] = ethers.utils.defaultAbiCoder.decode(
        ['string', 'string', 'uint8', 'uint256', 'bytes32'],
        msg.args
      );
      // TODO add support
      const logoURI = '/lib/assets/icons/unknown.svg';
      _addToTokenCache({
        address,
        name,
        symbol,
        decimals,
        totalSupply,
        domainSeparator,
        logoURI,
        chainId: ROOT_CHAIN_ID,
        insecure: true,
      });
    } catch (e) {
      console.error(e);
      continue;
    }
  }
}

export function onChainUpdate (callback) {
  function onMessage (evt) {
    if (evt.source !== window) {
      window.addEventListener('message', onMessage, { once: true });
      return;
    }

    if (evt.data === 'chainUpdate') {
      callback();
    } else {
      window.addEventListener('message', onMessage, { once: true });
    }
  }

  window.addEventListener('message', onMessage, { once: true });
}

let _logCache = Object.create(null);

function _getLogCache (key) {
  return _logCache[key];
}

function _setLogCache (key, logs) {
  _logCache[key] = logs;
}

function _genKey (...args) {
  return window.btoa(JSON.stringify(args));
}

{
  let prevBlockN = 0;
  let prevTxs = 0;
  let prevAccountAddr;
  async function _chainUpdateCheck () {
    console.log('update check');
    const { childProvider } = await getProviders();
    const block = await childProvider.send('eth_getBlockByNumber', ['latest']);
    const blockN = Number(block.number);
    const nTxs = block.transactions.length;
    let accountAddr;
    if (walletIsConnected()) {
      accountAddr = await (await getSigner()).getAddress();
    }

    if (blockN !== prevBlockN || nTxs !== prevTxs || accountAddr !== prevAccountAddr) {
      console.log('chainUpdate');
      const skip = prevBlockN === 0 && !accountAddr;
      prevBlockN = blockN;
      prevTxs = nTxs;
      prevAccountAddr = accountAddr;
      await updateVERC();

      if (skip) {
        console.log('skipping first update');
        return;
      }

      _logCache = Object.create(null);
      window.postMessage('chainUpdate', window.location.origin);
    }
  }
  document._fakeUpdate = () => prevBlockN = 1;
  setInterval(_chainUpdateCheck, 3000);
}
