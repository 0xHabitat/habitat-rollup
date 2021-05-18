// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../HabitatV1.sol';

contract HabitatV1Testnet is HabitatV1 {
  function PROPOSAL_DELAY () public pure virtual override returns (uint256) {
    return 30;
  }

  function INSPECTION_PERIOD () public pure virtual override returns (uint16) {
    return 10;
  }

  function ROLLUP_MANAGER () public override pure returns (address) {
    return 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39;
  }

  function STAKING_POOL_TOKEN () public pure override returns (address) {
    // HBT on rinkeby
    return 0x1170FC4D4A1b8e4D5498BE7429a9eC3920F8f114;
  }

  function STAKING_POOL_FEE_DIVISOR () public pure override returns (uint256) {
    return 100;
  }

  function getBalance (address tkn, address account) public override view returns (uint256 ret) {
    ret = super.getBalance(tkn, account);
    if (ret == 0) {
      ret = 1e18;
    }
  }

  function getTotalValueLocked (address token) public view override returns (uint256 value) {
    value = super.getTotalValueLocked(token);
    if (value == 0) {
      value = 1e18;
    }
  }
}
