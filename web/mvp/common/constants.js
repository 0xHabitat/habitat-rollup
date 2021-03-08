import TYPED_DATA from './typedData.js';

export { TYPED_DATA }

export const ERC20_ABI = [
  'symbol() view returns (string)',
  'decimals() view returns (uint8)',
  'allowance(address,address) view returns (uint256)',
  'balanceOf(address) view returns (uint256)',
  'approve(address spender,uint256 value) returns (bool)',
  'transfer(address,uint256) returns (bool)',
];

export const BRICK_ABI = [
  'event Abort(uint256 indexed proposalIndex)',
  'event Deposit(address token, address owner, uint256 value)',
  'event ProcessProposal(uint256 indexed proposalIndex, address indexed memberAddress, bool didPass)',
  'event Ragequit(address indexed memberAddress, uint256 sharesToBurn)',
  'event SubmitProposal(uint256 proposalIndex, address indexed delegateKey, address indexed memberAddress, string title)',
  'event SubmitVote(uint256 indexed proposalIndex, address indexed delegateKey, address indexed memberAddress, uint8 uintVote)',
  'event SummonComplete(address indexed summoner)',
  'event UpdateDelegateKey(address indexed memberAddress, address newDelegateKey)',
  'event Withdraw(address token, address owner, uint256 value)',
  'function INSPECTION_PERIOD() view returns (uint16)',
  'function MAX_BLOCK_SIZE() view returns (uint24)',
  'function MAX_SOLUTION_SIZE() view returns (uint24)',
  'function abortWindow() view returns (uint256)',
  'function approvedToken() view returns (address)',
  'function canRagequit(uint256 highestIndexYesVote) view returns (bool)',
  'function deposit(address token, uint256 amountOrId, address receiver)',
  'function dilutionBound() view returns (uint256)',
  'function getCurrentPeriod() view returns (uint256)',
  'function getERC20Exit(address target, address owner) view returns (uint256)',
  'function getMemberProposalVote(address memberAddress, uint256 proposalIndex) view returns (uint8)',
  'function getProposalQueueLength() view returns (uint256)',
  'function gracePeriodLength() view returns (uint256)',
  'function hasVotingPeriodExpired(uint256 startingPeriod) view returns (bool)',
  'function memberAddressByDelegateKey(address) view returns (address)',
  'function members(address) view returns (address delegateKey, uint256 shares, bool exists, uint256 highestIndexYesVote)',
  'function nonces(address) view returns (uint256)',
  'function periodDuration() view returns (uint256)',
  'function proposalQueue(uint256) view returns (bool processed, bool didPass, bool aborted, address proposer, uint256 startingPeriod, uint256 yesVotes, uint256 noVotes, uint256 maxTotalSharesAtYesVote)',
  'function totalShares() view returns (uint256)',
  'function votingPeriodLength() view returns (uint256)',
  'function withdraw(address token, uint256 tokenId)',
  'function executionPermits(uint256) view returns (bytes32)'
];

export const EXECUTION_PROXY_ABI = [
  'function delegate() view returns (address)',
  'function executed(uint256) view returns (bool)',
  'function execute(uint256 proposalIndex, bytes actions)'
];
