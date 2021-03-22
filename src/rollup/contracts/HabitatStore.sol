// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

contract HabitatStore is HabitatBase {
  event ModuleSubmitted(address src);
  event ModuleActivated(bytes32 communityId, address condition);

  /// @dev Submits a module to the store.
  /// AppReview? 😬
  function onSubmitModule (address msgSender, uint256 nonce, address src) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // xxx: more checks
    bytes32 codeHash;
    assembly {
      //codeHash := extcodehash(src)
      codeHash := 1
    }

    moduleHash[src] = codeHash;

    emit ModuleSubmitted(src);
  }

  function onActivateModule (address msgSender, uint256 nonce, bytes32 communityId, address condition) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(moduleHash[condition] != bytes32(0), 'HASH');
    // xxx. buy
    activeModule[communityId][condition] = 1;

    emit ModuleActivated(communityId, condition);
  }
}
