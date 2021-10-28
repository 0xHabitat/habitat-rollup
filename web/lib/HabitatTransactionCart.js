import { wrapListener, getTokenV2, renderAmount } from './utils.js';
import { signBatch } from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import BalanceTracker from './BalanceTracker.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host {
    all: initial;
    box-sizing: border-box;
    color: white;
    -webkit-touch-callout: none; 
    -webkit-user-select: none; 
    -khtml-user-select: none; 
    -moz-user-select: none; 
    -ms-user-select: none; 
    user-select: none;
  }
  button{
    all:initial;
  }
  button:hover{
    all: initial;
  }
  span{
    all: initial;
    color: white;
    font-family: arial;
    font-style: normal;
    font-size: 14px;
    line-height: 18px;
  }
  td{
    all: initial;
    color: white;
    font-family: arial;
  }
  td:nth-child(1){
    float: left;
  }
  td:nth-child(2){
    float: right;
  }
  tr{
    margin-top: 8px;
  }
  #HTC_detail{
    width: 75%;
    align-self: center;
    background-color: #222222;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    border-radius: 20px 20px 0 0;
    display: flex;
    flex-direction: column;
  }
  #HTC_container{
    display: flex;
    flex-direction: column;
    margin: auto;
    color: white;
  }
  #HTC_bar{
    padding: 16px 25px 16px 25px;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    border-radius: 30px 0 30px 0;
    display: flex;
    flex-direction: row;
    background-color: #222222;
    align-items: center;
    height: 70px;
  }
  #HTC_abail{
    margin-right: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  #HTC_toggle > span{
    color: white;
    font-family: arial;
    font-style: normal;
    font-size: 14px;
    line-height: 18px;
  }
  #HTC_toggle{
    margin-right: 20px;
    display: flex;
    align-content: middle;
    align-items: center;
  }
  #HTC_tran{
    margin-right: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  #HTC_submit{
    width: 110px;
    height: 38px;
    border-radius: 27px;
    border: none;
    padding: 0;
    margin: 0;
    background-color: #1BB186;
    font-weight: bold;
    color: black;
    font-style: normal;
    font-size: 14px;
    line-height: 18px;
    font-family: arial;
  }
  #HTC_grid{
    margin-left: 38px;
    margin-right: 96px;
    margin-top: 9px;
  }
  #HTC_grid *{
    font-style: normal;
    font-weight: normal;
    font-size: 12px;
    line-height: 16px;
  }
  #HTC_title{
    margin-left: 38px;
    margin-top: 10px;
    font-style: normal;
    font-weight: normal;
    font-size: 14px;
    line-height: 18px;
  }
  #HTC_line{
    display: block;
    height: 1px;
    border: 0;
    border-top: 1px solid white;
    width: 100%;
    margin-top: 11px;
    margin-bottom: 3px;
  }
</style>
<div id='HTC_container'>
  <div id='HTC_detail'>
  <span id='HTC_title'>Your transactions</span>
    <table id='HTC_grid'>
      <tbody id='HTC_grid_elem'>
        <tr>
          <td>Vote on rollup features</td>
          <td>200 HBT</td>
        </tr>
        <tr>
          <td>Vote on liquidity</td>
          <td>140 HBT</td>
        </tr>
        <tr>
          <td id='HTC_line' rowspan='2'></td>
        </tr>
        <tr>
          <td id='HTC_total'>Total</td>
          <td id='HTC_total_result'>345 HBT</td>
        </tr>  
      </tbody>
    </table>
  </div>
  <div id='HTC_bar'>
    <div id='HTC_toggle'><slot></slot></div>
    <div id='HTC_abail'>
      <span>Available tokens</span>
      <span>803 HBT</span>
    </div>
    <div id ='HTC_tran'>
      <span>Transactions</span>
      <span>2(=345 HBT)</span>
    </div>
    <button id='HTC_submit'>
      SIGN (2)
    </button>
  </div>
</div>
`;

class HabitatTransactionCart extends HTMLElement {
  constructor() {
    super();

    this._closedManually = false;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    const wrapper = this.shadowRoot.querySelector('#outer');
    const self = this;
    function toggle () {
      self._closedManually = true;
      wrapper.classList.toggle('expanded');
    }
    wrapListener(wrapper, toggle);
    wrapListener(this.shadowRoot.querySelector('#close'), toggle);

    wrapListener(this.shadowRoot.querySelector('#txSign'), async () => {
      await signBatch(this._txBundle);
      wrapper.classList.toggle('expanded');
    });
  }

  connectedCallback () {
    window.addEventListener('message', this);
  }

  disconnectedCallback () {
    window.removeEventListener('message', this);
  }

  async handleEvent (evt) {
    if (!evt.data) {
      return;
    }

    if (evt.data.type === 'hbt-tx-bundle') {
      this._txBundle = evt.data.value;
      console.log("hbt-tx-bundle")
      const container = this.shadowRoot.querySelector('#txBundle');
      const grid = this.shadowRoot.querySelector('#txGrid');
      grid.innerHTML = '';
      this.shadowRoot.querySelector('#count').textContent = `${evt.data.value.length}`;

      for (const tx of evt.data.value) {
        const e = document.createElement('p');
        e.textContent = `${tx.info}`;
        grid.append(e);
      }

      if (!this._closedManually) {
        const wrapper = this.shadowRoot.querySelector('#outer');
        if (evt.data.value.length) {
          wrapper.classList.add('expanded');
        } else {
          wrapper.classList.remove('expanded');
        }
      }

      return;
    }

    if (evt.data.type === 'hbt-balance-tracker-update') {
      console.log("hbt-balance-tracker-update")
      const obj = evt.data.value;
      const token = await getTokenV2(obj.tokenAddress);
      const { available } = await BalanceTracker.stat(token, obj.delegationMode);
      this.shadowRoot.querySelector('#bal').textContent = `${renderAmount(~~available, 0, 1)} ${token.symbol} remaining`;
      return;
    }
  }
}
customElements.define('habitat-transaction-cart', HabitatTransactionCart);