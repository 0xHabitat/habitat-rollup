// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../TokenTurner.sol';

contract TokenTurnerRopsten is TokenTurner {
  function INPUT_TOKEN () internal view override returns (address) {
    return 0x217582928Fb133171e2c5Ca019429a3831DD9537;
  }

  function OUTPUT_TOKEN () internal view override returns (address) {
    return 0x6533Bc5355561cbb841E81eb07056F5EbE4DF413;
  }

  function COMMUNITY_FUND () internal view override returns (address) {
    return 0x8fe119239B792a6378EeA79364ED20cBCB500e55;
  }

  function getCurrentEpoch () public view override returns (uint256 epoch) {
    uint256 FUNDING_START_DATE = 1615289631;
    uint256 EPOCH_SECONDS = 7200;
    epoch = (block.timestamp - FUNDING_START_DATE) / EPOCH_SECONDS;
    if (epoch > MAX_EPOCH) {
      epoch = MAX_EPOCH;
    }
  }
}
