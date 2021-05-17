// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../IModule.sol';

// @notice Seven Day Voting - Simple Majority Voting
// min proposer balance = .1%  (1% / 10)
// TVL = total value on rollup for governance token for non vault addresses
// 7 day voting period (fixed)
// quorum: total voting shares / TVL >= 10%
// requirement: total signal (average preference) > 50%  = YES else NO
contract SevenDayVoting is IModule {
  function onCreateProposal (
    bytes32 communityId,
    uint256 totalMemberCount,
    uint256 totalValueLocked,
    address proposer,
    uint256 proposerBalance,
    uint256 startDate,
    bytes calldata internalActions,
    bytes calldata externalActions
  ) external view override
  {
    uint256 minProposerBalance = totalValueLocked / 1000;
    require(
      proposerBalance >= minProposerBalance,
      'Not enough balance'
    );
  }

  function onProcessProposal (
    bytes32 proposalId,
    bytes32 communityId,
    uint256 totalMemberCount,
    uint256 totalVoteCount,
    uint256 totalVotingShares,
    uint256 totalVotingSignal,
    uint256 totalValueLocked,
    uint256 secondsPassed
  ) external view override returns (VotingStatus, uint256) {
    // 7 days
    uint256 VOTING_DURATION = 604800;
    uint256 secondsTillClose = secondsPassed > VOTING_DURATION ? 0 : VOTING_DURATION - secondsPassed;

    if (secondsPassed < VOTING_DURATION) {
      return (VotingStatus.OPEN, secondsTillClose);
    }

    uint256 minQuorum = totalValueLocked / 10;
    if (totalVotingShares < minQuorum) {
      return (VotingStatus.CLOSED, secondsTillClose);
    }

    uint256 averageSignal = totalVotingSignal / totalVoteCount;
    if (averageSignal > 50) {
      return (VotingStatus.PASSED, secondsTillClose);
    }

    return (VotingStatus.CLOSED, secondsTillClose);
  }
}
