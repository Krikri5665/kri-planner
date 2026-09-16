import { store } from "./store.js";
import { applyTheme, PALETTES } from "./themes.js";
import { h, append, clear, openSheet, btn, toast, segmented, confirmDialog, field, textInput } from "./ui.js";
import { iconMarkup } from "./icons.js";
import { renderOnboarding } from "./screens/onboarding.js";
import { renderAuth } from "./screens/auth.js";
import { renderWeek } from "./screens/week.js";
import { renderDay } from "./screens/day.js";
import { renderChat } from "./screens/chat.js";
import { renderCalendarEdit } from "./screens/calendar-edit.js";
import { renderTasks } from "./screens/tasks.js";
import { renderDiaryEdit } from "./screens/diary-edit.js";
import { openEventForm, openTaskForm, openTripForm } from "./forms.js";
import { openExercise } from "./screens/exercise.js";
import { startScheduler, stopScheduler } from "./scheduler.js";
import { todayStr, plural } from "./util.js";

const PANELS = {
  calendar: {
    id: "calendar",
    name: "Календар",
    otherName: "Щоденник",
    otherIcon: "book",
    defaultTab: "week",
    tabs: [
      { id: "week", label: "Календар", icon: "calendar", render: renderWeek },
      { id: "day", label: "Графік дня", icon: "clock", render: renderDay },
      { id: "ai", label: "ШІ", icon: "sparkles", render: renderChat },
      { id: "edit", label: "Редагування", icon: "sliders", render: renderCalendarEdit },
    ],
  },
  diary: {
    id: "diary",
    name: "Щоденник",
    otherName: "Календар",
    otherIcon: "calendar",
    defaultTab: "tasks",
    tabs: [
      { id: "tasks", label: "Завдання", icon: "clipboard", render: renderTasks },
      { id: "ai", label: "ШІ", icon: "sparkles", render: renderChat },
      { id: "edit", label: "Редагування", icon: "sliders", render: renderDiaryEdit },
    ],
  },
};

const appEl = document.getElementById("app");
const state = {
  stage: "boot",
  panel: "calendar",
  tabs: { calendar: "week", diary: "tasks" },
  titleAnim: true,
  authMode: "login",
  chatSessions: {},
};
let currentPage = null;
let mainEl = null;
let avatarEl = null;

applyTheme("teal", "light");

store.subscribe(() => {
  if (state.stage === "boot") return;
  if (state.stage === "app" && !store.user) {
    state.stage = "onboarding";
    state.chatSessions = {};
    stopScheduler();
    render();
    return;
  }
  if (state.stage === "app") {
    paintAvatar();
    if (currentPage && typeof currentPage.update === "function") currentPage.update();
  }
});

function ctxFor() {
  return {
    user: store.displayName(),
    profileName: store.user,
    panel: state.panel,
    tab: state.tabs[state.panel],
    mainEl,
    chatSessions: state.chatSessions,
    navigate,
    scrollToEl,
    openEventForm: (ev) => openEventForm(ctxFor(), ev),
    openTaskForm: (task) => openTaskForm(ctxFor(), task),
    openTripForm: (trip) => openTripForm(ctxFor(), trip),
    consumeTitleAnim: () => {
      const was = state.titleAnim;
      state.titleAnim = false;
      return was;
    },
    pokeRefresh: () => {},
  };
}

function navigate(panel, tab, opts = {}) {
  const changedPanel = panel !== state.panel;
  state.panel = panel;
  if (tab) state.tabs[panel] = tab;
  if (changedPanel) state.titleAnim = true;
  renderShell();
  mountPage();
  if (opts.scrollTo) {
    setTimeout(() => {
      const target = document.getElementById(opts.scrollTo);
      if (target) scrollToEl(target, 90);
    }, 140);
  }
}

function scrollToEl(target, extra = 0) {
  if (!mainEl || !target) return;
  const r = target.getBoundingClientRect();
  const mr = mainEl.getBoundingClientRect();
  mainEl.scrollTop += (r.top - mr.top) - extra;
}

function render() {
  if (state.stage === "boot") {
    clear(appEl);
    return;
  }
  if (state.stage === "onboarding") {
    stopScheduler();
    if (currentPage && currentPage.destroy) currentPage.destroy();
    currentPage = null;
    clear(appEl);
    appEl.appendChild(renderOnboarding({
      onFinish: (mode) => {
        state.authMode = mode || "login";
        state.stage = "auth";
        render();
      },
    }));
    return;
  }
  if (state.stage === "auth") {
    stopScheduler();
    if (currentPage && currentPage.destroy) currentPage.destroy();
    currentPage = null;
    clear(appEl);
    appEl.appendChild(renderAuth({
      mode: state.authMode,
      onMode: (m) => { state.authMode = m; },
      onAuthed: () => {
        state.stage = "app";
        state.panel = "calendar";
        state.tabs = { calendar: "week", diary: "tasks" };
        state.titleAnim = true;
        state.chatSessions = {};
        applyTheme(store.data.settings.theme, store.data.settings.mode);
        render();
      },
    }));
    return;
  }
  renderShell();
  mountPage();
  startScheduler(ctxFor());
}

function renderShell() {
  clear(appEl);
  mainEl = h("div", { class: "app-main", id: "viewRoot" });
  avatarEl = h("button", { class: "floating-avatar", title: "Профіль", onclick: () => openProfileSheet() });
  paintAvatar();
  appEl.appendChild(avatarEl);
  appEl.appendChild(mainEl);
  appEl.appendChild(renderNav());
}

function paintAvatar() {
  if (!avatarEl) return;
  const av = store.avatar();
  const inner = h("span", { class: "av-inner" });
  if (av) {
    inner.appendChild(h("img", { src: av, alt: "" }));
  } else {
    inner.appendChild(document.createTextNode((store.displayName() || "?").trim().charAt(0).toUpperCase()));
  }
  clear(avatarEl);
  avatarEl.appendChild(inner);
  avatarEl.title = `Профіль${store.displayName() ? ": " + store.displayName() : ""}`;
}

function renderNav() {
  const panel = PANELS[state.panel];
  const other = PANELS[state.panel === "calendar" ? "diary" : "calendar"];
  const pill = h("div", { class: "tabbar-pill" }, panel.tabs.map((tab) => {
    const active = state.tabs[panel.id] === tab.id;
    const longestWord = Math.max(...tab.label.split(" ").map((w) => w.length));
    const tight = longestWord > 9 ? " is-tight" : (Math.max(longestWord, tab.label.length) > 7 ? " is-mid" : "");
    const b = h("button", { class: `tab-btn${active ? " is-active" : ""}`, onclick: () => navigate(panel.id, tab.id) },
      h("span", { class: "ico", html: iconMarkup(tab.icon) }),
      h("span", { class: `tab-btn-label${tight}` }, tab.label),
    );
    return b;
  }));
  const switchBtn = h("button", {
    class: "app-switch",
    title: `Перейти до розділу «${other.name}»`,
    onclick: () => {
      state.titleAnim = true;
      navigate(other.id, state.tabs[other.id] || other.defaultTab);
      toast(`Розділ «${other.name}»`, { icon: other.otherIcon, duration: 1600 });
    },
  },
    h("span", { class: "app-switch-circle" },
      h("span", { class: "ico", html: iconMarkup(other.otherIcon) }),
      h("span", { class: "app-switch-badge", html: iconMarkup("refresh") }),
    ),
    h("span", { class: "app-switch-label" }, other.name),
  );
  return h("nav", { class: "tabbar" }, switchBtn, pill);
}

function mountPage() {
  if (currentPage && typeof currentPage.destroy === "function") currentPage.destroy();
  clear(mainEl);
  const panel = PANELS[state.panel];
  const tabId = state.tabs[panel.id];
  const def = panel.tabs.find((t) => t.id === tabId) || panel.tabs[0];
  currentPage = def.render(ctxFor());
  mainEl.appendChild(currentPage.el);
  mainEl.scrollTop = 0;
}

/* ---------- профіль ---------- */

function shrinkImage(file, size = 192) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Не вдалося відкрити зображення"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const cx = canvas.getContext("2d");
        cx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function editableRow(cfg) {
  const el = h("div", { class: "profile-row", role: "button", tabindex: "0" });
  let open = false;
  let lastTap = 0;
  let errEl = null;

  function paint() {
    clear(el);
    el.classList.toggle("is-open", open);
    if (!open) {
      append(el, [
        h("div", { class: "pr-ico", html: iconMarkup(cfg.icon) }),
        h("div", { class: "pr-text" },
          h("div", { class: "pr-label" }, cfg.label),
          h("div", { class: `pr-value${cfg.masked ? " is-masked" : ""}` }, cfg.value()),
        ),
        h("div", { class: "pr-edit", html: iconMarkup("edit") }),
      ]);
      return;
    }
    const inputs = cfg.fields().map((f) => textInput({
      type: f.type || "text",
      value: f.value || "",
      placeholder: f.placeholder || "",
      autocomplete: "off",
    }));
    errEl = h("div", { class: "profile-error hidden" });
    append(el, [
      h("div", { class: "pr-head" },
        h("div", { class: "pr-ico", html: iconMarkup(cfg.icon) }),
        h("div", { class: "pr-text" }, h("div", { class: "pr-label" }, cfg.label)),
      ),
      h("div", { class: "pr-fields" }, inputs.map((inp, i) =>
        cfg.fields()[i] && cfg.fields()[i].label ? field(cfg.fields()[i].label, inp) : inp,
      )),
      cfg.hint ? h("div", { class: "pr-hint" }, cfg.hint) : null,
      errEl,
      h("div", { class: "pr-actions" },
        btn("Зберегти", { size: "sm", icon: "check", onClick: () => submit(inputs) }),
        btn("Скасувати", { size: "sm", variant: "ghost", onClick: () => { open = false; paint(); } }),
      ),
    ]);
    setTimeout(() => { if (inputs[0]) inputs[0].focus(); }, 40);
  }

  async function submit(inputs) {
    errEl.classList.add("hidden");
    try {
      await cfg.onSave(inputs.map((i) => i.value));
      open = false;
      paint();
    } catch (e) {
      errEl.textContent = (e && e.message) || "Не вдалося зберегти";
      errEl.classList.remove("hidden");
    }
  }

  el.addEventListener("click", (e) => {
    if (open) return;
    if (e.target.closest(".pr-edit")) { open = true; paint(); return; }
    const now = Date.now();
    if (now - lastTap < 460) { lastTap = 0; open = true; paint(); } else lastTap = now;
  });
  el.addEventListener("keydown", (e) => {
    if (open) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open = true; paint(); }
  });

  paint();
  return { el, repaint: paint };
}

function openProfileSheet() {
  const s = store.data.settings;
  const sheet = openSheet({
    title: store.displayName() || store.user || "Профіль",
    subtitle: "Профіль і швидкі налаштування",
    icon: "user",
    size: "md",
  });
  const ex = s.exercise;

  /* --- фото --- */
  const avatarBtn = h("button", { class: "profile-avatar", type: "button", title: "Двічі натисніть, щоб змінити фото" });
  const fileInput = h("input", { type: "file", accept: "image/*", style: "position:absolute;width:0;height:0;opacity:0" });
  const nameEl = h("div", { class: "profile-name" });
  const subEl = h("div", { class: "profile-sub" });
  const removePhotoBtn = h("button", {
    type: "button",
    style: "background:none;border:none;padding:0;color:var(--accent);font-weight:800;font-size:12.5px;text-decoration:underline;text-underline-offset:3px;cursor:pointer",
  }, "Прибрати фото");
  removePhotoBtn.addEventListener("click", async () => {
    await store.saveProfile({ avatar: "" });
    paintPhoto();
    paintAvatar();
    toast("Фото прибрано", { icon: "check" });
  });

  function paintPhoto() {
    clear(avatarBtn);
    const av = store.avatar();
    if (av) avatarBtn.appendChild(h("img", { src: av, alt: "" }));
    else avatarBtn.appendChild(document.createTextNode((store.displayName() || "?").trim().charAt(0).toUpperCase()));
    avatarBtn.appendChild(h("span", { class: "pa-badge", html: iconMarkup("edit") }));
    removePhotoBtn.hidden = !av;
    nameEl.textContent = store.displayName() || "";
    subEl.textContent = `Назва профілю: ${store.user || "—"}`;
  }

  let avatarTap = 0;
  avatarBtn.addEventListener("click", () => {
    const now = Date.now();
    if (now - avatarTap < 460) { avatarTap = 0; fileInput.click(); }
    else avatarTap = now;
  });
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    try {
      const dataUrl = await shrinkImage(f, 192);
      await store.saveProfile({ avatar: dataUrl });
      paintPhoto();
      paintAvatar();
      toast("Фото профілю оновлено", { icon: "check" });
    } catch (e) {
      toast((e && e.message) || "Не вдалося обробити фото", { tone: "warn", icon: "info" });
    }
    fileInput.value = "";
  });

  /* --- рядки акаунту --- */
  const nameRow = editableRow({
    icon: "user",
    label: "Ім'я",
    value: () => store.displayName() || "—",
    fields: () => [{ placeholder: "Як до вас звертатися", value: store.displayName() }],
    hint: "Показується у привітанні та у профілі. Це не назва профілю.",
    onSave: async ([v]) => {
      await store.saveProfile({ displayName: v });
      paintPhoto();
      paintAvatar();
      sheet.setTitle(store.displayName() || store.user);
      nameRow.repaint();
      toast("Ім'я збережено", { icon: "check" });
    },
  });

  const profileKeyRow = editableRow({
    icon: "briefcase",
    label: "Назва профілю",
    value: () => store.user || "—",
    fields: () => [{ placeholder: "Назва профілю", value: store.user }],
    hint: "Це ключ входу — саме його вводите при вході в акаунт. Ім'я та фото збережуться.",
    onSave: async ([v]) => {
      const next = await store.renameProfile(v);
      paintPhoto();
      paintAvatar();
      sheet.setTitle(store.displayName() || next);
      profileKeyRow.repaint();
      nameRow.repaint();
      toast(`Профіль: «${next}»`, { icon: "check" });
    },
  });

  const passRow = editableRow({
    icon: "lock",
    label: "Пароль",
    masked: true,
    value: () => "••••••••",
    fields: () => [
      { type: "password", label: "Поточний пароль", placeholder: "Поточний пароль" },
      { type: "password", label: "Новий пароль", placeholder: "Мінімум 4 символи" },
      { type: "password", label: "Повторіть новий", placeholder: "Ще раз новий пароль" },
    ],
    hint: "Зберігається у зашифрованому вигляді разом з акаунтом на цьому пристрої.",
    onSave: async ([cur, next, again]) => {
      if (next !== again) throw new Error("Нові паролі не збігаються");
      await store.changePassword(cur, next);
      toast("Пароль змінено", { icon: "lock" });
    },
  });

  /* --- зарядка --- */
  const streakNum = ex.streak || 0;

  /* --- колір і режим --- */
  const swatches = h("div", { class: "chip-row" }, PALETTES.map((p) => {
    const c = p[s.mode === "dark" ? "dark" : "light"];
    return h("button", {
      class: `color-swatch${p.id === s.theme ? " is-active" : ""}`,
      style: `background:linear-gradient(135deg,${c.c1},${c.c2} 55%,${c.c3});width:44px;height:44px;border-radius:14px;${p.id === s.theme ? "outline:2.5px solid var(--accent);outline-offset:2px" : ""}`,
      title: p.name,
      onclick: () => { store.setSetting("theme", p.id); applyTheme(p.id, store.data.settings.mode); sheet.close(); openProfileSheet(); },
    });
  }));

  append(sheet.body, [
    h("div", { class: "profile-head" },
      avatarBtn, fileInput, nameEl, subEl,
    ),
    removePhotoBtn,
    h("div", { class: "profile-note" },
      h("span", { class: "ico", html: iconMarkup("info") }),
      h("span", { class: "grow" }, "Натисніть двічі на фото або на рядок, щоб змінити. Усе зберігається в акаунті."),
    ),
    nameRow.el,
    profileKeyRow.el,
    passRow.el,
    h("div", { class: "streak-card", style: "margin:16px 0" },
      h("div", { class: "streak-ico", html: iconMarkup("flame") }),
      h("div", {},
        h("div", { class: "streak-num" }, `${streakNum} ${plural(streakNum, "день", "дні", "днів")}`),
        h("div", { class: "streak-label" }, ex.lastDone === todayStr() ? "Зарядку сьогодні виконано" : "серія тренувань поспіль"),
      ),
    ),
    h("div", { class: "field-label" }, "Головний колір"),
    swatches,
    h("div", { class: "field-label", style: "margin-top:16px" }, "Режим"),
    segmented(
      [{ value: "light", label: "Світлий", icon: "sun" }, { value: "dark", label: "Темний", icon: "moon" }],
      s.mode,
      (v) => { store.setSetting("mode", v); applyTheme(store.data.settings.theme, v); },
      { fill: true },
    ),
  ]);

  paintPhoto();

  append(sheet.footer, [
    btn("Усі налаштування", { variant: "soft", block: true, icon: "sliders", onClick: () => { sheet.close(); navigate("calendar", "edit", { scrollTo: "app-settings" }); } }),
    btn("Зарядка", { variant: "ghost", block: true, icon: "dumbbell", onClick: () => { sheet.close(); openExercise(ctxFor()); } }),
    btn("Вийти з акаунту", {
      variant: "danger-ghost", block: true, icon: "arrowLeft",
      onClick: async () => {
        if (await confirmDialog({ title: "Вийти з акаунту?", message: "Дані залишаться на цьому пристрої — ви зможете увійти знову.", confirmText: "Вийти", danger: true })) {
          sheet.close();
          await store.logout();
        }
      },
    }),
  ]);
  return sheet;
}

/* ---------- старт ---------- */

window.addEventListener("error", (e) => {
  console.warn("app error", e.message);
});

(async function boot() {
  await store.init();
  if (store.user) {
    state.stage = "app";
    applyTheme(store.data.settings.theme, store.data.settings.mode);
    render();
  } else {
    state.stage = "onboarding";
    render();
  }
})();
