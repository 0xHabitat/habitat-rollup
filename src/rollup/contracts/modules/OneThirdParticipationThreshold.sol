// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import '../IModule.sol';

contract OneThirdParticipationThreshold is IModule {
  function onCreateProposal (
    bytes32 /*communityId*/,
    uint256 /*totalMemberCount*/,
    uint256 totalValueLocked,
    address /*proposer*/,
    uint256 proposerBalance,
    uint256 /*startDate*/,
    bytes calldata /*internalActions*/,
    bytes calldata /*externalActions*/
  ) external pure override
  {
    uint256 minProposerBalance = totalValueLocked / 10000;
    require(
      proposerBalance >= minProposerBalance,
      'Not enough balance'
    );
  }

  function onProcessProposal (
    bytes32 /*proposalId*/,
    bytes32 /*communityId*/,
    uint256 totalMemberCount,
    uint256 totalVoteCount,
    uint256 /*totalVotingShares*/,
    uint256 totalVotingSignal,
    uint256 /*totalValueLocked*/,
    uint256 secondsPassed
  ) external pure override returns (VotingStatus, uint256, uint256) {

    if (totalVoteCount == 0 || secondsPassed < 1) {
      return (VotingStatus.OPEN, uint256(-1), 0);
    }

    uint256 threshold = totalMemberCount / 3;
    uint256 quorum = (totalVoteCount * 100) / (threshold == 0 ? 1 : threshold);

    if (quorum > 99) {
      uint256 averageSignal = totalVotingSignal / totalVoteCount;
      if (averageSignal > 50) {
        return (VotingStatus.PASSED, 0, quorum);
      } else {
        return (VotingStatus.CLOSED, 0, quorum);
      }
    }

    return (VotingStatus.OPEN, 0, quorum);
  }
}
