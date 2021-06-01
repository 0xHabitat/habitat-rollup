// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './MetaProxyFactory.sol';

interface IBridge {
  function executionPermit (address vault, bytes32 proposalId) external view returns (bytes32);
}

contract ExecutionProxy is MetaProxyFactory {
  /// @notice The contract that ...brrrr... prints permits.
  address public delegate;
  /// @notice keeps track of already executed permits
  mapping (bytes32 => bool) public executed;

  event NewProxyCreated(address addr);

  constructor (address _delegate) {
    delegate = _delegate;
  }

  // @notice MetaProxy construction via calldata.
  function createProxy (address /*vault*/) external returns (address addr) {
    addr = MetaProxyFactory._metaProxyFromCalldata();
    emit NewProxyCreated(addr);
  }

  /// @notice Executes a set of contract calls `actions` if there is a valid
  /// permit on `delegate` for `proposalIndex` and `actions`.
  function execute (address vault, bytes32 proposalId, bytes memory actions) external {
    require(executed[proposalId] == false, 'already executed');
    require(
      IBridge(delegate).executionPermit(vault, proposalId) == keccak256(actions),
      'wrong permit'
    );

    // mark it as executed
    executed[proposalId] = true;
    // execute
    assembly {
      // Note: we use `callvalue()` instead of `0`
      let ptr := add(actions, 32)
      let max := add(ptr, mload(actions))

      for { } lt(ptr, max) { } {
        let addr := mload(ptr)
        ptr := add(ptr, 32)
        let size := mload(ptr)
        ptr := add(ptr, 32)

        let success := call(gas(), addr, callvalue(), ptr, size, callvalue(), callvalue())
        if iszero(success) {
          // failed, copy the error
          returndatacopy(callvalue(), callvalue(), returndatasize())
          revert(callvalue(), returndatasize())
        }
        ptr := add(ptr, size)
      }
    }
  }
}
