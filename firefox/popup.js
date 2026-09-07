const DEFAULTS = {
  enabled: true,
  domains: []
};

const enabledEl = document.getElementById("enabled");
const addForm = document.getElementById("addForm");
const domainInput = document.getElementById("domainInput");
const domainList = document.getElementById("domainList");
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");

let state = {
  enabled: true,
  domains: []
};

function normalizeDomain(raw) {
  let value = String(raw || "").trim();

  if (!value) {
    throw new Error("Введите домен.");
  }

  value = value.replace(/^\*\./, "");

  let url;

  try {
    url = value.includes("://")
      ? new URL(value)
      : new URL(`https://${value}`);
  } catch {
    throw new Error("Не удалось распознать домен.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (!host || host.includes(" ")) {
    throw new Error("Некорректный домен.");
  }

  return host;
}

function render() {
  enabledEl.checked = state.enabled;
  domainList.replaceChildren();

  for (const domain of state.domains) {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "domain";
    name.textContent = domain;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "Удалить";

    remove.addEventListener("click", async () => {
      state.domains = state.domains.filter((item) => item !== domain);

      try {
        await saveAndSync();
        render();
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });

    li.append(name, remove);
    domainList.append(li);
  }
}

async function saveAndSync() {
  errorEl.textContent = "";
  statusEl.textContent = "Обновление правила...";

  await browser.storage.local.set({
    enabled: state.enabled,
    domains: state.domains
  });

  const result = await browser.runtime.sendMessage({
    type: "sync"
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Не удалось обновить правило.");
  }

  statusEl.textContent =
    state.enabled && state.domains.length > 0
      ? `Активно: ${result.ruleCount} правило, доменов: ${state.domains.length}`
      : "Правило выключено";
}

enabledEl.addEventListener("change", async () => {
  state.enabled = enabledEl.checked;

  try {
    await saveAndSync();
  } catch (error) {
    errorEl.textContent = error.message;
  }
});

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const domain = normalizeDomain(domainInput.value);

    if (state.domains.includes(domain)) {
      throw new Error("Этот домен уже есть в списке.");
    }

    if (state.domains.length >= 100) {
      throw new Error("Достигнут лимит интерфейса: 100 доменов.");
    }

    state.domains.push(domain);
    state.domains.sort();
    domainInput.value = "";

    await saveAndSync();
    render();
  } catch (error) {
    errorEl.textContent = error.message;
  }
});

async function init() {
  try {
    const config = await browser.storage.local.get(DEFAULTS);

    state.enabled = Boolean(config.enabled);
    state.domains = Array.isArray(config.domains)
      ? [...new Set(config.domains.map((item) => String(item).toLowerCase()))]
      : [...DEFAULTS.domains];

    render();
    await saveAndSync();
  } catch (error) {
    errorEl.textContent = error.message;
    statusEl.textContent = "Ошибка";
  }
}

init();
