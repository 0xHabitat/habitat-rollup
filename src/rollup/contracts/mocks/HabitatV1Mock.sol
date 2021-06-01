// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import '../HabitatV1.sol';

contract HabitatV1Mock is HabitatV1 {
  function _PROPOSAL_DELAY () internal pure virtual override returns (uint256) {
    return 30;
  }

  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    return 10;
  }

  function STAKING_POOL_FEE_DIVISOR () public pure override returns (uint256) {
    return 100;
  }

  function ROLLUP_MANAGER () public view override returns (address) {
    // alice
    return 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39;
  }

  function getCurrentEpoch () public view override returns (uint256) {
    return _getStorage(0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14);
  }

  function _validateTimestamp (uint256 timestamp) internal override {
  }

  function onModifyRollupStorage (address msgSender, uint256 nonce, bytes calldata data) external override {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(msgSender == ROLLUP_MANAGER(), 'OMRS1');

    assembly {
      let ptr := data.offset
      let end := add(ptr, data.length)

      for { } lt(ptr, end) { } {
        let k := calldataload(ptr)
        ptr := add(ptr, 32)
        let v := calldataload(ptr)
        ptr := add(ptr, 32)

        sstore(k, v)
      }
    }
  }
}
