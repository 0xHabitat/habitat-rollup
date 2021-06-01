// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './HabitatV1Challenge.sol';
import './HabitatBase.sol';
import './HabitatAccount.sol';
import './HabitatWallet.sol';
import './HabitatCommunity.sol';
import './HabitatVault.sol';
import './HabitatVoting.sol';
import './HabitatModule.sol';
import './HabitatStakingPool.sol';

/// @notice Composition of the full Habitat Rollup contracts (v1)
// Audit-1: ok
contract HabitatV1 is
  HabitatBase,
  HabitatAccount,
  HabitatWallet,
  HabitatCommunity,
  HabitatVault,
  HabitatVoting,
  HabitatModule,
  HabitatStakingPool,
  HabitatV1Challenge
{
  /// @dev Challenge the lowest pending block.
  function onChallenge () external returns (uint256) {
    // returns automatically
    HabitatV1Challenge._onChallenge(challengeOffset());
  }

  /// @dev Finalize solution and move to the next block.
  /// Calldata contains a blob of key:value pairs that we are going to apply.
  /// If this functions reverts, then the block can only be finalised by a call to `challenge`.
  function onFinalizeSolution (uint256 blockNumber, bytes32 hash) external {
    UtilityBrick._finalizeStateRootAndStorage(blockNumber, hash);
  }
}
