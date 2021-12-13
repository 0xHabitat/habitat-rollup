
import {
	getTokenV2,
	renderAmount,
	getConfig,
} from "/lib/utils.js";

import {
    getProposalInformation,
    signBatch,
    queryTransactionHashForProposal,
    fetchProposalStats,
} from "/lib/rollup.js";
import BalanceTracker from "./BalanceTracker.js";

const { HBT } = getConfig();
var transactions = [];
var delegationMode = false;

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
    padding: 16px 25px;
    display: flex;
}

#inner > .block{
    padding: 0 15px;
    text-align: center;
}

#inner > .block .availableTokens {
    display: flex;
    justify-content: center;
}

#inner > .block .availableTokens img{
    height: 16px;
    width: 16px;
    margin-right: 8px;
}

#inner > .block > div{
    margin-bottom: 8px;
}



.voting-basket-detail {
    display: flex;
    flex-direction: column;
    border-radius: 20px 20px 0px 0px;
    margin: 0 75px;
    background-color: var(--color-bg);
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
    border-radius: 30px 0px;
    z-index: 9;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    background-color: var(--color-bg);


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

.detail-expanded .actionButton {
    background-color: #1BB186;
}

.actionButton {
    cursor: pointer;
    background-color: #FFFDB0;
    padding: 10px;
    border: 0;
    color: black;
    border-radius: 20px;
    font-weight: bold;
    height: 100%;
    min-width: 100px;
    font-size: 14px;
}
.actionButton.disabled {
    background-color: #dddddd;
    pointer-events: none;
}

</style>
<div id='wrapper'>
     <div class="voting-basket-detail">
        <div class="inner">
            <div class="title">Your Transaction</div>
            <space></space>
            <div class="basket-list">
            </div>
            <hr>
            <div class="basket-list-total">
                <div class="name">Total</div>
                <div class="price"></div>
            </div>
        </div>
     </div>
    <div class="voting-basket">
        <div id="inner">
            <div class="block">
              <habitat-toggle
              id='delegateModeToggle'
              left='Personal Mode'
              tooltip-left='Your personal voting power'
              right='Delegation Mode'
              tooltip-right='Voting power delegated to you'
              column-mode='true'
            ></habitat-toggle>
        </div>
        <div class="block">
            <div>Available Tokens</div>
            <div class="availableTokens">
                <img slot="body">
                <div id="tokenBalance"></div>
            </div>
        </div>
        <div class="block">
            <div>Transactions</div>
            <div id="transactionSummary">
            <span id="transactionsCount"></span>
            <span id="transactionsTokenAmount"></span>
            </div>
        </div>
        <div >
            <button class='actionButton bold disabled'>CONFIRM</button>
        </div>
    </div>
</div>
`;



class HabitatVotingBasket extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

		this.shadowRoot.querySelector("#delegateModeToggle").addEventListener(
			"toggle",
			() => {
				this.toggleDelegationMode();
				this.dispatchEvent(new Event("habitatToggle"));
			},
			false
		);

		this.shadowRoot.querySelector(".actionButton").addEventListener(
			"click",
			async () => {
				if (this.shadowRoot.querySelector("#sign.actionButton")) {
                    var result = await signBatch(this._txBundle);
                    this.transactions = [];
				} else {
					this.setActionButtonSign();
				}
			},
			false
		);
        

		this.render();
		window.addEventListener("message", this);
	}

	getTransactionCount() {
		return transactions.length;
	}

	async handleEvent(evt) {
        if (evt.data.type === "hbt-tx-bundle") {
            this._txBundle = evt.data.value;
            
            var balanceTrackResult = {};
            var token = null;
			this.closeBasketDetail();
			const records = BalanceTracker.records;
			if (evt.data.value.length > 0) {
				for (const tx of evt.data.value) {
					const proposalId = tx.message.proposalId;
					const txHash = await queryTransactionHashForProposal(proposalId);
					let getProposalInformationData = await getProposalInformation(txHash);
					const communityId = getProposalInformationData.communityId;
                    const fetchProposalStatsData = await fetchProposalStats({ proposalId, communityId });
                    token = fetchProposalStatsData.token;
					const key = token.address + (delegationMode ? "1" : "0");
				    balanceTrackResult = await BalanceTracker.stat(token, delegationMode);

					var transactionItem = transactions.find((obj) => {
						return obj.key === proposalId;
					});
					const transaction = {
						key: proposalId,
						name: getProposalInformationData.title,
						price: records[key][proposalId],
					};
					if (transactionItem) {
						//create new Basketlist-Item
						this.updateBasketListItem(transaction, transactionItem, token);
					} else {
						transactions.push(transaction);
						this.createBasketListItem(transaction, token);
					}

					continue;
				}
			} else {
				//hbt-tx-bundle event when the count is reduced to 0, but without proposal-ID.Search transactions array and update all prices
				var recordG = null;
				var transactionIndex = transactions.findIndex((transaction) => {
					var record123 = Object.keys(records).find((record) => {
						if (records[record][transaction.key] === 0) {
							return record;
						}
					});
					recordG = record123;
					if (record123) {
						return true;
					}
				});
				const transaction = transactions[transactionIndex];
				if (!transaction) {
					return;
				}

				const proposalId = transaction.key;
				const txHash = await queryTransactionHashForProposal(proposalId);
				let getProposalInformationData = await getProposalInformation(txHash);
				const communityId = getProposalInformationData.communityId;
				const fetchProposalStatsData = await fetchProposalStats({ proposalId, communityId });
				const token = fetchProposalStatsData.token;
				// const key = token.address + (delegationMode ? "1" : "0");
				balanceTrackResult = await BalanceTracker.stat(token, delegationMode);

				const newTransaction = transaction;
				newTransaction.price = records[recordG][transaction.key];
				this.updateBasketListItem(newTransaction, transaction);
				transactions.splice(transactionIndex, 1);
			}
			this.renderBasketListTotalPrice(balanceTrackResult, token);

			if (balanceTrackResult.total - balanceTrackResult.available === 0) {
				this.renderTransactionsCount([]);
			} else {
				this.renderTransactionsCount(evt.data.value);
			}

			this.disableActionButtonConfirm();
			const e = this.shadowRoot.querySelector(".actionButton");

			return;
		}

		if (evt.data.type === "hbt-balance-tracker-update") {
			// const obj = evt.data.value;
			const obj = evt.data.value;
			const token = await getTokenV2(obj.tokenAddress);
			const { total, available } = await BalanceTracker.stat(token, delegationMode);
			delegationMode = obj.delegationMode;
			this.renderTransactionsSummary(total, available, token);
			return;
		}
	}

	renderTransactionsSummary(total, available, token) {
		// var transactionsCount = this.getTransactionCount();
		const transactionsTokenAmountSelector = this.shadowRoot.querySelector("#transactionsTokenAmount");
		transactionsTokenAmountSelector.textContent = `(=${renderAmount(total - available, 0, 1)} ${token.symbol})`;
	}

	renderTransactionsCount(transactions) {
		const transactionsCountSelector = this.shadowRoot.querySelector("#transactionsCount");
		transactionsCountSelector.textContent = transactions.length;
	}

    renderBasketListTotalPrice(balanceTrackResult, token) {
        if (!token) {
            token = "HBT";
        }
        const priceTotal = balanceTrackResult.total - balanceTrackResult.available;
		const basketListTotal = this.shadowRoot.querySelector(".basket-list-total .price");
        basketListTotal.innerHTML = `${priceTotal} ${token.symbol}`;
	}

	updateBasketListItem(newTransaction, oldTransaction, token) {
		const proposalId = newTransaction.key;
		const price = newTransaction.price;
		const basketList = this.shadowRoot.querySelector(".basket-list");
		const basketListItem = basketList.querySelector(`[hash="${proposalId}"]`);
		if (!basketListItem) {
			return;
		}

		if (newTransaction.price === 0) {
			basketListItem.parentElement.removeChild(basketListItem);
		} else {
			oldTransaction.price = newTransaction.price;
			basketListItem.querySelector(".price").innerHTML = `${price} ${token.symbol}`;
		}
	}

    createBasketListItem(transaction, token) {
		const basketList = this.shadowRoot.querySelector(".basket-list");
		const proposalId = transaction.key;
		const price = transaction.price;
		const title = "Vote on " + transaction.name;
		const basketListItem = document.createElement("div");
		basketListItem.setAttribute("hash", proposalId);
		basketListItem.className = "basket-list-item";
		const namePointer = document.createElement("div");
		namePointer.className = "name";
		namePointer.innerHTML = title;
		const pricePointer = document.createElement("div");
		pricePointer.className = "price";
		pricePointer.innerHTML = `${price} ${token.symbol}`;
		basketListItem.prepend(pricePointer);
		basketListItem.prepend(namePointer);
		basketList.prepend(basketListItem);
	}

	setActionButtonSign() {
        const e = this.shadowRoot.querySelector(".actionButton");
        e.id = "sign";
		this.shadowRoot.querySelector("#wrapper").classList.add("detail-expanded");
		const count = this.getTransactionCount();
		e.textContent = `SIGN(${count})`;
	}

	setActionButtonConfirm() {
        const e = this.shadowRoot.querySelector(".actionButton");
        e.id = "confirm";
		e.textContent = "CONFIRM";
	}

	closeBasketDetail() {
		this.shadowRoot.querySelector("#wrapper").classList.remove("detail-expanded");
		this.setActionButtonConfirm();
	}

	disableActionButtonConfirm() {
		const e = this.shadowRoot.querySelector(".actionButton");
		if (transactions.length === 0) {
			this.setActionButtonConfirm();
			e.classList.add("disabled");
		} else {
			e.classList.remove("disabled");
		}
	}

	toggleDelegationMode() {
		delegationMode = !delegationMode;
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

	async render() {
		const token = await getTokenV2(HBT);
		this.renderTransactionsSummary(0, 0, token);
		const { available } = await BalanceTracker.stat(token, delegationMode);
		const tokenBalanceSelector = this.shadowRoot.querySelector("#tokenBalance");
		tokenBalanceSelector.innerHTML = `${available} ${token.symbol}`;
		this.shadowRoot.querySelector("img").src = token.logoURI;
		this.renderTransactionsCount([]);
	}
}
customElements.define("habitat-voting-basket", HabitatVotingBasket);
