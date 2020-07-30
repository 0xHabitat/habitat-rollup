// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.6.2;

import '@NutBerry/rollup-bricks/src/tsm/contracts/TokenBridgeBrick.sol';
import '@NutBerry/rollup-bricks/src/bricked/contracts/UtilityBrick.sol';

/// @dev A contract that uses rollup bricks.
contract GovBase is TokenBridgeBrick, UtilityBrick {
  // nonces
  mapping (address => uint256) public nonces;

  function _checkUpdateNonce (address msgSender, uint256 nonce) internal {
    require(nonce == nonces[msgSender], 'nonce');

    nonces[msgSender] = nonce + 1;
  }
}
