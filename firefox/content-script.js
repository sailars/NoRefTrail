const DEFAULTS = {
  enabled: true,
  domains: []
};

let enabled = true;
let sourceRoots = [];

const protectedLinks = new Set();
const originalPolicies = new WeakMap();

function sanitizeDomains(domains) {
  if (!Array.isArray(domains)) return [];

  const result = [];
  for (const value of domains) {
    if (typeof value !== "string") continue;
    const domain = value.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
    if (!domain || result.includes(domain)) continue;
    result.push(domain);
  }
  return result;
}

function domainMatches(hostname, domain) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return host === domain || host.endsWith(`.${domain}`);
}

function updateSourceRoots(domains) {
  const host = location.hostname.toLowerCase().replace(/\.$/, "");
  sourceRoots = domains.filter((domain) => domainMatches(host, domain));
}

function isExternalHttpLink(element) {
  if (!enabled || sourceRoots.length === 0) return false;

  let url;
  try {
    url = new URL(element.href, document.baseURI);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const targetHost = url.hostname.toLowerCase().replace(/\.$/, "");
  return !sourceRoots.some((domain) => domainMatches(targetHost, domain));
}

function protectLink(element) {
  if (!(element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement)) {
    return;
  }

  if (!element.hasAttribute("href")) {
    return;
  }

  if (isExternalHttpLink(element)) {
    if (!protectedLinks.has(element)) {
      originalPolicies.set(element, element.getAttribute("referrerpolicy"));
      protectedLinks.add(element);
    }

    if (element.referrerPolicy !== "no-referrer") {
      element.referrerPolicy = "no-referrer";
    }
    return;
  }

  restoreLink(element);
}

function restoreLink(element) {
  if (!protectedLinks.has(element)) return;

  const original = originalPolicies.get(element);
  if (original === null || original === undefined) {
    element.removeAttribute("referrerpolicy");
  } else {
    element.setAttribute("referrerpolicy", original);
  }

  protectedLinks.delete(element);
  originalPolicies.delete(element);
}

function scan(root = document) {
  if (root instanceof HTMLAnchorElement || root instanceof HTMLAreaElement) {
    protectLink(root);
  }

  if (root.querySelectorAll) {
    for (const element of root.querySelectorAll("a[href], area[href]")) {
      protectLink(element);
    }
  }
}

function restoreAll() {
  for (const element of [...protectedLinks]) {
    if (element.isConnected) {
      restoreLink(element);
    } else {
      protectedLinks.delete(element);
      originalPolicies.delete(element);
    }
  }
}

function rescanAll() {
  if (!enabled || sourceRoots.length === 0) {
    restoreAll();
    return;
  }

  for (const element of [...protectedLinks]) {
    if (!element.isConnected) {
      protectedLinks.delete(element);
      originalPolicies.delete(element);
    }
  }

  scan(document);
}

function linkFromEvent(event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];

  for (const node of path) {
    if (node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement) {
      return node;
    }
  }

  const target = event.target;
  if (target instanceof Element) {
    return target.closest("a[href], area[href]");
  }

  return null;
}

function protectEventLink(event) {
  const link = linkFromEvent(event);
  if (link) protectLink(link);
}

async function loadConfig() {
  const config = await browser.storage.local.get(DEFAULTS);
  enabled = Boolean(config.enabled);
  updateSourceRoots(sanitizeDomains(config.domains));
  rescanAll();
}

for (const eventName of ["pointerdown", "mousedown", "click", "auxclick", "contextmenu", "dragstart"]) {
  document.addEventListener(eventName, protectEventLink, true);
}

const observer = new MutationObserver((mutations) => {
  if (!enabled || sourceRoots.length === 0) return;

  for (const mutation of mutations) {
    if (mutation.type === "attributes") {
      protectLink(mutation.target);
      continue;
    }

    for (const node of mutation.addedNodes) {
      if (node instanceof Element) {
        scan(node);
      }
    }
  }
});

observer.observe(document, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["href"]
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.enabled && !changes.domains) return;

  if (changes.enabled) {
    enabled = Boolean(changes.enabled.newValue);
  }

  if (changes.domains) {
    updateSourceRoots(sanitizeDomains(changes.domains.newValue));
  } else {
    browser.storage.local.get("domains").then((config) => {
      updateSourceRoots(sanitizeDomains(config.domains));
      rescanAll();
    }).catch(console.error);
    return;
  }

  rescanAll();
});

loadConfig().catch(console.error);
