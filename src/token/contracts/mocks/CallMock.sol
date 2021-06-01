// SPDX-License-Identifier: Unlicense
pragma solidity >=0.6.2;

import '../HabitatToken.sol';

contract CallMock {
  event Evt(uint balance, uint allowance, address from);

  function someCall (address from, address to) external {
    HabitatToken c = HabitatToken(msg.sender);
    uint256 balance = c.balanceOf(address(this));
    uint256 allowance = c.allowance(from, address(this));

    if (balance > 0) {
      c.transfer(from, balance);
    }
    if (allowance > 0) {
      c.transferFrom(from, to, allowance);
    }

    emit Evt(balance, allowance, from);
  }
}
