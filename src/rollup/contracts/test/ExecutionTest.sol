// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

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
