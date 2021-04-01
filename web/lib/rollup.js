import NETWORKS from './rollup-config.js';
import { BRICK_ABI, EXECUTION_PROXY_ABI, TYPED_DATA } from './constants.js';
import { getSigner, getProvider, getErc20, getTokenSymbol, walletIsConnected, secondsToString, renderAddress } from './utils.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

const ROOT_CHAIN_ID = window.location.hostname === 'localhost' ? 99 : 3;
const { RPC_URL, EXECUTION_PROXY_ADDRESS } = NETWORKS[ROOT_CHAIN_ID];

export async function getProviders () {
  if (document._providers) {
    return document._providers;
  }

  const rootProvider = ROOT_CHAIN_ID === 99 ? new ethers.providers.JsonRpcProvider('http://localhost:8222') : new ethers.getDefaultProvider(ROOT_CHAIN_ID);
  const childProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const bridgeAddress = await childProvider.send('web3_clientVersion', []);
  const habitat = new ethers.Contract(bridgeAddress, BRICK_ABI, childProvider);
  const bridgeContract = habitat.connect(rootProvider);

  document._providers = { rootProvider, childProvider, habitat, bridgeContract };

  return document._providers;
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

export function encodeProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const addr = ary[i++].replace('0x', '').padStart(64, '0');
    const data = ary[i++].replace('0x', '');
    const dataSize = (data.length / 2).toString(16).padStart(64, '0')

    res += addr + dataSize + data;
  }

  return res;
}

export function decodeProposalActions (hexString) {
  const res = [];

  for (let i = hexString[1] === 'x' ? 2 : 0, len = hexString.length; i < len;) {
    // 32 bytes address
    const addr = hexString.substring(i += 24, i += 40).padStart(40, '0');
    res.push('0x' + addr);

    // 32 bytes calldata size
    const dataSize = parseInt(hexString.substring(i, i += 64), 16);
    console.log({i,dataSize});

    if (dataSize) {
      // calldata
      const data = hexString.substring(i, i += (dataSize * 2));
      res.push('0x' + data);
    } else {
      res.push('0x');
    }
  }

  console.log(res);
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

export async function* pullEvents (habitat, filter, blocks) {
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

export async function doQuery (name, ...args) {
  const { habitat } = await getProviders();
  const blockNum = await habitat.provider.getBlockNumber();
  const filter = habitat.filters[name](...args);
  // xxx: because deposit transaction don't match the message format yet
  filter.address = null;

  filter.toBlock = blockNum;
  filter.fromBlock = 1;
  console.log({filter});

  return await habitat.provider.send('eth_getLogs', [filter]);
}

export function getShortString (str) {
  const buf = ethers.utils.toUtf8Bytes(str);
  if (buf.length > 32) {
    throw new Error('name is too long');
  }
  return ethers.utils.hexlify(buf).padEnd(66, '0');
}

export async function getUsername (address) {
  const logs = await doQuery('ClaimUsername', address);
  let username = renderAddress(address);

  if (logs.length) {
    try {
      username = ethers.utils.toUtf8String(logs[logs.length - 1].topics[2]);
    } catch (e) {
      console.warn(e);
    }
  }
  return username ;
}

export async function resolveUsername (str) {
  // xxx returns the last claimer of str, address should be double checked
  const { habitat } = await getProviders();
  const logs = await doQuery('ClaimUsername', null, getShortString(str));

  if (logs.length) {
    const evt = habitat.interface.parseLog(logs[logs.length - 1]);
    return evt.args.account;
  }
}

export async function setupModulelist () {
  if (document.querySelector('datalist#modulelist')) {
    return;
  }

  function randomAddress () {
    return ethers.utils.hexlify(ethers.utils.randomBytes(20));
  }

  const modules = [{ name: 'Multisig', 'address': randomAddress() }, { name: 'One share,  One Vote', 'address': randomAddress() }];
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
    tokenSymbol
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
    signalStrength,
    shares,
    timestamp,
  };

  return sendTransaction('VoteOnProposal', args);
}

export async function getCommunityInformation (communityId) {
  // xxx
  const { habitat } = await getProviders();
  const logs = await doQuery('CommunityCreated', null, communityId);
  const evt = habitat.interface.parseLog(logs[logs.length -1 ]);
  const metadata = JSON.parse(evt.args.metadata);

  return Object.assign(metadata, { communityId: evt.args.communityId, governanceToken: evt.args.governanceToken });
}

export async function getTreasuryInformation (vaultAddress) {
  // xxx
  const { habitat } = await getProviders();
  const logs = await doQuery('VaultCreated', null, null, vaultAddress);
  const evt = habitat.interface.parseLog(logs[logs.length -1 ]);
  const metadata = JSON.parse(evt.args.metadata);

  return Object.assign(metadata, { });
}

export async function getProposalInformation (txHash) {
  // xxx
  const { habitat } = await getProviders();
  const receipt = await getReceipt(txHash);
  const evt = receipt.events[0];
  const title = evt.args.title;
  const proposalId = evt.args.proposalId;
  const startDate = evt.args.startDate;
  const vaultAddress = evt.args.vault;
  const communityId = await habitat.communityOfVault(vaultAddress);

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
