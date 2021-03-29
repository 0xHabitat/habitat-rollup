// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../HabitatV1.sol';

contract HabitatV1Testnet is HabitatV1 {
  function PROPOSAL_DELAY () public view virtual override returns (uint256) {
    return 30;
  }

  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    return 10;
  }

  function getErc20Balance (address tkn, address account) public override view returns (uint256 ret) {
    uint256 key = _ERC20_KEY(tkn, account);
    assembly {
      ret := sload(key)
    }
    if (ret == 0) {
      return 1e18;
    }
  }
}
