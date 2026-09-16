import { h, append, clear, autoGrow, toast, confirmDialog } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { ChatSession } from "../ai.js";
import { store } from "../store.js";

export function renderRich(text) {
  const frag = document.createDocumentFragment();
  const lines = String(text == null ? "" : text).split("\n");
  let list = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const bullet = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      if (!list) { list = document.createElement("ul"); frag.appendChild(list); }
      const li = document.createElement("li");
      appendInline(li, bullet[1]);
      list.appendChild(li);
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    const p = document.createElement("p");
    appendInline(p, line);
    frag.appendChild(p);
  }
  return frag;
}

function appendInline(el, text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      const b = document.createElement("strong");
      b.textContent = part.slice(2, -2);
      el.appendChild(b);
    } else if (/^`[^`]+`$/.test(part)) {
      const c = document.createElement("code");
      c.textContent = part.slice(1, -1);
      el.appendChild(c);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  }
}

export function renderChat(ctx) {
  const kind = ctx.panel === "diary" ? "diary" : "calendar";
  const page = h("div", { class: "page page-chat" });
  const list = h("div", { class: "chat-wrap" });
  let session = ctx.chatSessions[kind];
  if (!session) session = ctx.chatSessions[kind] = ChatSession.load(kind);
  let busy = false;

  const isDiary = kind === "diary";
  const composer = h("div", { class: "chat-composer" });
  const input = h("textarea", { class: "input textarea", rows: 1, placeholder: isDiary ? "Напиши, що додати в щоденник…" : "Спитай або додай подію…" });
  autoGrow(input);
  const sendBtn = h("button", { class: "chat-send", title: "Надіслати", html: iconMarkup("send") });
  append(composer, [input, sendBtn]);

  const scroller = ctx.mainEl;

  function nearBottom() {
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 260;
  }
  function toBottom(force) {
    if (force || nearBottom()) {
      requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
    }
  }

  function buildHead() {
    return h("div", { class: "page-head" },
      h("div", { class: "page-kicker" }, isDiary ? "Щоденник · помічник" : "Календар · помічник"),
      h("div", { class: "row-between" },
        h("h1", { class: "page-title" }, "ШІ"),
        h("button", {
          class: "icon-btn", title: "Очистити чат", html: iconMarkup("refresh"),
          onclick: async () => {
            if (!session.log.length) return;
            if (await confirmDialog({ title: "Очистити чат?", message: "Історія повідомлень з ШІ буде стерта. Дані календаря залишаться.", confirmText: "Очистити", danger: true })) {
              session.clear();
              renderMessages();
              toast("Чат очищено", { duration: 2200 });
            }
          },
        }),
      ),
      h("div", { class: "page-sub" }, isDiary ? "Питай про завдання або проси додати нові" : "Питай про розклад або проси додати події"),
    );
  }

  function avatarNode(role) {
    const el = h("div", { class: "chat-avatar" });
    paintAvatarNode(el, role);
    return el;
  }

  function paintAvatarNode(el, role) {
    clear(el);
    const photo = role === "user" ? store.avatar() : "";
    el.classList.toggle("has-photo", !!photo);
    if (photo) {
      el.appendChild(h("img", { src: photo, alt: "", draggable: false }));
    } else {
      el.innerHTML = iconMarkup(role === "user" ? "user" : "sparkles");
    }
  }

  function paintUserAvatars() {
    for (const el of list.querySelectorAll(".chat-msg.is-user .chat-avatar")) paintAvatarNode(el, "user");
  }

  function addMessage(msg) {
    const bubble = h("div", { class: "bubble" });
    const row = h("div", { class: `chat-msg ${msg.role === "user" ? "is-user" : "is-bot"}` },
      avatarNode(msg.role === "user" ? "user" : "assistant"),
      bubble,
    );
    if (msg.role === "user") {
      bubble.appendChild(document.createTextNode(msg.text));
    } else {
      bubble.appendChild(renderRich(msg.text));
      if (msg.changes && msg.changes.length) {
        bubble.appendChild(changesNode(msg.changes));
      }
    }
    list.appendChild(row);
    return bubble;
  }

  function changesNode(changes) {
    const box = h("div", { class: "chat-changes" });
    for (const c of changes) {
      box.appendChild(h("div", { class: "chat-change" },
        h("span", { class: "ico", html: iconMarkup("check") }),
        h("span", {}, c),
      ));
    }
    return box;
  }

  function renderMessages() {
    clear(list);
    if (!session.log.length) {
      list.appendChild(emptyState());
      return;
    }
    for (const msg of session.log) addMessage(msg);
  }

  function emptyState() {
    const box = h("div", { class: "chat-hero" });
    append(box, [
      h("div", { class: "gradient-note" },
        h("div", { class: "gn-title" }, h("span", { class: "ico", html: iconMarkup("sparkles") }), isDiary ? "Привіт! Я твій помічник щоденника" : "Привіт! Я твій помічник календаря"),
        h("div", { class: "gn-text" }, isDiary
          ? "Можу розповісти, що задано на завтра, або додати нове завдання. Просто напиши своїми словами."
          : "Можу розповісти про твій розклад, або додати подію — просто напиши своїми словами."),
      ),
      h("div", { class: "section" },
        h("div", { class: "section-head" }, h("div", { class: "section-title" }, h("span", { class: "ico", html: iconMarkup("info") }), "Спробуй запитати")),
        h("div", { class: "chip-row" }, session.suggestions().map((s) => {
          const chip = h("button", { class: "chip" }, s);
          chip.addEventListener("click", () => { input.value = s; submit(); });
          return chip;
        })),
      ),
    ]);
    return box;
  }

  function renderStream(bubble, text) {
    clear(bubble);
    if (!text) {
      bubble.appendChild(typingNode());
      return;
    }
    bubble.appendChild(renderRich(text));
    bubble.appendChild(typingNode());
  }

  function typingNode() {
    return h("div", { class: "typing" }, h("i"), h("i"), h("i"));
  }

  function setBusy(v) {
    busy = v;
    sendBtn.disabled = v;
    clear(sendBtn);
    sendBtn.innerHTML = iconMarkup(v ? "stop" : "send");
    if (v) {
      sendBtn.onclick = () => { session.stop(); };
    } else {
      sendBtn.onclick = submit;
    }
  }

  async function submit() {
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    input.style.height = "auto";
    if (list.querySelector(".chat-hero")) clear(list);
    addMessage({ role: "user", text });
    toBottom(true);
    const bubble = addMessage({ role: "assistant", text: "" });
    clear(bubble);
    bubble.appendChild(typingNode());
    setBusy(true);
    toBottom(true);
    try {
      const reply = await session.send(text, {
        onChunk: (shown) => { renderStream(bubble, shown); toBottom(false); },
      });
      clear(bubble);
      bubble.appendChild(renderRich(reply.text || "Готово."));
      if (reply.changes && reply.changes.length) bubble.appendChild(changesNode(reply.changes));
      if (reply.changes && reply.changes.length) {
        toast(reply.changes[0], { icon: "check", duration: 3200 });
      }
      ctx.pokeRefresh();
    } catch (err) {
      clear(bubble);
      bubble.appendChild(h("div", { class: "chat-change", style: "background:rgba(220,38,38,.1);color:#dc2626" },
        h("span", { class: "ico", html: iconMarkup("info") }),
        h("span", {}, err.message || "Помилка"),
      ));
    } finally {
      setBusy(false);
      toBottom(false);
    }
  }

  sendBtn.onclick = submit;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  });

  renderMessages();
  append(page, [buildHead(), list, composer]);

  return {
    el: page,
    update: () => { paintUserAvatars(); },
    destroy: () => {},
  };
}
