// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

contract FreeToken {
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Transfer(address indexed from, address indexed to, uint256 value);

  function name () public virtual view returns (string memory) {
    return 'FREE';
  }

  function symbol () public virtual view returns (string memory) {
    return 'FREE';
  }

  function decimals () public virtual view returns (uint8) {
    return 18;
  }

  function totalSupply () public virtual view returns (uint256) {
    return uint256(-1);
  }

  function balanceOf (address account) public virtual view returns (uint256) {
    return uint256(-1);
  }

  function allowance (address account, address spender) public virtual view returns (uint256) {
    return uint256(-1);
  }

  function approve (address spender, uint256 value) public virtual returns (bool) {
    emit Approval(msg.sender, spender, value);

    return true;
  }

  function _transferFrom (address from, address to, uint256 value) internal virtual returns (bool) {
    require(value != 0, 'zero value');

    emit Transfer(from, to, value);
    return true;
  }

  function transfer (address to, uint256 value) public virtual returns (bool) {
    return _transferFrom(msg.sender, to, value);
  }

  function transferFrom (address from, address to, uint256 value) public virtual returns (bool) {
    return _transferFrom(from, to, value);
  }
}
