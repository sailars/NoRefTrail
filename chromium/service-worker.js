const DEFAULTS = {
  enabled: true,
  domains: []
};

let syncQueue = Promise.resolve();

function sanitizeDomains(domains) {
  if (!Array.isArray(domains)) return [...DEFAULTS.domains];

  const result = [];
  for (const value of domains) {
    if (typeof value !== "string") continue;
    const domain = value.trim().toLowerCase();
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

function createRules(domains) {
  return domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "referer",
          operation: "remove"
        }
      ]
    },
    condition: {
      initiatorDomains: [domain],
      excludedRequestDomains: [domain],
      resourceTypes: ["main_frame"],
      requestMethods: ["get"]
    }
  }));
}

async function syncRules() {
  const config = await chrome.storage.local.get(DEFAULTS);
  const enabled = Boolean(config.enabled);
  const domains = sanitizeDomains(config.domains);
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map((rule) => rule.id),
    addRules: enabled ? createRules(domains) : []
  });

  await chrome.action.setBadgeText({
    text: enabled && domains.length ? String(domains.length) : ""
  });
}

function queueSync() {
  syncQueue = syncQueue.then(syncRules, syncRules);
  return syncQueue;
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults().then(queueSync).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults().then(queueSync).catch(console.error);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.enabled && !changes.domains) return;
  queueSync().catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "sync") return;

  queueSync()
    .then(async () => {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      sendResponse({ ok: true, ruleCount: rules.length });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

  return true;
});
