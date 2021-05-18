// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Functionality for Habitat Modules
contract HabitatModule is HabitatBase {
  event ModuleSubmitted(address contractAddress, string metadata);
  event ModuleActivated(bytes32 communityId, address condition);

  /// @dev Verifies that the bytecode at `contractAddress` can not
  /// introduce side effects on the rollup at will.
  /// The convention for Modules is that they handle a known set of callbacks
  /// without handling their own state. Thus, opcodes for state handling etc are not allowed.
  function _verifyModule (address contractAddress) internal view returns (bytes32 codehash) {
    assembly {
      function doRevert () {
        // xxx add error message?
        revert(0, 0)
      }

      let size := extcodesize(contractAddress)
      if iszero(size) {
        doRevert()
      }

      let ptr := mload(64)
      let end := add(ptr, size)
      extcodecopy(contractAddress, ptr, 0, size)
      codehash := keccak256(ptr, size)

      for { } lt(ptr, end) { ptr := add(ptr, 1) } {
        let opcode := byte(0, mload(ptr))

        // PUSH opcodes
        if and(gt(opcode, 95), lt(opcode, 128)) {
          let len := sub(opcode, 95)
          ptr := add(ptr, len)
          continue
        }

        // DUPx and SWAPx
        if and(gt(opcode, 127), lt(opcode, 160)) {
          continue
        }

        // everything from 0x0 to 0x20 (inclusive)
        if lt(opcode, 0x21) {
          continue
        }

        // another set of allowed opcodes
        switch opcode
        // CALLVALUE
        case 0x34 {}
        // CALLDATALOAD
        case 0x35 {}
        // CALLDATASIZE
        case 0x36 {}
        // CALLDATACOPY
        case 0x37 {}
        // CODESIZE
        case 0x38 {}
        // CODECOPY
        case 0x39 {}
        // POP
        case 0x50 {}
        // MLOAD
        case 0x51 {}
        // MSTORE
        case 0x52 {}
        // MSTORE8
        case 0x53 {}
        // JUMP
        case 0x56 {}
        // JUMPI
        case 0x57 {}
        // PC
        case 0x58 {}
        // MSIZE
        case 0x59 {}
        // JUMPDEST
        case 0x5b {}
        // RETURN
        case 0xf3 {}
        // REVERT
        case 0xfd {}
        // INVALID
        case 0xfe {}
        default {
          // everything else is not allowed
          doRevert()
        }
      }
    }
  }

  /// @notice Submits a module to the store.
  /// AppReview? 😬
  function onSubmitModule (address msgSender, uint256 nonce, address contractAddress, string calldata metadata) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);
    require(HabitatBase._getStorage(_MODULE_HASH_KEY(contractAddress)) == 0, 'EXISTS');

    // verify the contract code and returns the keccak256(bytecode) (reverts if invalid)
    bytes32 codeHash = _verifyModule(contractAddress);
    HabitatBase._setStorage(_MODULE_HASH_KEY(contractAddress), codeHash);

    emit ModuleSubmitted(contractAddress, metadata);
  }

  /// @notice Activates a module for `communityId`.
  /// Modules only needs to be activated/bought once for a community.
  function onActivateModule (address msgSender, uint256 nonce, bytes32 communityId, address condition) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // checks if the module of submitted and verified
    require(HabitatBase._getStorage(_MODULE_HASH_KEY(condition)) != 0, 'HASH');
    require(HabitatBase._getStorage(_ACTIVATOR_OF_MODULE_KEY(communityId, condition)) == 0);

    // xxx acquire/buy flow
    //uint256 modulePrice = HabitatBase.modulePriceOf(condition);
    //if (modulePrice != 0) {
    //}

    // activate
    HabitatBase._setStorage(_ACTIVATOR_OF_MODULE_KEY(communityId, condition), msgSender);

    emit ModuleActivated(communityId, condition);
  }
}
