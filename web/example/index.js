import TransactionBuilder from './TransactionBuilder.js';

const TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    // Transactions that can be replayed need nonces.
    // Other transaction types revert if replayed.
    InitMoloch: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'summoner', type: 'address' },
      { name: 'approvedToken', type: 'address' },
      { name: 'periodDuration', type: 'uint256' },
      { name: 'votingPeriod', type: 'uint256' },
      { name: 'gracePeriod', type: 'uint256' },
      { name: 'abortWindow', type: 'uint256' },
      { name: 'proposalDeposit', type: 'uint256' },
      { name: 'dilutionBound', type: 'uint256' },
      { name: 'processingReward', type: 'uint256' },
    ],
    SubmitProposal: [
      { name: 'nonce', type: 'uint256' },
      { name: 'applicant', type: 'address' },
      { name: 'tokenTribute', type: 'uint256' },
      { name: 'sharesRequested', type: 'uint256' },
      { name: 'details', type: 'string' },
    ],
    SubmitVote: [
      { name: 'proposalIndex', type: 'uint256' },
      { name: 'uintVote', type: 'uint8' },
    ],
    ProcessProposal: [
      { name: 'proposalIndex', type: 'uint256' },
    ],
    Ragequit: [
      { name: 'nonce', type: 'uint256' },
      { name: 'sharesToBurn', type: 'uint256' },
    ],
    Abort: [
      { name: 'proposalIndex', type: 'uint256' },
    ],
    UpdateDelegateKey: [
      { name: 'nonce', type: 'uint256' },
      { name: 'newDelegateKey', type: 'address' },
    ],
  },
  domain: {
    name: 'GovBrick',
    version: '1',
  },
  primaryTypes: [
    'InitMoloch',
    'SubmitProposal',
    'SubmitVote',
    'ProcessProposal',
    'Ragequit',
    'Abort',
    'UpdateDelegateKey',
  ],
};

const ERC20_ABI = [
  'symbol() view returns (string)',
  'decimals() view returns (uint8)',
  'allowance(address,address) view returns (uint256)',
  'balanceOf(address) view returns (uint256)',
  'approve(address spender,uint256 value) returns (bool)',
  'transfer(address,uint256) returns (bool)',
];

const BRICK_ABI = [
  'event Abort(uint256 indexed proposalIndex, address applicantAddress)',
  'event BlockBeacon()',
  'event Deposit(address token, address owner, uint256 value)',
  'event NewSolution(uint256 blockNumber, bytes32 solutionHash)',
  'event ProcessProposal(uint256 indexed proposalIndex, address indexed applicant, address indexed memberAddress, uint256 tokenTribute, uint256 sharesRequested, bool didPass)',
  'event Ragequit(address indexed memberAddress, uint256 sharesToBurn)',
  'event SubmitProposal(uint256 proposalIndex, address indexed delegateKey, address indexed memberAddress, address indexed applicant, uint256 tokenTribute, uint256 sharesRequested)',
  'event SubmitVote(uint256 indexed proposalIndex, address indexed delegateKey, address indexed memberAddress, uint8 uintVote)',
  'event SummonComplete(address indexed summoner, uint256 shares)',
  'event UpdateDelegateKey(address indexed memberAddress, address newDelegateKey)',
  'event Withdraw(address token, address owner, uint256 value)',
  'function BOND_AMOUNT() view returns (uint256)',
  'function INSPECTION_PERIOD() view returns (uint16)',
  'function MAX_BLOCK_SIZE() view returns (uint24)',
  'function MAX_SOLUTION_SIZE() view returns (uint24)',
  'function VERSION() view returns (uint16)',
  'function abortWindow() view returns (uint256)',
  'function approvedToken() view returns (address)',
  'function batchDeposit()',
  'function batchWithdraw()',
  'function blockSolutions(uint256) view returns (bytes32)',
  'function canFinalizeBlock(uint256 blockNumber) view returns (bool)',
  'function canRagequit(uint256 highestIndexYesVote) view returns (bool)',
  'function challenge()',
  'function createdAtBlock() view returns (uint256)',
  'function deposit(address token, uint256 amountOrId)',
  'function dilutionBound() view returns (uint256)',
  'function dispute(uint256 blockNumber, uint256 bitmask)',
  'function finalizeSolution(uint256 blockNumber)',
  'function finalizedHeight() view returns (uint256)',
  'function getCurrentPeriod() view returns (uint256)',
  'function getERC20Exit(address target, address owner) view returns (uint256)',
  'function getERC721Exit(address target, uint256 tokenId) view returns (address)',
  'function getMemberProposalVote(address memberAddress, uint256 proposalIndex) view returns (uint8)',
  'function getProposalQueueLength() view returns (uint256)',
  'function gracePeriodLength() view returns (uint256)',
  'function hasVotingPeriodExpired(uint256 startingPeriod) view returns (bool)',
  'function lastNow() view returns (uint256)',
  'function memberAddressByDelegateKey(address) view returns (address)',
  'function members(address) view returns (address delegateKey, uint256 shares, bool exists, uint256 highestIndexYesVote)',
  'function nonces(address) view returns (uint256)',
  'function onAbort(address msgSender, uint256 proposalIndex)',
  'function onChallenge() returns (uint256)',
  'function onDeposit(address token, address owner, uint256 value)',
  'function onFinalizeSolution(uint256 blockNumber, bytes32 hash)',
  'function onInitMoloch(address msgSender, uint256 nonce, address summoner, address approvedToken, uint256 periodDuration, uint256 votingPeriod, uint256 gracePeriod, uint256 abortWindow, uint256 proposalDeposit, uint256 dilutionBound, uint256 processingReward)',
  'function onProcessProposal(address msgSender, uint256 proposalIndex)',
  'function onRagequit(address msgSender, uint256 nonce, uint256 sharesToBurn)',
  'function onSubmitProposal(address msgSender, uint256 nonce, address applicant, uint256 tokenTribute, uint256 sharesRequested, string details)',
  'function onSubmitVote(address msgSender, uint256 proposalIndex, uint8 uintVote)',
  'function onUpdateDelegateKey(address msgSender, uint256 nonce, address newDelegateKey)',
  'function periodDuration() view returns (uint256)',
  'function processingReward() view returns (uint256)',
  'function proposalDeposit() view returns (uint256)',
  'function proposalQueue(uint256) view returns (address proposer, address applicant, uint256 sharesRequested, uint256 startingPeriod, uint256 yesVotes, uint256 noVotes, bool processed, bool didPass, bool aborted, uint256 tokenTribute, string details, uint256 maxTotalSharesAtYesVote)',
  'function submitBlock() payable',
  'function submitSolution(uint256 blockNumber, bytes32 solutionHash)',
  'function summoningTime() view returns (uint256)',
  'function totalShares() view returns (uint256)',
  'function totalSharesRequested() view returns (uint256)',
  'function votingPeriodLength() view returns (uint256)',
  'function withdraw(address token, uint256 tokenId)'
];

// Brick @ ropsten
const BRIDGE_ADDRESS = '0x51f0cce6cb1e148f9626a918e338135505e35d39';
// The L2 node
const RPC_URL = `https://${BRIDGE_ADDRESS}.fly.dev`;
// TST @ ropsten
const TOKEN_ADDRESS = '0x722dd3f80bac40c951b51bdd28dd19d435762180';
const ctx = Object.create(null);
const txBuilder = new TransactionBuilder(TYPED_DATA);

async function sendTransaction (primaryType, message) {
  const signer = ctx.signer;
  const signerAddress = await signer.getAddress();

  if (message.nonce === undefined && txBuilder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await ctx.bridgeL2.nonces(signerAddress)).toHexString();
  }

  const calldata = '0x' + txBuilder.encodeCall({ from: signerAddress, message, primaryType }).map((v) => v.toString(16).padStart(2, '0')).join('');
  const callResult = await ctx.bridgeL2.provider.send('eth_call', [{ from: signerAddress, data: calldata }]);
  log({ callResult });

  const tx = Object.assign({ message, primaryType }, TYPED_DATA);
  const sig = await signer.provider.send('eth_signTypedData_v3', [signerAddress, JSON.stringify(tx)]);
  const { r, s, v } = ethers.utils.splitSignature(sig);

  const encoded = txBuilder.encode(Object.assign(tx, { r, s, v }));
  const decoded = txBuilder.decode(encoded);

  if (decoded.from !== signerAddress.toLowerCase()) {
    throw new Error(`TransactionBuilder encoding/decoding error`);
  }

  let str = '';
  for (const v of encoded) {
    str += v.toString(16).padStart(2, '0');
  }

  const rawTx = '0x' + str;
  log({ rawTx });
  const txHash = await ctx.childProvider.send('eth_sendRawTransaction', [rawTx]);
  const receipt = await ctx.childProvider.getTransactionReceipt(txHash);
  log({ receipt });

  for (const obj of receipt.logs) {
    log({ evt: ctx.bridgeL2.interface.parseLog(obj) });
  }

  return receipt;
}

async function setup () {
  await window.ethereum.enable();

  ctx.rootProvider = new ethers.providers.Web3Provider(window.ethereum);
  ctx.signer = await ctx.rootProvider.getSigner();
  ctx.bridgeL1 = new ethers.Contract(BRIDGE_ADDRESS, BRICK_ABI, ctx.signer);
  ctx.childProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
  ctx.bridgeL2 = new ethers.Contract(BRIDGE_ADDRESS, BRICK_ABI, ctx.childProvider);
  ctx.erc20 = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, ctx.signer);
  ctx.erc20Child = ctx.erc20.connect(ctx.childProvider);

  log({ signer: await ctx.signer.getAddress() });
}

async function initMoloch () {
  const args = {
    summoner: await ctx.signer.getAddress(),
    approvedToken: ctx.erc20.address,
    periodDuration: 1,
    votingPeriod: 10,
    gracePeriod: 1,
    abortWindow: 1,
    proposalDeposit: 0,
    dilutionBound: 1,
    processingReward: 0,
  };

  const receipt = await sendTransaction('InitMoloch', args);
}

async function submitProposal () {
  const args = {
    applicant: await ctx.signer.getAddress(),
    tokenTribute: 0,
    sharesRequested: 0,
    details: 'Hello World',
  };

  return sendTransaction('SubmitProposal', args);
}

async function submitVote () {
  const proposalIndex = (await ctx.bridgeL2.getProposalQueueLength()).sub(1).toHexString();
  const args = {
    proposalIndex,
    uintVote: 1,
  };

  return sendTransaction('SubmitVote', args);
}

async function abort () {
  const proposalIndex = (await ctx.bridgeL2.getProposalQueueLength()).sub(1).toHexString();
  const args = {
    proposalIndex,
  };

  return sendTransaction('Abort', args);
}

async function processProposal () {
  const len = Number((await ctx.bridgeL2.getProposalQueueLength()).toHexString());

  for (let i = 0; i < len; i++) {
    const { yesVotes, noVotes, processed, didPass, proposer } = await ctx.bridgeL2.proposalQueue(i);
    log({ yesVotes, noVotes, processed, didPass, proposer });

    if (!processed) {
      const args = {
        proposalIndex: i,
      };

      await sendTransaction('ProcessProposal', args);
    }
  }
}

async function updateDelegateKey () {
  const args = {
    newDelegateKey: await ctx.signer.getAddress(),
  };

  return sendTransaction('UpdateDelegateKey', args);
}

async function ragequit () {
   const args = {
    sharesToBurn: 1,
  };

  return sendTransaction('Ragequit', args);
}

async function memberCheck () {
  const { delegateKey, exists, highestIndexYesVote, shares } = await ctx.bridgeL2.members(await ctx.signer.getAddress());
  log({ delegateKey, exists, highestIndexYesVote, shares });
}

async function deposit () {
  const amount = '0xff';
  const allowance = await ctx.erc20.allowance(await ctx.signer.getAddress(), ctx.bridgeL1.address);
  log({ allowance });

  let tx, receipt;

  if (allowance.lt(amount)) {
    tx = await ctx.erc20.approve(BRIDGE_ADDRESS, amount);
    log({ tx });
    receipt = await tx.wait();
    log({ receipt });
  }

  tx = await ctx.bridgeL1.deposit(ctx.erc20.address, amount);
  log({ tx });
  receipt = await tx.wait();
  log({ receipt });
}

async function withdraw () {
  const decimals = await ctx.erc20.decimals();
  const availableForExit = await ctx.bridgeL1.getERC20Exit(ctx.erc20.address, await ctx.signer.getAddress());
  const units = ethers.utils.formatUnits(availableForExit, decimals);
  log({ availableForExit });

  // unused for ERC-20
  const nftId = 0;
  const tx = await ctx.bridgeL1.withdraw(ctx.erc20.address, nftId);
  log({ tx });
  const receipt = await tx.wait();
  log({ receipt });
}

async function eventTest () {
  ctx.bridgeL2.on(ctx.bridgeL2.filters.ProcessProposal(),
    function (proposalIndex, applicant, memberAddress) {
      log({ proposalIndex, applicant, memberAddress });
    }
  );
  ctx.bridgeL2.provider.resetEventsBlock(1);
}

// start
const container = document.querySelector('.container');

for (const v of [setup, initMoloch, submitProposal, submitVote, abort, processProposal, updateDelegateKey, deposit, ragequit, withdraw, memberCheck, eventTest]) {
  const btn = document.createElement('button');
  btn.innerText = v.toString().split('{')[0];
  btn.onclick = v;
  container.appendChild(btn);
}

const pre = document.createElement('pre');
container.appendChild(pre);
async function log (...args) {
  pre.innerText = (new Date()).toLocaleString() + JSON.stringify(...args, null, 2) + '\n' + pre.innerText;
}
