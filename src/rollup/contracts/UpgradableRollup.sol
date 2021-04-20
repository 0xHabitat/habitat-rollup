// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '@NutBerry/rollup-bricks/src/tsm/contracts/RollupUtils.sol';

contract UpgradableRollup is RollupUtils {
  /// @notice Returns the address who is in charge of changing the rollup implementation.
  function ROLLUP_MANAGER () public virtual view returns (address) {
  }

  /// @notice Upgrades the implementation.
  function upgradeRollup (address newImplementation) external {
    require(msg.sender == ROLLUP_MANAGER());
    assembly {
      sstore(not(returndatasize()), newImplementation)
    }
    emit RollupUtils.RollupUpgrade(newImplementation);
  }
}
