// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../IModule.sol';

contract OneShareOneVote is IModule {
  function onProcessProposal (
    bytes32 proposalId,
    bytes32 communityId,
    uint256 totalMemberCount,
    uint256 totalVoteCount,
    uint256 totalVotingShares,
    uint256 totalVotingSignal,
    uint256 totalValueLocked,
    uint256 secondsPassed
  ) external view override returns (VotingStatus) {

    if (totalVoteCount == 0 || secondsPassed < 1) {
      return VotingStatus.OPEN;
    }

    uint256 PRECISION = 10000;
    uint256 THRESHOLD = PRECISION - PRECISION / 3;
    uint256 averageSignal = totalVotingSignal / totalVoteCount;
    uint256 participation = (totalVoteCount * PRECISION) / totalMemberCount;

    if (participation > THRESHOLD) {
      if (averageSignal > 50) {
        return VotingStatus.PASSED;
      } else {
        return VotingStatus.CLOSED;
      }
    }

    return VotingStatus.OPEN;
  }
}
