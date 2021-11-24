import { 
  getSigner, 
  checkScroll, 
  wrapListener,  
  walletIsConnected } from '/lib/utils.js';
import { 
  getProviders, 
  pullEvents, 
  getMetadataForTopic,
  queryTransfers } from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import '/lib/HabitatCommunityPreviewCreator.js';
import './HabitatFlipCard.js';

//import { COMMON_STYLESHEET } from './component.js';

const SVG_SORT_ICON = `<svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.888,9.113L11.888,0.801L20.2,0.801L20.2,9.113L11.888,9.113ZM19.018,1.982L13.092,1.982L13.092,7.909L19.018,7.909L19.018,1.982ZM0.8,11.891L9.112,11.891L9.112,20.2L0.8,20.2L0.8,11.891ZM1.982,19.018L7.914,19.018L7.914,13.091L1.982,13.091L1.982,19.018ZM0.8,0.801L9.112,0.801L9.112,9.113L0.8,9.113L0.8,0.801ZM1.982,7.931L7.914,7.931L7.914,2.004L1.982,2.004L1.982,7.931ZM16.044,17.333L19.508,13.474L20.2,13.474L20.2,14.534L16.535,18.613L15.574,18.613L11.888,14.534L11.91,13.474L12.601,13.474L16.044,17.333Z" fill="black"/>
</svg>`

const COMMUNITY_PREVIEW_TEMPLATE = `
<style>
#community-card {
  min-height: 10em;
  width:100%;
  height:100%;
}
#front-title {
  height:25%;
  padding: 1rem 2rem;
}
#banner-container {
  width:100%;
  aspect-ratio: 2/1;
}
#front-banner {
  width:100%;
  height:100%;
  border-radius: 2em;
  background:white;
  overflow:hidden;
}
#front-banner img {
  width:100%;
  height:100%;
  display: block;
  object-fit:cover;
}

#description-card {
  min-height: 11em;
  height: var(--backHeight);
  width: var(--backWidth);
}
#description-card * {
  color: var(--color-text-invert);
}
#back-title {
  height:20%;
  padding: 1rem 2rem;
}
#description {
  padding: 1rem 2rem;
  height: 90%;
  cursor:default;
}
#details {
  height:85%;
  min-width:11em;
  overflow:auto;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
#details::-webkit-scrollbar {
  display: none;
}
</style>
<habitat-flip-card>
  <div slot='front'>
    <div id='community-card'>
      <div id='front-title' class='titles'>
        <a class='title'></a>
      </div>
      <div id='banner-container'>
        <div id='front-banner'>
          <a id='banner'><img></a>
        </div>
      </div>
    </div>
  </div>
  <div slot='back'>
    <div id='description-card'>
      <div id='back-title'>
        <a class='title'></a>
      </div>
        <div id='description'>
          <p id='details'></p>
        </div>
    </div>
  </div>
</habitat-flip-card>
`;

class HabitatCommunities extends HabitatPanel {
  
  static TEMPLATE =
  `
  <style>
  #communities, #user-communities {
    gap: 2em;
    margin-bottom: 5em;
  }
  .flip-card {
    cursor: pointer;
    min-width: 15em;
    max-width: 30em;
    flex: 1 1 0;
  }
  #buttons * {
    margin-right: 0;
  }
  #create-community {
    visibility:hidden;
  }
  #create-community.visible {
    visibility:visible;
  }
  #create-community.active {
    background: var(--color-bg-invert);
    color: var(--color-text-invert);
    transition: all .2s linear;
  }
  #sort {
    display: block;
    padding: .375em 1em;
    margin-left: .5em;
  }
  #sort > svg > path {
    fill: var(--color-text);
  }
  #sort-dropdown {
    display:none;
  }
  #sort-dropdown.active {
    display:block;
  }
  #sort-options {
    position:absolute;
    right:5%;
    margin-top:2em;
    z-index:1;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
    outline: none;
  }
  #sort-options * {
    display:block;
    padding:1em 0;
    cursor:pointer;
    color: var(--color-text);
  }
  #user-section {
    display: none;
  }
  #user-section.visible {
    display: block;
  }

  
  </style>
  <div style='width:90%;margin-left:auto;margin-right:auto;position:relative;'>

    <space></space>

    <div style='position:absolute;right:0;padding:1rem 0;'>
      <div id='buttons' class='flex row' style='place-content:flex-end;'>
        <button id='create-community'>Create</button>
        <button id='sort'>${SVG_SORT_ICON}</button>
        <div id='sort-dropdown' style='position:relative;'>
          <ul class='box' id='sort-options'>
            <li id='sort-az' >A - Z</li>
            <li id='sort-za' >Z - A</li>
            <li id='sort-recent' >Recent</li>
          </ul>
        </div>
      </div>
    </div>

    <div id='creating-community'>
    </div>

    <div id='user-section'>
      <p class='xl light' style='padding:2rem 0;'><span><emoji-herb></emoji-herb><span> Your Communities</span></span></p>
      <div id='user-communities' class='flex row center evenly'></div>
    </div>
    <div>
      <p class='xl light' style='padding:2rem 0;'><span><emoji-camping></emoji-camping><span> Communities on Habitat</span></span></p>
      <div id='communities' class='flex row center evenly'></div>
    </div>

  </div>
  `;

  constructor() {
    super();

    this.tokens = []; //compare w each community token
    //if user has a community's token, toggle once
    this.userSection = this.shadowRoot.querySelector('#user-section');

    // sorting arrays
    this.communities = [];
    this.userCommunities = [];

    //append to containers & _loadeds
    this.container = this.shadowRoot.querySelector('#communities');
    this.userContainer = this.shadowRoot.querySelector('#user-communities');
    this._loaded = {};
    this._userLoaded = {};
    checkScroll(
      this.shadowRoot.querySelector('#content'),
      () => {
        for (const community of this.communities) {
          if (!this._loaded[community.transactionHash]) {
            this._loaded[community.transactionHash] = true;
            this.renderCommunity(this.container, community);
          }
        }
      }
    );
    this._userLoad(
      () => {
        for (const community of this.userCommunities) {
          if (!this._userLoaded[community.transactionHash]) {
            this._userLoaded[community.transactionHash] = true;
            this.renderCommunity(this.userContainer, community);
          }
        }
      }
    );

    this.sortBtn = this.shadowRoot.querySelector('button#sort');
    this.dropdown = this.shadowRoot.querySelector('#sort-dropdown');
    this.selector = this.shadowRoot.querySelector('#sort-options');
    this.sortBtn.addEventListener('click', evt => {
        evt.stopPropagation();
        this.dropdown.classList.toggle('active');
        if (this.dropdown.classList.contains('active')) {
          this.selector.addEventListener('click', evt => {
            if (evt.target.id.startsWith('sort-') && !evt.target.id.match('sort-options')) {
              this.userContainer.innerHTML = '';
              this._userLoaded = {};
              this.container.innerHTML = '';
              this._loaded = {};

              if (evt.target.id === 'sort-az') {
                this.communities.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1);
                this.userCommunities.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1);
              }
              if (evt.target.id === 'sort-za') {
                this.communities.sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase()) ? 1 : -1);
                this.userCommunities.sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase()) ? 1 : -1);
              }
              if (evt.target.id === 'sort-recent') {
                this.communities.sort((a, b) => (a.block < b.block) ? 1 : -1);
                this.userCommunities.sort((a, b) => (a.block < b.block) ? 1 : -1);
              }
            }
          }, false);
          //click anywhere in communities tab to close
          this.shadowRoot.addEventListener('click', evt => {
            if (!evt.target.id.startsWith('sort-')) {
              this.dropdown.classList.remove('active');
            }
          }, false);
        }
    });

  }

  get title () {
    return 'Communites';
  }

  _userLoad (callback) {
    async function _check () {
      await callback();
      window.requestAnimationFrame(_check);
    }
    _check();
  }

  //render elements
  async render () {
    const { habitat } = await getProviders();

    if (walletIsConnected()) {
      this.shadowRoot.querySelector('button#create-community').classList.toggle('visible');
      const signer = await getSigner();
      let address = await signer.getAddress();
      this.tokens = (await queryTransfers(address)).tokens;
    }

    wrapListener(
      this.shadowRoot.querySelector('#create-community'),
      (evt) => {
        let createCommunityCard = this.shadowRoot.querySelector('habitat-community-preview-creator');
        if (createCommunityCard) {
          throw new Error('Only one card allowed at a time');
        }
        else {
          this.shadowRoot.querySelector('button#create-community').classList.toggle('active');
          this.shadowRoot.querySelector('#creating-community').prepend(document.createElement('habitat-community-preview-creator'));
        }
      }
    );
    
    const HBT = '0x0aCe32f6E87Ac1457A5385f8eb0208F37263B415';
    const filter = habitat.filters.CommunityCreated();
    filter.toBlock = await habitat.provider.getBlockNumber();
    for await (const evt of pullEvents(habitat, filter, filter.toBlock)) {
        const { communityId, governanceToken } = evt.args;
        const metadata = await getMetadataForTopic(communityId);
        // const memberCount = await habitat.callStatic.getTotalMemberCount(communityId);
        const community = {
          transactionHash: evt.transactionHash,
          name: metadata.title,
          link: `#habitat-community,${evt.transactionHash}`,
          token: governanceToken,
          // members: memberCount,
          block: evt.block,
          details: metadata.details,
          banner: metadata.bannerCid
        }
        if (this.tokens.length > 0 && this.tokens.includes(community.token) && !community.token.includes(HBT) && !this.userCommunities[evt.transactionHash]) {
          if (!this.userSection.classList.contains('visible')) {
            this.userSection.classList.toggle('visible');
          }
          this.userCommunities.push(community);
        }
        
        if (!this.communities[evt.transactionHash]) {
          this.communities.push(community);
        }

    }
  }
  async renderCommunity (container, community, prepend = false) {
    const ele = document.createElement('div');
    ele.innerHTML = COMMUNITY_PREVIEW_TEMPLATE;
    ele.classList.add('flip-card');

    ele.dataset.name = community.name;
    ele.dataset.block = community.block;

    let titles = ele.querySelectorAll('a.title');
    for (const title of titles) {
      title.textContent = (community.name ? community.name : '') || '???';
      title.href = community.link;
    }
    ele.querySelector('a#banner').href = community.link;

    ele.querySelector('p#details').innerHTML = community.details;

    if (community.banner) {
      ele.querySelector('img').src = `https://${community.banner}.ipfs.infura-ipfs.io/`;
    } else {
      ele.querySelector('img').src = `https://bafkreiawxlr6ljlqitbhpxnkipsf35vefldej2r4tgoozxonilyinwohyi.ipfs.infura-ipfs.io/`;
    }

    if (prepend) {
      container.prepend(ele);
    } else {
      container.append(ele);
    }
  }

  //updater
  async chainUpdateCallback () {
    await this.fetchLatest();
  }

  //propogate newly created community
  async chainUpdateCallback () {
    await this.fetchLatest();
  }

  async fetchLatest () {
    const { habitat } = await getProviders();
    const filter = habitat.filters.CommunityCreated();
    filter.toBlock = await habitat.provider.getBlockNumber();

    for await (const evt of pullEvents(habitat, filter, 1)) {
      if (!this._loaded[evt.transactionHash]) {
        this._loaded[evt.transactionHash] = true;
        this.renderCommunity(this.container, evt, true);
      }
    }
  }
  
}
customElements.define('habitat-communities', HabitatCommunities);
