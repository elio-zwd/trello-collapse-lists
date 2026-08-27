(() => {
  "use strict";

  const SELECTORS = {
    list: "[data-testid='list']",
    wrapper: "[data-testid='list-wrapper']",
    header: "[data-testid='list-header']",
    name: "[data-testid='list-name']",
    cards: "[data-testid='trello-card']",
    legacyCards: "[data-testid='list-card']"
  };

  let scanScheduled = false;

  function getBoardKey() {
    const match = window.location.pathname.match(/^\/b\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getListName(list) {
    return list.querySelector(SELECTORS.name)?.textContent?.trim().replace(/\s+/g, " ") || "";
  }

  function getStorageKey(list) {
    const boardKey = getBoardKey();
    const listName = getListName(list);
    if (!boardKey || !listName) return null;

    // Keep the original extension's key format so existing collapse state can be reused.
    return `${boardKey}:${encodeURI(listName)}`;
  }

  function getCardCount(list) {
    const currentCards = list.querySelectorAll(SELECTORS.cards).length;
    return currentCards || list.querySelectorAll(SELECTORS.legacyCards).length;
  }

  function getWrapper(list) {
    return list.closest(SELECTORS.wrapper) || list.parentElement;
  }

  function updateCollapsedView(list) {
    const name = getListName(list) || "List";
    const count = getCardCount(list);
    const collapsedView = list.querySelector(":scope > .ctl-collapsed-view");
    if (!collapsedView) return;

    const nameNode = collapsedView.querySelector(".ctl-collapsed-name");
    const countNode = collapsedView.querySelector(".ctl-card-count");
    if (nameNode) nameNode.textContent = name;
    if (countNode) {
      countNode.textContent = String(count);
      countNode.setAttribute("aria-label", `${count} cards`);
    }
    collapsedView.setAttribute("aria-label", `Expand list ${name}`);
    collapsedView.title = `Expand list: ${name}`;
  }

  function applyCollapsedState(list, collapsed) {
    list.classList.toggle("ctl-collapsed", collapsed);
    getWrapper(list)?.classList.toggle("ctl-wrapper-collapsed", collapsed);

    const toggle = list.querySelector(".ctl-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Expand list" : "Collapse list");
      toggle.title = collapsed ? "Expand list" : "Collapse list";
    }

    updateCollapsedView(list);
  }

  async function persistCollapsedState(list, collapsed) {
    const key = getStorageKey(list);
    if (!key) return;

    list.dataset.ctlStorageKey = key;
    if (collapsed) {
      await chrome.storage.local.set({ [key]: true });
    } else {
      await chrome.storage.local.remove(key);
    }
  }

  async function toggleList(list) {
    const collapsed = !list.classList.contains("ctl-collapsed");
    applyCollapsedState(list, collapsed);
    try {
      await persistCollapsedState(list, collapsed);
    } catch (error) {
      console.warn("[Collapsible Trello Lists] Failed to save list state", error);
    }
  }

  async function syncStoredState(list, force = false) {
    const key = getStorageKey(list);
    if (!key) return;

    if (!force && list.dataset.ctlStorageKey === key) {
      updateCollapsedView(list);
      return;
    }

    list.dataset.ctlStorageKey = key;
    try {
      const stored = await chrome.storage.local.get(key);
      applyCollapsedState(list, stored[key] === true);
    } catch (error) {
      console.warn("[Collapsible Trello Lists] Failed to read list state", error);
    }
  }

  function createToggle(list, header) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ctl-toggle";
    toggle.setAttribute("aria-label", "Collapse list");
    toggle.setAttribute("aria-expanded", "true");
    toggle.title = "Collapse list";

    const icon = document.createElement("span");
    icon.className = "ctl-toggle-icon";
    icon.setAttribute("aria-hidden", "true");
    toggle.appendChild(icon);

    toggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      void toggleList(list);
    });

    header.prepend(toggle);
  }

  function createCollapsedView(list) {
    const collapsedView = document.createElement("button");
    collapsedView.type = "button";
    collapsedView.className = "ctl-collapsed-view";

    const icon = document.createElement("span");
    icon.className = "ctl-expand-icon";
    icon.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "ctl-collapsed-name";

    const count = document.createElement("span");
    count.className = "ctl-card-count";

    collapsedView.append(icon, name, count);
    collapsedView.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      void toggleList(list);
    });

    list.appendChild(collapsedView);
    updateCollapsedView(list);
  }

  function bindList(list) {
    const header = list.querySelector(SELECTORS.header);
    const name = list.querySelector(SELECTORS.name);
    if (!header || !name) return;

    if (!list.dataset.ctlInitialized) {
      list.dataset.ctlInitialized = "true";
      createToggle(list, header);
      createCollapsedView(list);
      void syncStoredState(list, true);
      return;
    }

    // Trello can rename lists and replace parts of a list without a full page reload.
    // Re-create controls if React replaced either node and refresh storage if the title changed.
    if (!header.querySelector(".ctl-toggle")) createToggle(list, header);
    if (!list.querySelector(":scope > .ctl-collapsed-view")) createCollapsedView(list);
    void syncStoredState(list);
  }

  function scan() {
    scanScheduled = false;
    if (!getBoardKey()) return;
    document.querySelectorAll(SELECTORS.list).forEach(bindList);
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    window.setTimeout(scan, 50);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    document.querySelectorAll(`${SELECTORS.list}[data-ctl-storage-key]`).forEach(list => {
      const key = list.dataset.ctlStorageKey;
      if (key && Object.prototype.hasOwnProperty.call(changes, key)) {
        applyCollapsedState(list, changes[key].newValue === true);
      }
    });
  });

  scheduleScan();
})();
