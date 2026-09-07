const RULE_ID = 1;
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

async function syncRules() {
  const config = await chrome.storage.local.get(DEFAULTS);
  const enabled = Boolean(config.enabled);
  const domains = sanitizeDomains(config.domains);

  const update = {
    removeRuleIds: [RULE_ID],
    addRules: []
  };

  if (enabled && domains.length > 0) {
    update.addRules.push({
      id: RULE_ID,
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
        initiatorDomains: domains,
        resourceTypes: ["main_frame"],
        requestMethods: ["get"],
        domainType: "thirdParty"
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules(update);
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
