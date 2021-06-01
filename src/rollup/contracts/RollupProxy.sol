// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import '@NutBerry/rollup-bricks/src/tsm/contracts/RollupUtils.sol';

/// @notice Callforwarding proxy
// Audit-1: ok
contract RollupProxy is RollupUtils {
  constructor (address initialImplementation) {
    assembly {
      // stores the initial contract address to forward calls
      sstore(not(returndatasize()), initialImplementation)
      // created at block - a hint for clients to know from which block to start syncing events
      sstore(0x319a610c8254af7ecb1f669fb64fa36285b80cad26faf7087184ce1dceb114df, number())
    }
    // emit upgrade event
    emit RollupUtils.RollupUpgrade(initialImplementation);
  }

  fallback () external payable {
    assembly {
      // copy all calldata into memory - returndatasize() is a substitute for `0`
      calldatacopy(returndatasize(), returndatasize(), calldatasize())
      // keep a copy to be used after the call
      let zero := returndatasize()
      // call contract address loaded from storage slot with key `uint256(-1)`
      let success := delegatecall(
        gas(),
        sload(not(returndatasize())),
        returndatasize(),
        calldatasize(),
        returndatasize(),
        returndatasize()
      )

      // copy all return data into memory
      returndatacopy(zero, zero, returndatasize())

      // if the delegatecall succeeded then return
      if success {
        return(zero, returndatasize())
      }
      // else revert
      revert(zero, returndatasize())
    }
  }
}
