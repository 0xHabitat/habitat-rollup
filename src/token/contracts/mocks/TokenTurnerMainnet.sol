// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '../TokenTurner.sol';

contract TokenTurnerMainnet is TokenTurner {
  function INPUT_TOKEN () internal view override returns (address) {
    return 0x217582928Fb133171e2c5Ca019429a3831DD9537;
  }

  function OUTPUT_TOKEN () internal view override returns (address) {
    return 0x26246423C568aC31CE040EedA33896AD9BDd2DfD;
  }

  function COMMUNITY_FUND () internal view override returns (address) {
    // multisig
    return 0xc97f82c80DF57c34E84491C0EDa050BA924D7429;
  }

  function getCurrentEpoch () public view override returns (uint256 epoch) {
    // ~~(Date.parse('2021-03-05 20:00 UTC+1') / 1000)
    uint256 FUNDING_START_DATE = 1614899552;
    // 1 week
    uint256 EPOCH_SECONDS = 604800;
    epoch = (block.timestamp - FUNDING_START_DATE) / EPOCH_SECONDS;
    if (epoch > MAX_EPOCH) {
      epoch = MAX_EPOCH;
    }
  }
}
