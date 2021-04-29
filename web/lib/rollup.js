import NETWORKS from './rollup-config.js';
import { BRICK_ABI, EXECUTION_PROXY_ABI, TYPED_DATA } from './constants.js';
import {
  getSigner,
  getProvider,
  getErc20,
  getTokenSymbol,
  walletIsConnected,
  secondsToString,
  renderAddress,
  getCache,
  setCache,
} from './utils.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

const ROOT_CHAIN_ID = window.location.hostname.indexOf('localhost') === -1 ? 3 : 99;
const { RPC_URL, EXECUTION_PROXY_ADDRESS } = NETWORKS[ROOT_CHAIN_ID];

export async function getProviders () {
  if (document._providers) {
    return document._providers;
  }

  const childProvider = new ethers.providers.JsonRpcProvider(RPC_URL, 'any');
  const network = await childProvider.detectNetwork();
  childProvider.detectNetwork = async () => network;

  const rootProvider = await getProvider(network.chainId);
  const bridgeAddress = await childProvider.send('web3_clientVersion', []);
  const habitat = new ethers.Contract(bridgeAddress, BRICK_ABI, childProvider);
  const bridge = habitat.connect(rootProvider);

  document._providers = { rootProvider, childProvider, habitat, bridge };

  return document._providers;
}

export async function simulateTransaction (primaryType, _message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();
  const message = Object.assign({}, _message);

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.txNonces(signerAddress)).toHexString();
  }

  return await habitat.provider.send('eth_call', [{ from: signerAddress, primaryType, message }]);
}

export async function sendTransaction (primaryType, message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.txNonces(signerAddress)).toHexString();
  }

  const callResult = await habitat.provider.send('eth_call', [{ from: signerAddress, primaryType, message }]);
  const errorSig = '0x08c379a0';

  if (callResult.startsWith(errorSig)) {
    const errMsg = ethers.utils.defaultAbiCoder.decode(['string'], callResult.replace(errorSig, '0x'));
    throw new Error(`calling contract: ${errMsg}`);
  }
  console.log({ callResult });

  const tx = Object.assign({ message, primaryType }, TYPED_DATA);
  const sig = await signer.provider.send('eth_signTypedData_v3', [signerAddress, JSON.stringify(tx)]);
  const { r, s, v } = ethers.utils.splitSignature(sig);
  const txHash = await habitat.provider.send('eth_sendRawTransaction', [{ primaryType, message, r, s, v }]);
  const receipt = await habitat.provider.getTransactionReceipt(txHash);

  console.log({ receipt });
  if (receipt.status === 0) {
    throw new Error('transaction reverted');
  }

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

export async function executeProposalActions (proposalIndex, actions) {
  const signer = await getSigner();
  const execProxy = new ethers.Contract(EXECUTION_PROXY_ADDRESS, EXECUTION_PROXY_ABI, signer);

  console.log({ proposalIndex, actions });
  return execProxy.execute(proposalIndex, actions);
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
    'reserved',
    'token transfer',
    'update metadata',
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

export function formatString (val, expandable) {
  const str = val === undefined ? 'undefined' : val.toString();
  const child = document.createElement('p');
  child.textContent = str;

  if (expandable) {
    child.className = 'collapsed';
    child.addEventListener(
      'click',
      function (evt) {
        if (evt.target !== child) {
          return;
        }

        if (this.className.indexOf('collapsed') !== -1) {
          this.className = this.className.replace('collapsed', 'expanded');
        } else {
          this.className = this.className.replace('expanded', 'collapsed');
        }
      },
      false
    );
  }

  return child;
}

export function formatObject (obj, href) {
  const child = document.createElement('div');

  for (const key in obj) {
    const value = obj[key];
    const heading = document.createElement('kv');

    heading.className = 'sub';
    heading.id = key;
    heading.appendChild(formatString(key, false));

    const v = formatString(typeof value === 'string' ? value : JSON.stringify(value, null, 2), false);

    heading.appendChild(v);
    child.appendChild(heading);
  }

  if (href) {
    const wrapper = document.createElement('div');
    const link = document.createElement('a');
    link.className = 'button';
    link.href = href;
    link.textContent = '👉 View';
    wrapper.appendChild(link);
    child.appendChild(wrapper);
  }

  return child;
}

export function computeVotePercentages (proposal, totalShares) {
  // TODO: use bignumber/bigint
  const y = Number(proposal.yesVotes);
  const n = Number(proposal.noVotes);
  const total = y + n;
  const nTotalShares = Number(totalShares);
  let yay = 0;
  let nay = 0;
  let participationRate = 0;

  if (total > 0) {
    yay = y / total;
    nay = n / total;
  }

  if (nTotalShares > 0) {
    participationRate = total / nTotalShares;
  }

  return { yay, nay, participationRate };
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

export function humanProposalTime (startDate) {
  const now = ~~(Date.now() / 1000);
  if (startDate >= now) {
    return `starts in ${secondsToString(startDate - now)}`;
  }
  return `open since ${secondsToString(now - startDate)}`;
}

export async function doQueryWithOptions (options, name, ...args) {
  const { habitat } = await getProviders();
  const filter = habitat.filters[name](...args);
  // xxx: because deposit transaction don't match the message format yet
  filter.address = null;
  Object.assign(filter, options);

  return await habitat.provider.send('eth_getLogs', [filter]);
}

export async function doQuery (name, ...args) {
  return doQueryWithOptions({ fromBlock: 1 }, name, ...args);
}

export async function doQueryByPrimaryTypes (primaryTypes) {
  const { habitat } = await getProviders();
  const filter = {
    fromBlock: 1,
    primaryTypes,
  };

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
      username = ethers.utils.toUtf8String(logs[logs.length - 1].topics[2]);
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
    const evt = habitat.interface.parseLog(logs[logs.length - 1]);
    return evt.args.account;
  }
}

export async function setupModulelist () {
  if (document.querySelector('datalist#modulelist')) {
    return;
  }

  const modules = [];
  // query transactions with the `SubmitModule` type
  for (const tx of await doQueryByPrimaryTypes(['SubmitModule'])) {
    try {
      const { contractAddress, metadata } = tx.message;
      const meta = JSON.parse(metadata);

      modules.push({ name: meta.name || '<unknown>', address: contractAddress });
    } catch (e) {
      console.warn(e);
      // skip
      continue;
    }
  }

  const datalist = document.createElement('datalist');
  for (const module of modules) {
    const opt = document.createElement('option');
    opt.value = `${module.name} @ ${module.address}`;
    datalist.appendChild(opt);
  }

  datalist.id = 'modulelist';
  document.body.appendChild(datalist);
}

export async function fetchProposalStats ({ proposalId, communityId }) {
  const { habitat } = await getProviders();
  const governanceToken = await habitat.tokenOfCommunity(communityId);
  const erc20 = await getErc20(governanceToken);
  const tokenSymbol = await getTokenSymbol(governanceToken);
  const signals = {};
  for (const log of await doQuery('VotedOnProposal', null, proposalId)) {
    const { account, signalStrength } = habitat.interface.parseLog(log).args;
    signals[account] = signalStrength;
  }
  let defaultSliderValue = 50;

  // statistics
  const numSignals = Object.keys(signals).length;
  let cumulativeSignals = 0;
  for (const k in signals) {
    cumulativeSignals += signals[k];
  }

  console.log({cumulativeSignals,numSignals});
  const signalStrength = cumulativeSignals / numSignals;
  const totalVotes = Number(await habitat.getVoteCount(proposalId));
  const totalShares = ethers.utils.formatUnits(await habitat.getTotalVotingShares(proposalId), erc20._decimals);
  const totalMembers = Number(await habitat.getTotalMemberCount(communityId));
  const participationRate = (totalVotes / totalMembers) * 100;
  const proposalStatus = await habitat.getProposalStatus(proposalId);
  console.log({totalVotes, totalShares});

  let userShares = ethers.BigNumber.from(0);
  let userSignal = 0;
  if (walletIsConnected()) {
    const signer = await getSigner();
    const account = await signer.getAddress();
    const userVote = await habitat.getVote(proposalId, account);

    if (userVote.gt(0)) {
      userShares = ethers.utils.formatUnits(userVote, erc20._decimals);
      userSignal = signals[account];
      if (userSignal) {
        defaultSliderValue = userSignal;
      }
    }
  }

  return {
    totalVotes,
    totalShares,
    totalMembers,
    participationRate,
    defaultSliderValue,
    signals,
    signalStrength,
    userShares,
    userSignal,
    tokenSymbol,
    proposalStatus,
  };
}

export async function submitVote (communityId, proposalId, signalStrength) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const governanceToken = await habitat.tokenOfCommunity(communityId);
  const balance = await habitat.getErc20Balance(governanceToken, account);
  const shares = balance.div(100).mul(signalStrength).toHexString();
  const timestamp = ~~(Date.now() / 1000);
  const args = {
    proposalId,
    shares,
    timestamp,
    signalStrength,
    // xxx
    delegatedFor: ethers.constants.AddressZero,
  };

  return sendTransaction('VoteOnProposal', args);
}

export async function getCommunityInformation (communityId) {
  // xxx
  const { habitat } = await getProviders();
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'CommunityCreated', null, communityId);
  const evt = habitat.interface.parseLog(logs[logs.length - 1]);
  const metadata = JSON.parse(evt.args.metadata);

  return Object.assign(metadata, { communityId: evt.args.communityId, governanceToken: evt.args.governanceToken });
}

export async function getTreasuryInformation (vaultAddress) {
  // xxx
  const { habitat } = await getProviders();
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'VaultCreated', null, null, vaultAddress);
  const evt = habitat.interface.parseLog(logs[logs.length - 1]);
  const metadata = JSON.parse(evt.args.metadata);

  return Object.assign(metadata, { });
}

export async function getProposalInformation (txHash) {
  // xxx
  const { habitat } = await getProviders();
  const tx = await habitat.provider.send('eth_getTransactionByHash', [txHash]);
  const receipt = await getReceipt(txHash);
  const evt = receipt.events[0];
  const proposalId = evt.args.proposalId;
  const startDate = evt.args.startDate;
  const vaultAddress = evt.args.vault;
  const communityId = await habitat.communityOfVault(vaultAddress);
  let title = '???';
  try {
    const obj = JSON.parse(tx.message.metadata);
    title = obj.title || title;
  } catch (e) {
    console.warn(e);
  }

  return { title, proposalId, startDate, vaultAddress, communityId };
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

  return ret;
}

export const VotingStatus = {
  UNKNOWN: 0,
  OPEN: 1,
  CLOSED: 2,
  PASSED: 3,
}

const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';

export async function getErc20Exit (tokenAddr, accountAddr) {
  const { bridge } = await getProviders();
  return bridge.getERC20Exit(tokenAddr, accountAddr, { from: ADDRESS_ONE });
}

export async function getExitStatus (tokenAddr, accountAddr) {
  // query transfer to zero from finalizedBlock + 1 - latest
  const { habitat, bridge } = await getProviders();
  const pending = Number(await bridge.finalizedHeight()) + 1;
  const filter = habitat.filters.TokenTransfer(tokenAddr, accountAddr, ethers.constants.AddressZero);
  filter.fromBlock = pending;

  let pendingAmount = ethers.BigNumber.from(0);
  const logs = await habitat.provider.send('eth_getLogs', [filter]);
  for (const log of logs) {
    const evt = habitat.interface.parseLog(log);
    pendingAmount = pendingAmount.add(evt.args.value);
  }

  const availableAmount = await getErc20Exit(tokenAddr, accountAddr);
  return { pendingAmount, availableAmount };
}

export function getBlockExplorerLink (txHash) {
  const pre = window.location.pathname.indexOf('testnet') === -1 ? 'mainnet' : 'testnet';
  return `/${pre}/explorer/tx/#${txHash}`;
}

export async function queryTransfers (account) {
  const { habitat } = await getProviders();
  // to
  let logs = await doQuery('TokenTransfer', null, null, account);
  // from
  logs = logs.concat(await doQuery('TokenTransfer', null, account));
  // sort
  logs = logs.sort((a, b) => b.blockNumber - a.blockNumber);
  // todo sort and filter
  const tokens = [];
  const transfers = [];

  for (const log of logs) {
    const evt = habitat.interface.parseLog(log);
    const { token, from, to, value } = evt.args;
    const isDeposit = from === ethers.constants.AddressZero;
    const isIncoming = to === account;
    if (tokens.indexOf(token) === -1) {
      tokens.push(token);
    }
    if (transfers.findIndex((e) => e.transactionHash === log.transactionHash) === -1) {
      transfers.push(Object.assign({ token, from, to, value }, { transactionHash: log.transactionHash }));
    }
  }

  return { tokens, transfers: transfers.reverse() };
}

export async function fetchModuleInformation (_condition) {
  // query transactions with the `SubmitModule` type
  // xxx filter only by `condition`
  const condition = _condition.toLowerCase();
  for (const tx of await doQueryByPrimaryTypes(['SubmitModule'])) {
    if (tx.message.contractAddress.toLowerCase() === condition) {
      return JSON.parse(tx.message.metadata);
    }
  }
}

export async function fetchVaultInformation (vaultAddress) {
  const { habitat } = await getProviders();
  const filter = habitat.filters.VaultCreated(null, null, vaultAddress);
  // xxx: because deposit transaction don't match the message format yet
  filter.address = null;
  filter.fromBlock = 1;

  const logs = await habitat.provider.send('eth_getLogs', [filter]);
  if (!logs.length) {
    // no information
    return;
  }

  const event = habitat.interface.parseLog(logs[logs.length - 1]);
  const ret = {};
  try {
    const metadata = JSON.parse(event.args.metadata);
    ret.name = metadata.title || '???';
  } catch (e) {
    console.warn(e);
  }

  return ret;
}

export async function simulateProcessProposal ({ proposalId, internalActions, externalActions }) {
  let votingStatus = VotingStatus.UNKNOWN;
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

    votingStatus = Number(ret) || VotingStatus.UNKNOWN;
  } catch (e) {
    console.warn(e);
  }

  return votingStatus;
}

export function getDeployCode (codeStr) {
  let ret = codeStr;
  // cut after the last match of the INVALID opcode
  const i = ret.lastIndexOf('fe');
  if (i !== -1) {
    ret = ret.substring(0, i + 2);
  }

  // PUSH1 11;
  // CODESIZE;
  // SUB;
  // DUP1;
  // PUSH1 11;
  // RETURNDATASIZE;
  // CODECOPY;
  // RETURNDATASIZE;
  // RETURN;
  const DEPLOY_CODE = '0x600b380380600b3d393df3';
  return ret.replace('0x', DEPLOY_CODE);
}

export async function deployModule (deployedBytecode) {
  const bytecode = getDeployCode(deployedBytecode);
  const signer = await getSigner();
  const _factory = new ethers.ContractFactory([], bytecode, signer);
  const contract = await _factory.deploy();

  await contract.deployTransaction.wait();

  return contract;
}
