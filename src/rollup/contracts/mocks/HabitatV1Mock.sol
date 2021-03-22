// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../HabitatV1.sol';

contract HabitatV1Mock is HabitatV1 {
  function PROPOSAL_DELAY () public view virtual override returns (uint256) {
    return 30;
  }

  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    return 10;
  }
}
