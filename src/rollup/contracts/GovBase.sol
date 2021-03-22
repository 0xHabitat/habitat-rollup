// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '@NutBerry/rollup-bricks/src/tsm/contracts/TokenBridgeBrick.sol';
import '@NutBerry/rollup-bricks/src/bricked/contracts/UtilityBrick.sol';

/// @notice Global state and public utiltiy functions for the Habitat Rollup
contract GovBase is TokenBridgeBrick, UtilityBrick {
  // Voting Related stuff, needs to go into a module
  uint256 public periodDuration; // default = 17280 = 4.8 hours in seconds (5 periods per day)
  uint256 public votingPeriodLength; // default = 35 periods (7 days)
  uint256 public gracePeriodLength; // default = 35 periods (7 days)
  uint256 public abortWindow; // default = 5 periods (1 day)
  uint256 public dilutionBound; // default = 3 - maximum multiplier a YES voter will be obligated to pay in case of mass ragequit
  uint256 public summoningTime; // needed to determine the current period
  address public approvedToken; // approved token contract reference; default = wETH
  uint256 public totalShares = 0; // total shares across all members

  enum Vote {
    Null, // default value, counted as abstention
      Yes,
      No
  }

  struct Member {
    address delegateKey; // the key responsible for submitting proposals and voting - defaults to member address unless updated
    uint256 shares; // the # of shares assigned to this member
    bool exists; // always true once a member has been created
    uint256 highestIndexYesVote; // highest proposal index # on which the member voted YES
  }

  struct Proposal {
    bool processed; // true only if the proposal has been processed
    bool didPass; // true only if the proposal passed
    bool aborted; // true only if applicant calls 'abort' fn before end of voting period
    address proposer; // the member who submitted the proposal
    uint256 startingPeriod; // the period in which voting can start for this proposal
    uint256 yesVotes; // the total number of YES votes for this proposal
    uint256 noVotes; // the total number of NO votes for this proposal
    uint256 maxTotalSharesAtYesVote; // the maximum # of total shares encountered at a yes vote on this proposal
    // the hash of the structure for proposalIndex + proposal actions
    bytes32 executionPermit;
  }

  mapping (uint256 => mapping(address => Vote)) votesByMember; // the votes on a proposal by each member
  mapping (address => Member) public members;
  mapping (address => address) public memberAddressByDelegateKey;
  Proposal[] public proposalQueue;

  function getCurrentPeriod() public view returns (uint256) {
    return (RollupCoreBrick._getTime() - summoningTime) / periodDuration;
  }

  function getProposalQueueLength() public view returns (uint256) {
    return proposalQueue.length;
  }

  // can only ragequit if the latest proposal you voted YES on has been processed
  function canRagequit(uint256 highestIndexYesVote) public view returns (bool) {
    require(highestIndexYesVote < proposalQueue.length, 'Moloch::canRagequit - proposal does not exist');

    return proposalQueue[highestIndexYesVote].processed;
  }

  function hasVotingPeriodExpired(uint256 startingPeriod) public view returns (bool) {
    return getCurrentPeriod() >= startingPeriod + votingPeriodLength;
  }

  function getMemberProposalVote(address memberAddress, uint256 proposalIndex) public view returns (Vote) {
    require(members[memberAddress].exists, 'Moloch::getMemberProposalVote - member doesn\'t exist');
    require(proposalIndex < proposalQueue.length, 'Moloch::getMemberProposalVote - proposal doesn\'t exist');

    return votesByMember[proposalIndex][memberAddress];
  }

  // global habitat rollup related state
  mapping (address => uint256) public nonces;
  mapping (uint256 => bytes32) public executionPermits;

  function _checkUpdateNonce (address msgSender, uint256 nonce) internal {
    require(nonce == nonces[msgSender], 'nonce');

    nonces[msgSender] = nonce + 1;
  }

  /// @dev Constant, the inspection period defines how long it takes (in L1 blocks)
  /// until a submitted solution can be finalized.
  /// Default: 60 blocks ~ 14 minutes.
  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    // ~84 hours
    return 21600;
  }
}
