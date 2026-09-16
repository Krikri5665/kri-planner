import { iconEl, iconMarkup } from "./icons.js";

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const key of Object.keys(props)) {
      const val = props[key];
      if (val == null || val === false) continue;
      if (key === "class") el.className = val;
      else if (key === "style") {
        if (typeof val === "string") el.style.cssText = val;
        else Object.assign(el.style, val);
      } else if (key === "dataset") Object.assign(el.dataset, val);
      else if (key === "html") el.innerHTML = val;
      else if (key === "ref" && typeof val === "function") val(el);
      else if (key.startsWith("on") && typeof val === "function") el.addEventListener(key.slice(2).toLowerCase(), val);
      else if (key === "value" || key === "checked" || key === "disabled" || key === "hidden") el[key] = val;
      else if (key === "type" || key === "min" || key === "max" || key === "step" || key === "placeholder" || key === "name" || key === "id" || key === "title") el[key] = val;
      else el.setAttribute(key, val);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  if (children == null || children === false || children === true) return el;
  if (typeof children === "string" || children instanceof Node || typeof children[Symbol.iterator] !== "function") children = [children];
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
  return el;
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function $id(id) {
  return document.getElementById(id);
}

export function icon(name, cls = "ico") {
  return iconEl(name, cls);
}

export function attachIcons(root) {
  root.querySelectorAll("[data-ico]").forEach((el) => {
    if (el.dataset.icoDone) return;
    el.dataset.icoDone = "1";
    el.innerHTML = iconMarkup(el.dataset.ico);
  });
}

/* ---------- toasts ---------- */

let toastLayer = null;

export function toast(message, opts = {}) {
  if (!toastLayer) toastLayer = $id("toastLayer");
  const { icon: ico = "check", duration = 3600, tone = "accent", actionLabel, onAction } = opts;
  const el = h("div", { class: `toast toast-${tone}` },
    tone === "accent" && ico ? h("span", { class: "toast-ico", html: iconMarkup(ico) }) : null,
    h("span", { class: "toast-text" }, message),
    actionLabel ? h("button", { class: "toast-action", onclick: () => { onAction && onAction(); dismiss(); } }, actionLabel) : null,
  );
  toastLayer.appendChild(el);
  let killed = false;
  function dismiss() {
    if (killed) return;
    killed = true;
    clearTimeout(timer);
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 320);
  }
  const timer = setTimeout(dismiss, duration);
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".toast-action")) return;
    const pressedAt = Date.now();
    const onUp = () => {
      window.removeEventListener("pointerup", onUp);
      if (Date.now() - pressedAt < 450) dismiss();
    };
    window.addEventListener("pointerup", onUp, { passive: true });
  });
  requestAnimationFrame(() => el.classList.add("toast-in"));
  return dismiss;
}

/* ---------- sheets / modals ---------- */

let modalLayer = null;
const activeSheets = [];

export function openSheet(opts = {}) {
  if (!modalLayer) modalLayer = $id("modalLayer");
  const { title, subtitle, icon: ico, size = "md", closable = true, onClose, tone } = opts;
  let closed = false;
  const body = h("div", { class: "sheet-body" });
  const footer = h("div", { class: "sheet-footer" });
  const headerEl = h("div", { class: "sheet-head" },
    ico ? h("div", { class: "sheet-head-ico", html: iconMarkup(ico) }) : null,
    h("div", { class: "sheet-head-text" },
      title ? h("div", { class: "sheet-title" }, title) : null,
      subtitle ? h("div", { class: "sheet-sub" }, subtitle) : null,
    ),
    closable ? h("button", { class: "icon-btn sheet-close", "aria-label": "Закрити", html: iconMarkup("close"), onclick: () => ctrl.close() }) : null,
  );
  const sheet = h("div", { class: `sheet sheet-${size}${tone ? " sheet-tone-" + tone : ""}` },
    h("div", { class: "sheet-grip" }),
    (title || subtitle || ico) ? headerEl : null,
    body,
    footer,
  );
  const backdrop = h("div", { class: "sheet-backdrop" });
  const wrap = h("div", { class: "sheet-wrap" }, backdrop, sheet);

  const ctrl = {
    body,
    footer,
    sheet,
    wrap,
    close() {
      if (closed) return;
      closed = true;
      const i = activeSheets.indexOf(ctrl);
      if (i >= 0) activeSheets.splice(i, 1);
      wrap.classList.add("sheet-closing");
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 260);
      document.documentElement.classList.toggle("has-sheet", activeSheets.length > 0);
    },
    setTitle(t, s) {
      const titleNode = headerEl.querySelector(".sheet-title");
      if (titleNode) titleNode.textContent = t;
      const subNode = headerEl.querySelector(".sheet-sub");
      if (subNode && s != null) subNode.textContent = s;
    },
  };
  if (closable) backdrop.addEventListener("click", () => ctrl.close());
  modalLayer.appendChild(wrap);
  activeSheets.push(ctrl);
  document.documentElement.classList.add("has-sheet");
  requestAnimationFrame(() => wrap.classList.add("sheet-open"));
  return ctrl;
}

export function confirmDialog(opts = {}) {
  const { title = "Ви впевнені?", message = "", confirmText = "Так", cancelText = "Скасувати", danger = false } = opts;
  return new Promise((resolve) => {
    let done = false;
    const sheet = openSheet({ title, subtitle: message, icon: danger ? "trash" : "info", onClose: () => { if (!done) { done = true; resolve(false); } } });
    const yes = h("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"} btn-block` }, confirmText);
    yes.addEventListener("click", () => { done = true; sheet.close(); resolve(true); });
    const no = h("button", { class: "btn btn-ghost btn-block" }, cancelText);
    no.addEventListener("click", () => { done = true; sheet.close(); resolve(false); });
    append(sheet.footer, [yes, no]);
  });
}

/* ---------- form controls ---------- */

export function field(label, control, hint) {
  return h("label", { class: "field" },
    label ? h("span", { class: "field-label" }, label) : null,
    control,
    hint ? h("span", { class: "field-hint" }, hint) : null,
  );
}

export function textInput(opts = {}) {
  return h("input", Object.assign({ class: "input", type: "text", autocomplete: "off" }, opts));
}

export function textarea(opts = {}) {
  const el = h("textarea", Object.assign({ class: "input textarea", rows: 3 }, opts));
  autoGrow(el);
  return el;
}

export function autoGrow(el) {
  const fit = () => { el.style.height = "auto"; el.style.height = Math.min(260, el.scrollHeight + 2) + "px"; };
  el.addEventListener("input", fit);
  requestAnimationFrame(fit);
}

export function selectInput(options, value, opts = {}) {
  const el = h("select", Object.assign({ class: "input select" }, opts));
  for (const opt of options) {
    el.appendChild(h("option", { value: opt.value, selected: String(opt.value) === String(value) }, opt.label));
  }
  return el;
}

export function toggleRow(label, checked, onChange, hint) {
  const input = h("input", { type: "checkbox", class: "switch-input", checked: !!checked, onchange: () => onChange(input.checked) });
  return h("label", { class: "switch-row" },
    h("span", { class: "switch-text" },
      h("span", { class: "switch-label" }, label),
      hint ? h("span", { class: "switch-hint" }, hint) : null,
    ),
    h("span", { class: "switch" }, input, h("span", { class: "switch-knob" })),
  );
}

export function segmented(options, value, onChange, opts = {}) {
  const el = h("div", { class: `segmented${opts.fill ? " segmented-fill" : ""}` });
  for (const opt of options) {
    const active = String(opt.value) === String(value);
    const btn = h("button", { class: `seg-btn${active ? " is-active" : ""}`, type: "button" },
      opt.icon ? h("span", { class: "seg-ico", html: iconMarkup(opt.icon) }) : null,
      h("span", {}, opt.label),
    );
    btn.addEventListener("click", () => {
      el.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      onChange(opt.value);
    });
    el.appendChild(btn);
  }
  return el;
}

export function btn(label, opts = {}) {
  const { icon: ico, variant = "primary", size = "md", block, onClick, type = "button", disabled, justify } = opts;
  const el = h("button", { class: `btn btn-${variant} btn-${size}${block ? " btn-block" : ""}${justify ? " btn-justify" : ""}`, type, disabled },
    ico ? h("span", { class: "btn-ico", html: iconMarkup(ico) }) : null,
    h("span", { class: "btn-label" }, label),
  );
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

/* ---------- animation helpers ---------- */

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@*<>/\\|~";

export function scrambleText(el, finalText, opts = {}) {
  const { duration = 900, latin = true } = opts;
  const start = performance.now();
  const chars = finalText.split("");
  const latinOnly = "KRI";
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 2.2);
    const settled = Math.floor(eased * chars.length);
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === " ") { out += ch; continue; }
      if (i < settled) out += ch;
      else if (latin && i < settled + 3) out += latinOnly[i % latinOnly.length];
      else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = out;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }
  requestAnimationFrame(frame);
}

export function kriTitle(el, word, opts = {}) {
  const { extra = ["R", "I"], steps = [[1, 300], [2, 620], [1, 300], [0, 0]] } = opts;
  const head = word.charAt(0);
  const tail = word.slice(1);

  function paint(n) {
    if (!el.isConnected) return;
    clear(el);
    if (n <= 0) {
      el.appendChild(document.createTextNode(word));
      return;
    }
    el.appendChild(h("span", { class: "kri-pop" }, head + extra.slice(0, n).join("")));
    el.appendChild(document.createTextNode(tail));
  }

  paint(0);
  let i = 0;
  function step() {
    if (!el.isConnected || i >= steps.length) return;
    const [n, wait] = steps[i++];
    paint(n);
    setTimeout(step, wait);
  }
  setTimeout(step, 320);
}

export function countUp(el, target, duration = 700) {
  const from = 0;
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function burstConfetti(container, count = 26) {
  const rect = container.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const piece = h("span", { class: "confetti-piece" });
    piece.style.left = (rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.7) + "px";
    piece.style.top = (rect.height * 0.35) + "px";
    piece.style.setProperty("--dx", (Math.random() - 0.5) * 260 + "px");
    piece.style.setProperty("--dy", (Math.random() * -260 - 60) + "px");
    piece.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    piece.style.animationDelay = (Math.random() * 180) + "ms";
    piece.style.background = ["var(--c1)", "var(--c2)", "var(--c3)"][i % 3];
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}

export function rippleOn(node) {
  node.addEventListener("pointerdown", (e) => {
    if (!node.classList.contains("ripple")) return;
    const rect = node.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const r = h("span", { class: "ripple-wave" });
    r.style.width = r.style.height = size + "px";
    r.style.left = (e.clientX - rect.left - size / 2) + "px";
    r.style.top = (e.clientY - rect.top - size / 2) + "px";
    node.appendChild(r);
    setTimeout(() => r.remove(), 620);
  });
}

export function empty(el) {
  el.classList.add("is-empty");
  return el;
}

export function iconBadge(name, cls = "badge-ico") {
  return h("span", { class: cls, html: iconMarkup(name) });
}
