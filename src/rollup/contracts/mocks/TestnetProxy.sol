// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../UpgradableRollup.sol';

contract UpgradableRollupTestnet is UpgradableRollup {
  function ROLLUP_MANAGER () public override view returns (address) {
    return 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39;
  }
}
