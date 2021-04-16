// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatV1Challenge.sol';
import './HabitatBase.sol';
import './HabitatAccount.sol';
import './HabitatWallet.sol';
import './HabitatCommunity.sol';
import './HabitatVault.sol';
import './HabitatVoting.sol';
import './HabitatStore.sol';
import './UpgradableRollup.sol';

/// @notice Composition of the full Habitat Rollup contracts
contract HabitatV1 is
  HabitatBase,
  HabitatAccount,
  HabitatWallet,
  HabitatCommunity,
  HabitatVault,
  HabitatVoting,
  HabitatStore,
  HabitatV1Challenge,
  UpgradableRollup
{
  /// @dev Challenge the lowest pending block.
  function onChallenge () external returns (uint256) {
    // returns automatically
    HabitatV1Challenge._onChallenge(challengeOffset);
  }

  /// @dev Finalize solution and move to the next block.
  /// Calldata contains a blob of key:value pairs that we are going to apply.
  /// If this functions reverts, then the block can only be finalised by a call to `challenge`.
  function onFinalizeSolution (uint256 blockNumber, bytes32 hash) external {
    UtilityBrick._finalizeStateRootAndStorage(blockNumber, hash);
  }
}
