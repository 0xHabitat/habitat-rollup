// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../GovBrick.sol';

contract GovBrickMock is GovBrick {
  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    return 10;
  }
}
