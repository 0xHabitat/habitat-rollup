import BRICK_ABI from './HabitatAbi.js';
import EXECUTION_PROXY_ABI from './ExecutionProxyAbi.js';
import TYPED_DATA from './typedData.js';
import {
  getConfig,
  getSigner,
  getProvider,
  getErc20,
  getToken,
  getTokenSymbol,
  walletIsConnected,
  secondsToString,
  renderAddress,
  getCache,
  setCache,
  RPC_CORS_HEADER_FIX
} from './utils.js';
import { L2_RPC_URL } from './config.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';
import { deflateRaw, inflateRaw } from '/lib/extern/pako.esm.js';

const { EVOLUTION_ENDPOINT, EXECUTION_PROXY_ADDRESS } = getConfig();

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

export async function sendTransaction (primaryType, message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.callStatic.txNonces(signerAddress)).toHexString();
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
  const txHash = (await fetchJson(`${EVOLUTION_ENDPOINT}/submitTransaction/`, { primaryType, message, r, s, v })).result;
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

  window.postMessage('chainUpdate', window.location.origin);
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
  const key = _genKey(options, name, args);
  {
    const cacheResult = _getLogCache(key);
    if (cacheResult) {
      return cacheResult;
    }
  }

  const { habitat } = await getProviders();
  const filter = habitat.filters[name](...args);
  // xxx: because deposit transaction don't match the message format yet
  filter.address = null;
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
    const evt = logs[logs.length - 1];
    return evt.args.account;
  }
}

export async function setupModulelist () {
  if (document.querySelector('datalist#modulelist')) {
    return;
  }

  const FLAVOR_TYPES = ['binary', 'signal'];
  const modules = [];

  for (const log of await doQueryWithOptions({ toBlock: 1 }, 'ModuleRegistered')) {
    try {
      const { contractAddress, metadata } = log.args;
      const meta = decodeMetadata(metadata);

      if (!meta.version || FLAVOR_TYPES.indexOf(meta.flavor) === -1) {
        console.warn('invalid module metadata', meta, tx);
        continue;
      }
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
  const governanceToken = await habitat.callStatic.tokenOfCommunity(communityId);
  const erc20 = await getErc20(governanceToken);
  const tokenSymbol = await getTokenSymbol(governanceToken);
  const signals = {};
  const votes = {};
  let totalVotes = 0;
  for (const log of await doQuery('VotedOnProposal', null, proposalId)) {
    const { account, signalStrength, shares } = log.args;
    if (!signals[account]) {
      totalVotes++;
    }
    signals[account] = signalStrength;
    votes[account] = shares;
  }
  let defaultSliderValue = 50;

  // statistics
  const numSignals = Object.keys(signals).length;
  let cumulativeSignals = 0;
  for (const k in signals) {
    cumulativeSignals += signals[k];
  }

  const signalStrength = cumulativeSignals / numSignals;
  const totalShares = ethers.utils.formatUnits(await habitat.callStatic.getTotalVotingShares(proposalId), erc20._decimals);
  const totalMembers = Number(await habitat.callStatic.getTotalMemberCount(communityId));
  const participationRate = (totalVotes / totalMembers) * 100;
  const proposalStatus = await habitat.callStatic.getProposalStatus(proposalId);

  let userShares = ethers.BigNumber.from(0);
  let userSignal = 0;
  let userBalance = ethers.BigNumber.from(0);
  if (walletIsConnected()) {
    const signer = await getSigner();
    const account = await signer.getAddress();
    const userVote = votes[account] || ethers.BigNumber.from(0);

    // xxx: take active voting stake into account
    userBalance = ethers.utils.formatUnits(await habitat.callStatic.getBalance(erc20.address, account), erc20._decimals);
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
    userBalance,
    governanceToken,
  };
}

export async function submitVote (communityId, proposalId, signalStrength, _shares, delegatee) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const governanceToken = await habitat.callStatic.tokenOfCommunity(communityId);
  const token = await getToken(governanceToken);
  const shares = ethers.utils.parseUnits(_shares, await token._decimals).toHexString();
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

export async function getTreasuryInformation (vaultAddress) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'VaultCreated', null, null, vaultAddress);
  const evt = logs[logs.length - 1];
  const metadata = getMetadataForTopic(vaultAddress);

  return metadata;
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
  const startDate = evt.args.startDate;
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
  return `/explorer/tx/#${txHash}`;
}

export async function queryTransfers (account) {
  function logSort (a, b) {
    return (Number(b.blockNumber) + Number(b.transactionIndex)) -
      (Number(a.blockNumber) + Number(a.transactionIndex));
  }

  const { habitat } = await getProviders();
  const options = { toBlock: 1 };
  // to
  let logs = await doQueryWithOptions(options, 'TokenTransfer', null, null, account);
  // from
  logs = logs.concat(await doQueryWithOptions(options, 'TokenTransfer', null, account));
  // sort
  logs = logs.sort(logSort);
  // todo sort and filter
  const tokens = [];
  const transfers = [];

  for (const log of logs) {
    const { token, from, to, value } = log.args;
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

export async function fetchModuleInformation (condition) {
  const logs = await doQueryWithOptions({ maxResults: 1, fromBlock: 1 }, 'ModuleRegistered', condition);

  if (!logs.length) {
    return {};
  }

  return decodeMetadata(logs[0].args.metadata);
}

export async function fetchVaultInformation (txHash) {
  const receipt = await getReceipt(txHash);
  const { communityId, condition, vaultAddress } = receipt.events[0].args;
  const metadata = decodeMetadata(receipt.events[1].args.metadata);

  metadata.title = metadata.title || '???';

  return { communityId, condition, vaultAddress, metadata };
}

export async function getTransactionHashForVaultAddress (vaultAddress) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'VaultCreated', null, null, vaultAddress);
  return logs[0].transactionHash;
}

export async function getTransactionHashForCommunityId (communityId) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'CommunityCreated', null, communityId);
  return logs[0].transactionHash;
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

  return { votingStatus, secondsTillClose, quorumPercent };
}

export async function deployModule ({ bytecode }) {
  const signer = await getSigner();
  const _factory = new ethers.ContractFactory([], bytecode, signer);
  const contract = await _factory.deploy();

  await contract.deployTransaction.wait();

  return contract;
}

// xxx: validation
export async function fetchIssue (url) {
  const issuePart = url.split('github.com/')[1];
  const apiUrl = `https://api.github.com/repos/${issuePart}`;
  const resp = await fetch(apiUrl, { headers: { accept: 'application/vnd.github.v3.html+json' }});
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
  const { value, remainingEstimate } = await fetchJson(`${EVOLUTION_ENDPOINT}/gasTank/${account}`);

  return { value: BigInt(value), remainingEstimate: BigInt(remainingEstimate) };
}

export function onChainUpdate (callback) {
  function onMessage (evt) {
    if (evt.source !== window) {
      console.log('unknown source', evt);
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
  let connStatus = walletIsConnected();
  async function _chainUpdateCheck () {
    console.log('update check');
    const { childProvider } = await getProviders();
    const block = await childProvider.send('eth_getBlockByNumber', ['latest']);
    const blockN = Number(block.number);
    const nTxs = block.transactions.length;
    const connected = walletIsConnected();

    if (blockN !== prevBlockN || nTxs !== prevTxs || connected !== connStatus) {
      console.log('chainUpdate');
      connStatus = connected;
      prevBlockN = blockN;
      prevTxs = nTxs;
      setTimeout(() => {
        _logCache = Object.create(null);
        window.postMessage('chainUpdate', window.location.origin);
      }, 300);
    }
  }
  setInterval(_chainUpdateCheck, 3000);
}
