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

  function ROLLUP_MANAGER () public override pure returns (address) {
    // alice
    return 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39;
  }

  function getCurrentEpoch () public override returns (uint256) {
    return _getStorage(0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14);
  }

  function _getTime () internal override returns (uint256) {
    return _getStorage(0xb332e0078e64900acaff304c1adfa23f92f90f1431e5da2d32fc43b8780f91c9);
  }

  function onModifyRollupStorage (address msgSender, uint256 nonce, bytes calldata data) external override {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(msgSender == ROLLUP_MANAGER(), 'OMRS1');

    uint ptr;
    uint end;
    assembly {
      ptr := data.offset
      end := add(ptr, data.length)
    }
    while (ptr < end) {
      uint k;
      uint v;
      assembly {
        k := calldataload(ptr)
        ptr := add(ptr, 32)
        v := calldataload(ptr)
        ptr := add(ptr, 32)
      }
      _sstore(k, v);
    }
  }

  function getDelegatedAmount (address account, address delegatee, address token) public returns (uint256) {
    return _getStorage(_DELEGATED_ACCOUNT_ALLOWANCE_KEY(account, delegatee, token));
  }

  function getTotalDelegatedAmount (address account, address token) public returns (uint256) {
    return _getStorage(_DELEGATED_ACCOUNT_TOTAL_ALLOWANCE_KEY(account, token));
  }
}
