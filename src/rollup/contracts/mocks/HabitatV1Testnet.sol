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

  function ROLLUP_MANAGER () public override view returns (address) {
    return 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39;
  }

  /// @dev State transition when a user transfers a token.
  function _transferToken (address token, address from, address to, uint256 value) internal override {
    // xxx check under/overflows
    if (from != to) {
      if (NutBerryTokenBridge.isERC721(token, value)) {
        require(getErc721Owner(token, value) == from, 'OWNER');
        _setErc721Owner(token, value, to);
        if (to == address(0)) {
          TokenInventoryBrick._setERC721Exit(token, from, value);
        }
      } else {
        uint256 tmp = getErc20Balance(token, from);
        require (tmp >= value, 'BALANCE');
        _setErc20Balance(token, from, tmp - value);

        if (to == address(0)) {
          TokenInventoryBrick._incrementExit(token, from, value);
        } else {
          tmp = getErc20Balance(token, to);
          require(tmp + value > tmp);
          _setErc20Balance(token, to, tmp + value);
        }
      }
    }

    emit TokenTransfer(token, from, to, value);
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
