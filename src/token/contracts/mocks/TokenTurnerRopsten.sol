// SPDX-License-Identifier: Unlicense
pragma solidity >=0.6.2;

import '../TokenTurner.sol';

contract TokenTurnerRopsten is TokenTurner {
  uint256 _startDate;

  constructor () {
    _startDate = block.timestamp;
  }

  function INPUT_TOKEN () internal pure override returns (address) {
    return 0x217582928Fb133171e2c5Ca019429a3831DD9537;
  }

  function OUTPUT_TOKEN () internal pure override returns (address) {
    return 0x6533Bc5355561cbb841E81eb07056F5EbE4DF413;
  }

  function COMMUNITY_FUND () internal pure override returns (address) {
    return 0x8fe119239B792a6378EeA79364ED20cBCB500e55;
  }

  function getCurrentEpoch () public view override returns (uint256 epoch) {
    uint256 FUNDING_START_DATE = _startDate;
    uint256 EPOCH_SECONDS = 300;
    epoch = (block.timestamp - FUNDING_START_DATE) / EPOCH_SECONDS;
    if (epoch > MAX_EPOCH) {
      epoch = MAX_EPOCH;
    }
  }
}
