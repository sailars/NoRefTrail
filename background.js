const RULE_ID = 1;

const DEFAULTS = {
  enabled: true,
  domains: []
};

let syncQueue = Promise.resolve();

function sanitizeDomains(domains) {
  if (!Array.isArray(domains)) {
    return [...DEFAULTS.domains];
  }

  const result = [];

  for (const value of domains) {
    if (typeof value !== "string") {
      continue;
    }

    const domain = value.trim().toLowerCase();

    if (!domain || result.includes(domain)) {
      continue;
    }

    result.push(domain);
  }

  return result;
}

async function ensureDefaults() {
  const stored = await browser.storage.local.get(["enabled", "domains"]);
  const patch = {};

  if (typeof stored.enabled !== "boolean") {
    patch.enabled = DEFAULTS.enabled;
  }

  if (!Array.isArray(stored.domains)) {
    patch.domains = [...DEFAULTS.domains];
  }

  if (Object.keys(patch).length > 0) {
    await browser.storage.local.set(patch);
  }
}

async function syncRules() {
  const config = await browser.storage.local.get(DEFAULTS);
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

  await browser.declarativeNetRequest.updateDynamicRules(update);

  await browser.action.setBadgeText({
    text: enabled && domains.length > 0 ? String(domains.length) : ""
  });
}

function queueSync() {
  syncQueue = syncQueue.then(syncRules, syncRules);
  return syncQueue;
}

browser.runtime.onInstalled.addListener(() => {
  ensureDefaults()
    .then(queueSync)
    .catch(console.error);
});

browser.runtime.onStartup.addListener(() => {
  ensureDefaults()
    .then(queueSync)
    .catch(console.error);
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (!changes.enabled && !changes.domains) {
    return;
  }

  queueSync().catch(console.error);
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "sync") {
    return undefined;
  }

  return queueSync()
    .then(async () => {
      const rules = await browser.declarativeNetRequest.getDynamicRules();
      return {
        ok: true,
        ruleCount: rules.length
      };
    })
    .catch((error) => ({
      ok: false,
      error: String(error?.message || error)
    }));
});

ensureDefaults()
  .then(queueSync)
  .catch(console.error);
