import '../Utilities.sol';

contract DropletMock is Utilities {
  address token;
  address payee;

  constructor (address _token) {
    token = _token;
  }

  function setPayee (address _payee) external {
    payee = _payee;
  }

  function drip () external {
    Utilities._safeTransfer(token, payee, 1000);
  }
}
