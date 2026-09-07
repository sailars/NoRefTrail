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
  const stored = await browser.storage.local.get(["enabled", "domains"]);
  const patch = {};

  if (typeof stored.enabled !== "boolean") {
    patch.enabled = DEFAULTS.enabled;
  }

  if (!Array.isArray(stored.domains)) {
    patch.domains = [...DEFAULTS.domains];
  }

  if (Object.keys(patch).length) {
    await browser.storage.local.set(patch);
  }
}

async function syncState() {
  const config = await browser.storage.local.get(DEFAULTS);
  const enabled = Boolean(config.enabled);
  const domains = sanitizeDomains(config.domains);

  await browser.action.setBadgeText({
    text: enabled && domains.length ? String(domains.length) : ""
  });

  return { enabled, domainCount: domains.length };
}

browser.runtime.onInstalled.addListener(() => {
  ensureDefaults().then(syncState).catch(console.error);
});

browser.runtime.onStartup.addListener(() => {
  ensureDefaults().then(syncState).catch(console.error);
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.enabled && !changes.domains) return;
  syncState().catch(console.error);
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "sync") return undefined;

  return syncState()
    .then((state) => ({ ok: true, domainCount: state.domainCount }))
    .catch((error) => ({ ok: false, error: String(error?.message || error) }));
});

ensureDefaults().then(syncState).catch(console.error);
