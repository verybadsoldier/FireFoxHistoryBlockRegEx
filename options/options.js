class Options {
  constructor() {
    console.error('ctor');
    this.attachDOMListeners();
    
    browser.runtime.onMessage.addListener(
      message => this.onMessage(message) );

    this.renderBlacklist();
    this.renderListMode();
  }

  /**
   * Attaches the event listeners to the DOM.
   */
  attachDOMListeners() {
    document.querySelector("#resetBlacklist").addEventListener(
      "click", () => this.resetBlacklist());
    document.querySelector("#addToBlacklist").addEventListener(
      "click", () => this.addToBlacklist());
    document.querySelector("#removeFromBlacklist").addEventListener(
      "click", () => this.removeFromBlacklist());
    document.querySelector("#import").addEventListener(
      "click", () => this.importBlacklist() );
    document.querySelector("#listmode").addEventListener(
      "change", event => this.changeListMode(event.target.value));
  }

  /**
   * Fired when a message is received from another extension or background 
   * script.
   *
   * @param {string} message
   *        The message.
   * @return {Promise} promise
   *         A Promise that will be fulfilled when the message has been 
   *         handled.
   */
  async onMessage(message) {
    switch(message.action) {
      case "blacklistUpdated":
        return this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock clear the blacklist.
   * 
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist has been 
   *         cleared.
   */
  async resetBlacklist() {
    if(confirm(browser.i18n.getMessage('resetBlacklist'))) {
      await browser.runtime.sendMessage({action: 'clearBlacklist'});
      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock add the given URLs to the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async addToBlacklist() {
    console.error('addToBlacklist');

    let input = prompt(browser.i18n.getMessage('addUrl'));
    if(input) {
      let urls = input.split(',');

      for(let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({action: 'addToBlacklist', url: urls[i]});
      }

      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock import the given blacklist.
   * 
   * @return {Promise} blacklist
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async importBlacklist() {
    let blacklist = prompt(browser.i18n.getMessage('importBlacklist'));

    if(blacklist) {
      await browser.runtime.sendMessage({action: 'importBlacklist', blacklist: blacklist});
    }
  }

  /**
   * Sends a message to have HistoryBlock remove the given URLs from the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the input has been removed
   *         from the blacklist.
   */
  async removeFromBlacklist() {
    let input = prompt(browser.i18n.getMessage('removeUrl'));
    if(input) {
      let urls = input.split(',');

      for(let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({action: 'removeFromBlacklist', url: urls[i]});
      }

      await this.renderBlacklist();
    }
  }

  async changeListMode(listMode) {
    if(listMode === 'whitelist' || listMode === 'blacklist') {
      await browser.runtime.sendMessage({action: 'changeListMode', listMode: listMode});
    }
      
    await this.renderBlacklistMatching();
  }

  /**
   * Renders the blacklist matching technique controls.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist URL matching
   *         technique elements have been rendered.
   */
  async renderBlacklistMatching() {
    let storage = await browser.storage.sync.get();

    let radios = document.querySelectorAll('#blacklistmatching input');

    for(let i=0; i<radios.length; i++) {
      let radio = radios[i];
      if(radio.value === storage.matching) {
        radio.checked = true;
      }
    }
  }

  async renderListMode() {
    console.error('Optfffffsdf');

    let storage = await browser.storage.sync.get();

    let radios = document.querySelectorAll('#listmode input');

    for(let i=0; i<radios.length; i++) {
      console.error('Optfffffsdff1111');
      let radio = radios[i];
      if(radio.value === storage.listMode) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist has been 
   *         rendered.
   */
  async renderBlacklist() {
    let storage = await browser.storage.sync.get();

    if(storage.blacklist) {
      let el = document.querySelector("#blacklist");
      el.innerHTML = null;
      storage.blacklist.forEach( (regex) => {
        let li = document.createElement('li');
        li.innerHTML = regex;
        el.appendChild(li);
      });
    }
  }
}

new Options();