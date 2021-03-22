// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Voting Functionality.
contract HabitatVoting is HabitatBase {
  event ProposalCreated(address indexed vault, bytes32 indexed proposalId, uint256 startDate, string title, bytes actions);
  event VotedOnProposal(bytes32 indexed proposalId);

  /// xxx: change this to support the convention: community > (vault w/ condition). {proposal,vote,finalize}
  function onCreateProposal (
    address msgSender,
    uint256 nonce,
    uint256 startDate,
    address vault,
    string calldata title,
    bytes memory actions
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    {
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
    require(proposal[proposalId][vault] == 0, 'EXISTS');

    proposal[proposalId][vault] = startDate;

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

    emit VotedOnProposal(proposalId);
  }

  function onProcessProposal (address msgSender, uint256 proposalIndex) external {
    HabitatBase._commonChecks();
  }
}
