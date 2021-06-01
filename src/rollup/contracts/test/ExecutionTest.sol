// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract ExecutionTest {
  address public delegate;
  uint256 public somevalue;

  constructor (address _delegate) {
    delegate = _delegate;
  }

  function changeDelegate (address newDelegate) public {
    require(msg.sender == delegate);
    delegate = newDelegate;
  }

  function changeSomething (uint256 a) public {
    require(msg.sender == delegate);
    somevalue = a;
  }
}
