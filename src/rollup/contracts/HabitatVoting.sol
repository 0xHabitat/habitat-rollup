// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Voting Functionality.
contract HabitatVoting is HabitatBase {
  event ProposalCreated(address indexed vault, bytes32 indexed proposalId, uint256 startDate, string title, bytes actions);
  event VotedOnProposal(address indexed account, bytes32 indexed proposalId, uint8 signalStrength, uint256 shares, uint256 timestamp);

  /// @dev Validates if `timestamp` is inside a valid range.
  /// `timestamp` should not be under/over now +- `PROPOSAL_DELAY`.
  function _validateTimestamp (uint256 timestamp) internal {
    uint256 time = RollupCoreBrick._getTime();
    uint256 delay = PROPOSAL_DELAY();
    require(
      time > delay && ((time + delay) > timestamp),
      'TIME'
    );
    if (time > timestamp) {
      require(time - timestamp <= delay, 'TIME');
    }
  }

  /// xxx: change this to support the convention: community > (vault w/ condition). {proposal,vote,finalize}
  function onCreateProposal (
    address msgSender,
    uint256 nonce,
    uint256 startDate,
    address vault,
    bytes memory actions,
    // xxx this could also go into metadata
    string calldata title,
    string calldata metadata
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);
    _validateTimestamp(startDate);

    // xxx Should the vault condition receive a callback at creation?
    bytes32 proposalId;
    assembly {
      mstore(0, msgSender)
      mstore(32, nonce)
      let backup := mload(64)
      mstore(64, vault)
      proposalId := keccak256(0, 96)
      mstore(64, backup)
    }

    require(proposalStartDate(proposalId) == 0, 'EXISTS');
    HabitatBase._setProposalStartDate(proposalId, startDate);
    HabitatBase._setProposalVault(proposalId, vault);
    HabitatBase._maybeUpdateMemberCount(proposalId, msgSender);

    emit ProposalCreated(vault, proposalId, startDate, title, actions);
    UtilityBrick._emitTransactionDeadline(startDate);
  }

  /// @dev State transition routine for `VoteOnProposal`.
  function onVoteOnProposal (
    address msgSender,
    uint256 nonce,
    bytes32 proposalId,
    uint256 shares,
    uint256 timestamp,
    address delegatedFor,
    uint8 signalStrength
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(signalStrength > 0 && signalStrength < 101);
    _validateTimestamp(timestamp);

    address account = msgSender;
    if (delegatedFor != address(0)) {
      require(HabitatBase.accountDelegate(delegatedFor) == msgSender, 'DELEGATE');
      account = delegatedFor;
    }

    address vault = HabitatBase.proposalVault(proposalId);
    bytes32 communityId = HabitatBase.communityOfVault(vault);
    address token = HabitatBase.tokenOfCommunity(communityId);
    // only check token here, assuming any invalid vault will end with having a zero address
    require(token != address(0), 'VAULT');
    require(shares > 0 && getErc20Balance(token, account) >= shares, 'SHARE');
    HabitatBase._maybeUpdateMemberCount(proposalId, account);

    // xxx
    // check proposalId
    // replace any existing votes
    // check token balances, shares, signalStrength
    // check timestamp
    uint256 previousVote = HabitatBase.getVote(proposalId, account);
    if (previousVote == 0) {
      HabitatBase._incrementVoteCount(proposalId);
    }
    HabitatBase._setVote(proposalId, account, shares);

    // update total share count
    uint256 t = HabitatBase.getTotalVotingShares(proposalId);
    if (previousVote >= shares) {
      HabitatBase._setTotalVotingShares(proposalId, t - (previousVote - shares));
    } else {
      HabitatBase._setTotalVotingShares(proposalId, t + (shares - previousVote));
    }

    emit VotedOnProposal(account, proposalId, signalStrength, shares, timestamp);
  }

  function onProcessProposal (address msgSender, bytes32 proposalId) external {
    HabitatBase._commonChecks();

    address vault = HabitatBase.proposalVault(proposalId);
    require(vault != address(0));
    bytes32 communityId = HabitatBase.communityOfVault(vault);
    uint256 totalMemberCount = HabitatBase.getTotalMemberCount(communityId);
    uint256 totalVotingShares = HabitatBase.getTotalVotingShares(proposalId);
    uint256 totalVoteCount = HabitatBase.getVoteCount(proposalId);
    uint256 proposalStartDate = HabitatBase.proposalStartDate(proposalId);
    // xxx
    // get average signal strength
    // call vault with all the statistics
    //
  }
}
