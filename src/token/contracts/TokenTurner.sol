// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './Utilities.sol';

/// @notice This contract looks to be useful for bootstrapping/funding purposes.
contract TokenTurner is Utilities {
  /// @dev How long a epoch is, in seconds.
  uint256 constant EPOCH_SECONDS = 604800; // 7 days
  /// @dev How many epochs the funding event is open.
  uint256 constant FUNDING_EPOCHS = 12;
  /// @dev The decay rate per funding epoch.
  uint256 constant DECAY_PER_EPOCH = 4; // 4 %
  /// @dev Maximum decay rate.
  uint256 constant MAX_DECAY_RATE = 100; // 100 %
  /// @dev Price of 1 `outputToken` for 1 `inputToken`.
  uint256 constant FUNDING_PRICE = 25e6; // 25 dai-pennies
  /// @dev The maximum epoch that needs to be reached so that the last possible funding epoch has a decay of 100%.
  uint256 constant MAX_EPOCH = FUNDING_EPOCHS + (MAX_DECAY_RATE / DECAY_PER_EPOCH);

  // ~~(Date.parse('2021-03-05 20:00 UTC+1') / 1000)
  /// @dev Start of the funding event.
  uint256 constant FUNDING_START_DATE = 1614970800;

  uint256 activeEpoch;

  /// @notice Address of the input token. For example: DAI
  address public inputToken;
  /// @notice Address of the output token. For example: HBT
  address public outputToken;
  /// @notice The address of the community fund that receives the decay of `inputToken`.
  address public communityFund;

  /// @notice epoch > address > amount (`inputToken`)
  mapping (uint256 => mapping (address => uint256)) public inflows;

  event Buy (address indexed buyer, uint256 indexed epoch, uint256 amount);
  event Sell (address indexed seller, uint256 indexed epoch, uint256 amount);
  event Claim (uint256 epoch, uint256 amount);

  // @notice Constructing all the things.
  // @params _outputToken The ERC-20 token this contract sells.
  // @param _inputToken The ERC-20 token this contract wants in exchange of `_outputToken`.
  // @param _communityFund Address of the beneficiary, also known as the seller of `_outputToken`.
  constructor (address _outputToken, address _inputToken, address _communityFund) public {
    communityFund = _communityFund;
    inputToken = _inputToken;
    outputToken = _outputToken;
  }

  /// @notice Returns the current epoch. Can also return zero and maximum `MAX_EPOCH`.
  function getCurrentEpoch () public view virtual returns (uint256 epoch) {
    epoch = (block.timestamp - FUNDING_START_DATE) / EPOCH_SECONDS;
    if (epoch > MAX_EPOCH) {
      epoch = MAX_EPOCH;
    }
  }

  /// @notice Returns the decay rate for `epoch`.
  /// The first week has zero decay. After each new week, the decay increases by `DECAY_PER_EPOCH`
  /// up to a maximum of `MAX_DECAY_RATE`.
  function getDecayRateForEpoch (uint256 epoch) public view returns (uint256 rate) {
    rate = (getCurrentEpoch() - epoch) * DECAY_PER_EPOCH;
    if (rate > MAX_DECAY_RATE) {
      rate = MAX_DECAY_RATE;
    }
  }

  // gatekeeper
  function updateInflow () public {
    require(msg.sender != address(this));
    uint256 currentEpoch = getCurrentEpoch();

    if (currentEpoch >= MAX_EPOCH) {
      address receiver = communityFund;
      // claim everything if the decay of the last funding epoch is 100%
      uint256 balance = Utilities._safeBalance(inputToken, address(this));
      if (balance > 0) {
        Utilities._safeTransfer(inputToken, receiver, balance);
      }

      // and claim any remaining `outputToken`
      balance = Utilities._safeBalance(outputToken, address(this));
      if (balance > 0) {
        Utilities._safeTransfer(outputToken, receiver, balance);
      }
      // nothing to do anymore
      return;
    }

    if (currentEpoch > activeEpoch) {
      // bookkeeping
      activeEpoch = currentEpoch;
      uint256 balance = Utilities._safeBalance(inputToken, address(this));
      uint256 claimableAmount = (balance / MAX_DECAY_RATE) * DECAY_PER_EPOCH;

      if (claimableAmount > 0) {
        emit Claim(currentEpoch, claimableAmount);
        Utilities._safeTransfer(inputToken, communityFund, claimableAmount);
      }
    }
  }

  /// @notice Helper function for calculating the `inflow` and `outflow` amounts given `amountIn` and `path`.
  function getQuote (uint256 amountIn, uint256[] memory path) public view returns (uint256 inflow, uint256 outflow) {
    uint256[] memory amounts = UniswapV2Library.getAmountsOut(amountIn, path);
    inflow = amounts[amounts.length - 1];
    outflow = inflow / FUNDING_PRICE;
  }

  /// @notice Swaps `inputToken` or any other ERC-20 with liquidity on Uniswap(v2) for `outputToken`.
  /// @param receiver The receiver of `outputToken`.
  /// @param inputAmount The amount of `swapRoute[0]` to trade for `outputToken`.
  /// @param swapRoute First element is the address of a ERC-20 used as input.
  /// If the address is not `inputToken` then this array should also include addresses for Uniswap(v2) pairs
  /// to swap from. In the format:
  /// uint256(address(pair) << 1 | direction)
  /// where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)
  /// @param permitData Optional EIP-2612 signed approval for `swapRoute[0]`.
  function swapIn (
    address receiver,
    uint256 inputAmount,
    uint256[] memory swapRoute,
    bytes memory permitData
  ) external payable {
    updateInflow();
    address fromToken = address(swapRoute[0]);

    Utilities._maybeRedeemPermit(fromToken, permitData);

    // if `fromToken` == `inputToken` then this maps directly to our price
    uint256 inflowAmount = inputAmount;

    if (fromToken == inputToken) {
      Utilities._safeTransferFrom(fromToken, msg.sender, address(this), inflowAmount);
    } else {
      // we have to swap first
      uint256 oldBalance = Utilities._safeBalance(inputToken, address(this));

      if (msg.value == 0) {
        Utilities._swapExactTokensForTokens(swapRoute, inputAmount, msg.sender, address(this));
      } else {
        Utilities._swapExactETHForTokens(swapRoute, msg.value, address(this));
      }

      uint256 newBalance = Utilities._safeBalance(inputToken, address(this));
      require(newBalance > oldBalance, 'BALANCE');
      inflowAmount = newBalance - oldBalance;
    }

    uint256 currentEpoch = getCurrentEpoch();
    require(currentEpoch < FUNDING_EPOCHS, 'PRESALE_OVER');
    uint256 outflowAmount = inflowAmount / FUNDING_PRICE;
    require(outflowAmount != 0, 'ZERO_AMOUNT');

    // bookkeeping
    emit Buy(msg.sender, currentEpoch, outflowAmount);
    inflows[currentEpoch][msg.sender] += inflowAmount;

    // transfer `outputToken` to `receiver`
    Utilities._safeTransfer(outputToken, receiver, outflowAmount);
  }

  /// @notice Swaps `outputToken` back.
  /// @param receiver Address of the receiver for the returned tokens.
  /// @param inputSellAmount The amount of `outputToken` to swap back.
  /// @param epoch The epoch `outputToken` was acquired. Needed to calculate the decay rate.
  /// @param swapRoute If `swapRoute.length` is greather than 1, then
  /// this array should also include addresses for Uniswap(v2) pairs to swap to/from. In the format:
  /// uint256(address(pair) << 1 | direction)
  /// where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)
  /// For receiving `inputToken` back, just use `swapRoute = [0]`.
  /// If ETH instead of WETH (in the Uniswap case) is wanted, then use `swapRoute [0, DAI-WETH-PAIR]`.
  /// @param permitData Optional EIP-2612 signed approval for `outputToken`.
  function swapOut (
    address receiver,
    uint256 inputSellAmount,
    uint256 epoch,
    uint256[] memory swapRoute,
    bytes memory permitData
  ) external {
    updateInflow();
    uint256 currentEpoch = getCurrentEpoch();
    require(epoch <= currentEpoch, 'EPOCH');

    Utilities._maybeRedeemPermit(outputToken, permitData);

    uint256 sellAmount = inputSellAmount * FUNDING_PRICE;
    // check available amount
    {
      uint256 swappableAmount = inflows[epoch][msg.sender];

      if (epoch != currentEpoch) {
        uint256 decay = getDecayRateForEpoch(epoch);
        swappableAmount = swappableAmount - ((swappableAmount / MAX_DECAY_RATE) * decay);
      }
      require(swappableAmount >= sellAmount, 'AMOUNT');
      inflows[epoch][msg.sender] = swappableAmount - sellAmount;
    }

    emit Sell(msg.sender, epoch, inputSellAmount);
    // take the tokens back
    Utilities._safeTransferFrom(outputToken, msg.sender, address(this), inputSellAmount);

    if (swapRoute.length == 1) {
      Utilities._safeTransfer(inputToken, receiver, sellAmount);
    } else {
      // we swap `inputToken`
      address wethIfNotZero = address(swapRoute[0]);
      swapRoute[0] = uint256(inputToken);

      if (wethIfNotZero == address(0)) {
        Utilities._swapExactTokensForTokens(swapRoute, sellAmount, address(this), receiver);
      } else {
        Utilities._swapExactTokensForETH(swapRoute, sellAmount, address(this), receiver, wethIfNotZero);
      }
    }
  }

  /// @notice Allows to recover `token` except `inputToken` and `outputToken`.
  /// Transfers `token` to the `communityFund`.
  /// @param token The address of the ERC-20 token to recover.
  function recoverLostTokens (address token) external {
    require(token != inputToken && token != outputToken);

    Utilities._safeTransfer(token, communityFund, Utilities._safeBalance(token, address(this)));
  }

  /// @notice Required for receiving ETH from WETH.
  /// Reverts if caller == origin. Helps against wrong ETH transfers.
  fallback () external payable {
    assembly {
      if eq(caller(), origin()) {
        revert(0, 0)
      }
    }
  }
}
