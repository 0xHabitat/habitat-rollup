// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import '../VirtualERC20Factory.sol';

contract VirtualERC20FactoryMock is VirtualERC20Factory {
  address bridge;

  constructor (address _bridge) {
    bridge = _bridge;
  }

  function _INITIAL_OWNER () internal view virtual override returns (address) {
    return bridge;
  }
}
