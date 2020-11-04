// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '@NutBerry/rollup-bricks/src/tsm/contracts/TokenBridgeBrick.sol';
import '@NutBerry/rollup-bricks/src/bricked/contracts/UtilityBrick.sol';

/// @dev A contract that uses rollup bricks.
contract GovBase is TokenBridgeBrick, UtilityBrick {
  // nonces
  mapping (address => uint256) public nonces;
  mapping (uint256 => bytes32) public executionPermits;

  function _checkUpdateNonce (address msgSender, uint256 nonce) internal {
    require(nonce == nonces[msgSender], 'nonce');

    nonces[msgSender] = nonce + 1;
  }

  /// @dev Constant, the inspection period defines how long it takes (in L1 blocks)
  /// until a submitted solution can be finalized.
  /// Default: 60 blocks ~ 14 minutes.
  function INSPECTION_PERIOD () public view override returns (uint16) {
    // ~84 hours
    return 21600;
  }
}
