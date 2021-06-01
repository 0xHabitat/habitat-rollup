// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import '../IModule.sol';

/// @notice This Module is always open and requires a minimum .001% balance regarding the total value locked of the governance token.
contract FeatureFarmSignaling is IModule {
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

  /// @notice Signaling Proposals are forever open.
  function onProcessProposal (
    bytes32 /*proposalId*/,
    bytes32 /*communityId*/,
    uint256 /*totalMemberCount*/,
    uint256 totalVoteCount,
    uint256 /*totalVotingShares*/,
    uint256 totalVotingSignal,
    uint256 /*totalValueLocked*/,
    uint256 /*secondsPassed*/
  ) external pure override returns (VotingStatus, uint256, uint256) {
    return (VotingStatus.OPEN, uint256(-1), totalVoteCount == 0 ? 0 : totalVotingSignal / totalVoteCount);
  }
}
