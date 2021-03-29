// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Voting Functionality.
contract HabitatVoting is HabitatBase {
  event ProposalCreated(address indexed vault, bytes32 indexed proposalId, uint256 startDate, string title, bytes actions);
  event VotedOnProposal(address indexed account, bytes32 indexed proposalId, uint8 signalStrength, uint256 shares, uint256 timestamp);

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

    {
      // check if `stateDate` is inside a valid range
      uint256 time = RollupCoreBrick._getTime();
      uint256 delay = PROPOSAL_DELAY();
      require(
        time > delay && ((time + delay) > startDate),
        'TIME'
      );
      if (time > startDate) {
        require(time - startDate <= delay, 'TIME');
      }
    }

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

    require(proposalStartDate[proposalId] == 0, 'EXISTS');
    proposalStartDate[proposalId] = startDate;
    proposalVault[proposalId] = vault;
    HabitatBase._maybeUpdateMemberCount(proposalId, msgSender);

    emit ProposalCreated(vault, proposalId, startDate, title, actions);
    UtilityBrick._emitTransactionDeadline(startDate);
  }

  function onVoteOnProposal (
    address msgSender,
    uint256 nonce,
    bytes32 proposalId,
    uint8 signalStrength,
    uint256 shares,
    uint256 timestamp
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);
    HabitatBase._maybeUpdateMemberCount(proposalId, msgSender);

    require(shares > 0);

    // xxx
    // check proposalId
    // replace any existing votes
    // check token balances, shares, signalStrength
    // check timestamp
    uint256 previousVote = HabitatBase.getVote(proposalId, msgSender);
    if (previousVote == 0) {
      HabitatBase._incrementVoteCount(proposalId);
    }
    HabitatBase._setVote(proposalId, msgSender, shares);

    // update total share count
    uint256 t = HabitatBase.getTotalVotingShares(proposalId);
    if (previousVote >= shares) {
      HabitatBase._setTotalVotingShares(proposalId, t - (previousVote - shares));
    } else {
      HabitatBase._setTotalVotingShares(proposalId, t + (shares - previousVote));
    }

    emit VotedOnProposal(msgSender, proposalId, signalStrength, shares, timestamp);
  }

  function onProcessProposal (address msgSender, uint256 proposalIndex) external {
    HabitatBase._commonChecks();
  }
}
