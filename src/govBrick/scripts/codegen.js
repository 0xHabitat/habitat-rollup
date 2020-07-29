#!/usr/bin/env node

import fs from 'fs';

import TransactionBuilder from '@NutBerry/rollup-bricks/src/bricked/lib/TransactionBuilder.js';
import codegen from '@NutBerry/rollup-bricks/src/bricked/lib/codegen.js'
import TYPED_DATA from '../typedData.js';

(async function () {
  const builder = new TransactionBuilder(TYPED_DATA);
  const code = codegen(builder, { debug: false });
  const template =
`
contract GovBrickChallenge {
  /// @dev Challenge the solution or just verify the next pending block directly.
  function _onChallenge (uint256 challengeOffset) internal {
    // all power the core protocol
    require(msg.sender == address(this));

    assembly {
      ${code}

      // 0x412c6d50
      // function onDeposit (address token, address owner, uint256 value) external
      // TODO: add batchDeposit support
      if eq(calldataload(4), 1) {
        mstore(0, 0x412c6d50)
        // owner
        mstore(64, shr(96, calldataload(36)))
        // token
        mstore(32, shr(96, calldataload(56)))
        // value
        mstore(96, calldataload(76))
        let success := call(gas(), address(), 0, 28, 100, 0, 0)
        mstore(0, calldatasize())
        return(0, 32)
      }

      // block-data is everything after the function signature (4 bytes) + block type (32 bytes)
      // let blockSize := sub(calldatasize(), 36)

      if iszero(challengeOffset) {
        challengeOffset := 36
      }

      // iterate over the block data
      for { } lt(challengeOffset, calldatasize()) { } {
        // if returndatasize > 0
        //   success; even if reverted
        // else
        //   out of gas?
        // TODO: the Bridge needs a global timeout,
        // otherwise it becomes possible that we spin here forever.
        let success, nextOffset := _parseTransaction(challengeOffset)

        if iszero(success) {
          mstore(0, challengeOffset)
          return(0, 32)
        }
        challengeOffset := nextOffset
      }

      // if you do more stuff that doesn't fit into a single transaction,
      // then you can return false here. You have to keep track of progression.
      // Be aware, you may potentially miss the finalization deadline if this takes too long.
      // done
      mstore(0, challengeOffset)
      return(0, 32)
    }
  }
}
`;

  fs.writeFileSync(import.meta.url.split('/').slice(2, -2).join('/') + '/contracts/GovBrickChallenge.sol', template);
  console.log(builder.info());
})();
