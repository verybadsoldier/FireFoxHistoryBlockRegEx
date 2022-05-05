/**
 * HistoryBlock is an extension for maintaining a blacklist of undesirable 
 * domain names which should not be tracked by any history/session/cache/etc
 * of the browser.
 */
class HistoryBlock {

  /**
   * Simple constructor which initializes all the required listeners and 
   * components of the HistoryBlock addon.
   */
  constructor() {
    this.createContextMenuItems();
    this.attachEventListeners();
  }

  /**
   * Creates the HistoryBlock context menu items.
   */
  createContextMenuItems() {
    browser.contextMenus.create({
      id: "blockthis",
      title: browser.i18n.getMessage('block'),
      contexts: ["all"]
    });

    browser.contextMenus.create({
      id: "unblockthis",
      title: browser.i18n.getMessage('unblock'),
      contexts: ["all"]
    });
  }

  /**
   * Attaches the various HistoryBlock event listeners.
   */
  attachEventListeners() {
    browser.history.onVisited.addListener(
      info => this.onPageVisited(info)
    );
    browser.contextMenus.onClicked.addListener(
      (info, tab) => this.onContextMenuItemClicked(info, tab)
    );
    browser.runtime.onMessage.addListener( 
      message => this.onMessage(message) );
  }

  /**
   * Called whenever a message is sent from another extension (or options page).
   *
   * @return {Promise} promise
   *         A Promise that is fulfilled after the given message has been 
   *         handled.
   */
  async onMessage(message) {
    switch(message.action) {
      case 'addToBlacklist':
        return this.block(message.url);
      case 'importBlacklist':
        return this.importBlacklist(message.blacklist);
      case 'removeFromBlacklist':
        return this.unblock(message.url);
      case 'clearBlacklist':
        return this.clearBlacklist();
      case 'changeListMode':
        await this.changeListMode(message.listMode);
      }
  }

  /**
   * Called when one of the context menu items is clicked. Largely this is just
   * a router for the different types of context menu clicks.
   *
   * @param  {object} info
   *         The data about the context menu click.
   * @param  {object} tab
   *         The tab in which the context menu click occurred.
   * @return {Promise} promise
   *         A promise that is fulfilled after the context menu click has been
   *         handled.
   */
  async onContextMenuItemClicked(info, tab) {
    switch(info.menuItemId) {
      case "blockthis":
        return this.block(tab.url);
      case "unblockthis":
        return this.unblock(tab.url);
    }
  }

  /**
   * Called when a page finishes loading completely and is added to history. If
   * the domain name of the url of this visit exists in the HistoryBlock 
   * blacklist, then remove the url from the history.
   *
   * @param  {object} info
   *         The data about the visit.
   * @return {Promise} promise
   *         A Promise that is fulfilled after a page has been visited and 
   *         then potentially removed from the browser history.
   */
  async onPageVisited(info) {
    let blacklist = await this.getBlacklist();

    console.error('URL: ' + info.url);
    
    let storage = await browser.storage.sync.get();

    let isBlacklist = storage.listMode === 'blacklist';
    let found = false;
    for(let i = 0; i < blacklist.length; i++) {
      console.error('Checking match: ' + blacklist[i]);
      var re = new RegExp(blacklist[i]);
      if (re.test(info.url)) {
        found = true;
        break;
      }
    }

    if((isBlacklist && found) || (!isBlacklist && !found)) {
      console.error('BLOCKED');
      await browser.history.deleteUrl({'url': info.url});
    }
    else {
      console.error('no blocked');
    }
  }

  /**
   * Empties out the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that is fulfilled after the blacklist has been cleared.
   */
  async clearBlacklist() {
    await browser.storage.sync.remove('blacklist');

    // Re-initializes the object.
    await this.getBlacklist();

    // Purposefully do not wait for this Promise to be fulfilled.
    browser.runtime.sendMessage({action: 'blacklistUpdated'});
  }

  /**
   * Retrieves the blacklist from browser storage.
   *
   * @return {Promise} promise
   *         A Promise that is fulfilled with the value of the blacklist.
   */
  async getBlacklist() {
    let storage = await browser.storage.sync.get();

    if(!storage.blacklist) {
      await browser.storage.sync.set({blacklist:[]});

      storage = await browser.storage.sync.get();
    }

    return storage.blacklist;
  }

  /**
   * Attempts to import the list of hashes into the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that is fulfilled when the given list of hashes have
   *         been imported into the blacklist.
   */
  async importBlacklist(list) {
    if(list) {
      let blarr = list.split(',');
      let blacklist = await this.getBlacklist();

      for(let i = 0; i < blarr.length; i++) {
        let hash = blarr[i].trim();
        if(!blacklist.includes(hash) && this.hash.test(hash)) {
          blacklist.push(hash);
        }
      }

      await browser.storage.sync.set({blacklist:blacklist});

      // Purposefully do not wait for this Promise to be fulfilled.
      browser.runtime.sendMessage({action: 'blacklistUpdated'});
    }
  }

  /**
   * Attempts to blacklist the domain name of the given url.
   *
   * @param  {string} url
   *         The url to add to the blacklist.
   * @return {Promise} promise
   *         A Promise that is fulfilled after the given URL is potentially
   *         added to the blacklist.
   */
  async block(regex) {
    let blacklist = await this.getBlacklist();

    if(!blacklist.includes(regex)) {
      blacklist.push(regex);

      await browser.storage.sync.set({blacklist:blacklist});

      console.error('Block: ' + blacklist);

      // Purposefully do not wait for this Promise to be fulfilled.
      browser.runtime.sendMessage({action: 'blacklistUpdated'});
    }
  }

  /**
   * Attempts to unblacklist the domain name of the url of the given tab.
   *
   * @param  {string} url
   *         The url to remove from the blacklist.
   * @return {Promise} promise
   *         A Promise that is fulfilled after the given URL is potentially
   *         removed from the blacklist.
   */
  async unblock(regex) {
    let blacklist = await this.getBlacklist();

    if(blacklist.includes(regex)) {
      blacklist.splice(blacklist.indexOf(regex), 1);

      await browser.storage.sync.set({blacklist:blacklist});

      // Purposefully do not wait for this Promise to be fulfilled.
      browser.runtime.sendMessage({action: 'blacklistUpdated'});
    }
  }
  
  async changeListMode(listMode) {
    if(!listMode) {
      listMode = await browser.storage.sync.get('listMode');
      listMode = listMode.listMode;
    }
    await browser.storage.sync.set({listMode: listMode});
  }
}

// Instantiate the HistoryBlock addon.
new HistoryBlock();