
import {
	getTokenV2,
	wrapListener,
	ethers,
	getSigner,
	walletIsConnected,
	renderAmount,
	renderAddress,
	getEtherscanLink,
	getConfig,
} from "/lib/utils.js";

import {
	doQueryWithOptions,
	getProviders,
	getDelegatedAmountsForToken,
	decodeMetadata,
	getReceipt,
    fetchModuleInformation,
    getProposalInformation,
    getTotalDelegatedAmountForToken,
    queryTransactionHashForProposal,
    fetchProposalStats,
	queryTransfers,
	lookupExecProxyForVault,
	getExecutionProxyContract,
	getMetadataForTopic,
} from "/lib/rollup.js";
import BalanceTracker from "./BalanceTracker.js";

const { HBT } = getConfig();
const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
<style>
* {
  color: var(--color-text);
  line-height: 1;
  vertical-align: bottom;
  box-sizing: border-box;
}
#inner,
pin {
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}
#inner {
    padding: 10px 25px;
    display: flex;
}

#inner > .block{
    padding: 0 15px;
}

.voting-basket-detail {
    display: flex;
    flex-direction: column;
    border-radius: 20px 20px 0px 0px;
    margin: 0 75px;
    background-color: lightblue;
}

.voting-basket-detail > .inner {
    padding: 10px 90px 10px 40px;
    text-align: left;
}

.voting-basket-detail > .inner .title {
    margin-bottom: 16px;
}

.basket-list-item, .basket-list-total{
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px
    
}

pin {
  display: block;
  position: relative;
  top: -1px;
  left: -1px;
  width: 1em;
  height: 1em;
  max-width: 1em;
  min-width: 0;
  margin: 0;
  padding: 0;
  margin-left: 0;
  border-radius: 100%;
  border: 1px solid var(--color-bg-invert);
  cursor: pointer;
  background-color: var(--color-bg);
  transition: margin .2s ease-in;
}
#inner.on {
  background-color: var(--color-bg-invert);
}
#inner.on > pin {
  margin-left: 1em;
}
#mode {
  margin: 0 .2em 0 .5em;
}
.voting-basket{
    max-width: max-content;
    padding: .5em 1em;
    border-radius: 30px 0px;
    z-index: 9;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    background-color: lightblue;


}

#tooltip {
  display: block;
  font-size: .7em;
  width: 1em;
  height: 1em;
  border-radius: .3em;
  cursor: pointer;
  align-self: start;
  background-color: var(--color-bg-invert);
  visibility: hidden;
}
#tooltip > span {
  display: block;
  line-height: .9;
  color: var(--color-bg);
}
#tooltip > #content {
  display: none;
  position: absolute;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
  transform: translateY(calc(-100% - 2.25em)) translateX(calc(-100% + 1.25em));
}
#tooltip:hover > #content {
  display: block;
}
#content {
  padding: .5em 1em;
  border-radius: .5em;
  min-width: 20em;
}
#content::before {
  content: '';
  display: block;
  position: absolute;
  right: .5em;
  bottom: -.2em;
  width: .5em;
  height: .5em;
  transform: rotateZ(45deg);
  background-color: var(--color-bg-invert);
}
#wrapper {
    position: relative;
    position: sticky;
    top: 50%;
    font-weight: 400;
    font-size: 14px;
}

#wrapper .voting-basket-detail{
    max-height: 0;
    transition: max-height .2s ease-out;
    overflow: hidden;
}

#wrapper.detail-expanded .voting-basket-detail{
    max-height: 100em;
    transition: max-height .3s ease-in;
    }

.detail-expanded #actionButton {
    cursor: pointer;
    background-color: #1BB186;
    padding: 10px;
    border: 0;
    border-radius: 20px;
    font-weight: 700
}

#actionButton {
    cursor: pointer;
    background-color: #FFFDB0;
    padding: 10px;
    border: 0;
    border-radius: 20px;
    font-weight: 700
}

</style>
<div id='wrapper'>
     <div class="voting-basket-detail">
        <div class="inner">
            <div class="title">Your Transaction</div>
            <space></space>
            <div class="basket-list">
                <div class="basket-list-item">
                    <div class="name">Vote on Rollup Features</div>
                    <div class="price">145 HBT</div>
                </div>
                <div class="basket-list-item">
                    <div class="name">Vote on Liquidity</div>
                    <div class="price">145 HBT</div>
                </div>
            </div>
            <hr>
            <div class="basket-list-total">
                <div class="name">Total</div>
                <div class="price">345 HBT</div>
            </div>
        </div>
     </div>
    <div class="voting-basket">
        <div id="inner">
            <div class="block">
                <div>Personal Mode</div>
            <div>
              <habitat-toggle
              id='delegateModeToggle'
              left='Personal Mode'
              tooltip-left='Your personal voting power'
              right='Delegation Mode'
              tooltip-right='Voting power delegated to you'
            ></habitat-toggle>
            </div>
        </div>
        <div class="block">
            <div>Available Tokens</div>
            <div id="tokenBalance"></div>
        </div>
        <div class="block">
            <div>Transactions</div>
            <div>2(=345 HBT)</div>
        </div>
        <div >
            <button class='yellow bigger bold' id="actionButton">confirm</button>
        </div>
    </div>
</div>
`;

const ATTR_LEFT = "left";
const ATTR_RIGHT = "right";
const ATTR_TOOLTIP_LEFT = "tooltip-left";
const ATTR_TOOLTIP_RIGHT = "tooltip-right";
const ATTR_SWITCH = "on";
const ATTR_HASH = "hash";


class HabitatVotingBasket extends HTMLElement {
	static transactions = [];
	static get observedAttributes() {
		return [ATTR_LEFT, ATTR_RIGHT, ATTR_TOOLTIP_LEFT, ATTR_TOOLTIP_RIGHT, ATTR_SWITCH];
	}

	constructor() {
		super();

		this.attachShadow({ mode: "open" });
		this.shadowRoot.append(TEMPLATE.content.cloneNode(true));
		this.shadowRoot.querySelector("#actionButton").addEventListener(
			"click",
			() => {
				this.shadowRoot.querySelector("#wrapper").classList.toggle("detail-expanded");
				const e = this.shadowRoot.querySelector("#actionButton");
				if (this.shadowRoot.querySelector("#wrapper").classList.contains("detail-expanded")) {
                    e.textContent = "SIGN(2)";
                    
					//TODO Function sent
				} else {
                    e.textContent = "CONFIRM";
					//TODO Function confirm
				}

				// this.dispatchEvent(new Event("toggle"));
				var b = this.shadowRoot.querySelector("#button");
				var w = this.shadowRoot.querySelector("#wrapper");
				var l = this.shadowRoot.querySelector("#list");
			},
			false
		);
		// this.render();
		window.addEventListener("message", this);
	}

	async handleEvent(evt) {
		if (!evt.data) {
			return;
		}
        if (evt.data.type === "hbt-tx-bundle") {
            var transactions = [];
            
			for (const tx of evt.data.value) {
				// const e = document.createElement("p");
				// e.textContent = `${tx.info}`;
				// grid.append(e);
				console.log("tx", tx);
				console.log("tx.info", tx.info);
				const proposalId = tx.message.proposalId;
				console.log("proposalid", proposalId);
				const txHash = await queryTransactionHashForProposal(proposalId);
				// console.log("txHashnew",txHash);
				let getProposalInformationData = await getProposalInformation(txHash);
				console.log("getProposalInformation", getProposalInformationData);
				const communityId = getProposalInformationData.communityId;
				console.log("communityId", communityId);

				const fetchProposalStatsData = await fetchProposalStats({ proposalId, communityId });
				console.log("fetchProposalStats", fetchProposalStatsData);
				const delegationMode = false;
				const key = fetchProposalStatsData.token.address + (delegationMode ? "1" : "0");
				const records = BalanceTracker.records;
                console.log("records", records[key]);
                transactions.push({
					key: proposalId,
					value: records[key][proposalId],
					name: getProposalInformationData.title,
				});
                console.log("transactions",transactions);

				// const transactions = records.find((obj) => obj.)
			}

			if (!this._closedManually) {
				// const wrapper = this.shadowRoot.querySelector("#outer");
				// if (evt.data.value.length) {
				// 	wrapper.classList.add("expanded");
				// } else {
				// 	wrapper.classList.remove("expanded");
				// }
			}

			return;
		}

		if (evt.data.type === "hbt-balance-tracker-update") {
			const obj = evt.data.value;
            console.log("evt",evt);
			console.log("obj123", obj.records);
			// const key = obj.tokenAddress + (obj.delegationMode ? "1" : "0");
			// const transactions = obj.records[key];
			// console.log("transactions", transactions);
            // var key1 = null;
            // Object.keys(transactions).forEach(function (key) {
            //     if (transactions[key] > 0) {
            //         key1 = key;
            //         console.log("key", key);
            //         console.log("transaction123", transactions[key]);

            //         // this.transactions.push(
            //         //     {
            //         //         key: key,
            //         //         value: transactions[key],
            //         //     }
            //         // )
            //     }
            // });
			// const token = await getTokenV2(obj.tokenAddress);
            // const { available } = await BalanceTracker.stat(token, obj.delegationMode);
			return;
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		alert("test");
		console.console.log("werde ich aufgerufen");
		if (name === ATTR_SWITCH) {
			const e = this.shadowRoot.querySelector("#inner");
			if (newValue === "1") {
				e.classList.add("on");
			} else {
				e.classList.remove("on");
			}
		}
		this.render();
	}

	firstClick() {
		alert("First Clicked");
		$("#actionButton").off("click").on("click", secondClick);
	}

	secondClick() {
		alert("Second Clicked");
		$("#actionButton").off("click").on("click", firstClick);
	}

	// calculateCollapsedScale () {
	//     // The menu title can act as the marker for the collapsed state.
	//     const collapsed = menuTitle.getBoundingClientRect();

	//     // Whereas the menu as a whole (title plus items) can act as
	//     // a proxy for the expanded state.
	//     const expanded = menu.getBoundingClientRect();
	//     return {
	//         x: collapsed.width / expanded.width,
	//         y: collapsed.height / expanded.height
	//     };
	// }
	async chainUpdateCallback() {
		const signer = await getSigner();
		const account = await signer.getAddress();
		const { habitat } = await getProviders();
		const token = await getTokenV2(HBT);
		console.log("test");
		console.log(token);
		const value = await token.contract.balanceOf(account);
		console.log(value);
		// balances
		{
			let account;
			if (walletIsConnected()) {
				const signer = await getSigner();
				account = await signer.getAddress();
			}

			let usedUserBalance = "-";
			let userBalance = usedUserBalance;
			let usedDelegatedBalance = usedUserBalance;
			let delegatedBalance = usedUserBalance;

			if (account) {
				const delegated = await getTotalDelegatedAmountForToken(token.address, account);
				const totalUserBalance = (await habitat.callStatic.getBalance(token.address, account)).sub(delegated);
                const voted = await habitat.callStatic.getActiveVotingStake(token.address, account);
                console.log("voted123",voted);
				userBalance = renderAmount(totalUserBalance, token.decimals);
				usedUserBalance = renderAmount(voted, token.decimals);

				const { total, used } = await getDelegatedAmountsForToken(token.address, account);
				delegatedBalance = renderAmount(total, token.decimals);
				usedDelegatedBalance = renderAmount(used, token.decimals);
			}

			this.shadowRoot.querySelector("#tokenBalance").textContent = `${userBalance} ${token.symbol}`;
		}
	}

	async render() {
		// const right = this.shadowRoot.querySelector("#inner").classList.contains("on");
		// const text = this.getAttribute(right ? ATTR_RIGHT : ATTR_LEFT);
		// this.shadowRoot.querySelector("#mode").textContent = text;

		// const tooltipText = this.getAttribute(right ? ATTR_TOOLTIP_RIGHT : ATTR_TOOLTIP_LEFT);
		// this.shadowRoot.querySelector("#tooltip").style.visibility = tooltipText ? "initial" : "hidden";
		// this.shadowRoot.querySelector("#content").innerHTML = tooltipText;
		return this.chainUpdateCallback();
	}
}
customElements.define("habitat-voting-basket", HabitatVotingBasket);
