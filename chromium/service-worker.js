const DEFAULTS = {
  enabled: true,
  domains: []
};

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

async function ensureDefaults() {
  const stored = await chrome.storage.local.get(["enabled", "domains"]);
  const patch = {};

  if (typeof stored.enabled !== "boolean") {
    patch.enabled = DEFAULTS.enabled;
  }

  if (!Array.isArray(stored.domains)) {
    patch.domains = [...DEFAULTS.domains];
  }

  if (Object.keys(patch).length) {
    await chrome.storage.local.set(patch);
  }
}

async function syncState() {
  const config = await chrome.storage.local.get(DEFAULTS);
  const enabled = Boolean(config.enabled);
  const domains = sanitizeDomains(config.domains);

  await chrome.action.setBadgeText({
    text: enabled && domains.length ? String(domains.length) : ""
  });

  return {
    enabled,
    domainCount: domains.length
  };
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults().then(syncState).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults().then(syncState).catch(console.error);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.enabled && !changes.domains) return;
  syncState().catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "sync") return;

  syncState()
    .then((state) => {
      sendResponse({
        ok: true,
        domainCount: state.domainCount
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: String(error?.message || error)
      });
    });

  return true;
});
