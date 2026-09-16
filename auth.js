import { h, append, btn, field, textInput, clear, toast } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";

export function renderAuth({ mode = "login", onMode, onAuthed }) {
  const wrap = h("div", { class: "auth" });
  const inner = h("div", { class: "auth-inner" });
  let current = mode;
  let busy = false;

  const form = h("div", { class: "auth-card" });
  const switchRow = h("div", { class: "auth-switch" });
  const usersRow = h("div", { class: "auth-users" });

  append(inner, [
    h("div", { class: "auth-logo", html: iconMarkup("calendar") }),
    h("h1", { class: "auth-title" }, "KRI Планер"),
    h("p", { class: "auth-sub" }, "Календар · Графік дня · Щоденник · ШІ"),
    form,
    switchRow,
    usersRow,
  ]);
  wrap.appendChild(inner);

  function paint() {
    clear(form);
    const isLogin = current === "login";
    const username = textInput({ placeholder: isLogin ? "Назва профілю" : "Придумайте назву", name: "username", autocomplete: "username" });
    const displayName = !isLogin ? textInput({ placeholder: "Як до вас звертатися", name: "displayName", autocomplete: "name" }) : null;
    const passWrap = h("div", { class: "input-prefix" },
      h("span", { class: "ico", html: iconMarkup("lock") }),
      textInput({ type: "password", placeholder: "Пароль", name: "password", autocomplete: isLogin ? "current-password" : "new-password", style: "padding-left:43px" }),
    );
    const pass = passWrap.querySelector("input");
    const confirm = textInput({ type: "password", placeholder: "Повторіть пароль", autocomplete: "new-password" });
    const errorBox = h("div", { class: "auth-error hidden" }, h("span", { class: "ico", html: iconMarkup("info") }), h("span", { class: "grow" }));

    const eyeBtn = h("button", { class: "icon-btn plain", type: "button", style: "position:absolute;right:4px;top:50%;transform:translateY(-50%)", html: iconMarkup("eye") });
    eyeBtn.addEventListener("click", () => {
      const show = pass.type === "password";
      pass.type = show ? "text" : "password";
      if (confirm) confirm.type = pass.type;
      eyeBtn.innerHTML = iconMarkup(show ? "eyeOff" : "eye");
    });
    passWrap.appendChild(eyeBtn);

    function showError(msg) {
      errorBox.querySelector("span.grow").textContent = msg;
      errorBox.classList.remove("hidden");
      errorBox.style.animation = "none";
      void errorBox.offsetWidth;
      errorBox.style.animation = "";
    }

    const submit = btn(isLogin ? "Увійти" : "Створити акаунт", {
      icon: isLogin ? "arrowRight" : "user",
      block: true,
      size: "lg",
      onClick: run,
    });

    append(form, [
      errorBox,
      field("Назва профілю", username, isLogin ? null : "Ключ входу — саме його вводите при вході"),
      !isLogin ? field("Ім'я", displayName, "Необов'язково. Показується у привітанні") : null,
      field("Пароль", passWrap, isLogin ? null : "Мінімум 4 символи"),
      !isLogin ? field("Підтвердження пароля", confirm) : null,
      submit,
      h("div", { class: "faint center", style: "font-size:12px;margin-top:12px;line-height:1.45" },
        isLogin ? "Ви залишаєтесь у системі на цьому пристрої — входити щоразу не потрібно." : "Без email. Акаунт зберігається тільки на цьому пристрої."),
    ]);

    function onSubmit(e) { e.preventDefault(); run(); }
    form.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });

    async function run() {
      if (busy) return;
      const name = username.value.trim();
      const pwd = pass.value;
      const shown = displayName ? displayName.value.trim() : "";
      if (!name) return showError("Введіть назву профілю");
      if (name.length < 2) return showError("Назва профілю занадто коротка");
      if (!pwd) return showError("Введіть пароль");
      if (!isLogin) {
        if (pwd.length < 4) return showError("Пароль має містити щонайменше 4 символи");
        if (pwd !== confirm.value) return showError("Паролі не збігаються");
      }
      busy = true;
      errorBox.classList.add("hidden");
      submit.disabled = true;
      clear(submit);
      append(submit, [h("span", { class: "spinner" }), h("span", { class: "btn-label" }, isLogin ? "Входимо…" : "Створюємо…")]);
      try {
        if (isLogin) await store.login(name, pwd);
        else {
          await store.register(name, pwd, shown);
          toast(`Вітаємо, ${shown || name}! Акаунт створено`, { icon: "sparkles" });
        }
        onAuthed();
      } catch (err) {
        busy = false;
        submit.disabled = false;
        clear(submit);
        append(submit, [h("span", { class: "btn-ico", html: iconMarkup(isLogin ? "arrowRight" : "user") }), h("span", { class: "btn-label" }, isLogin ? "Увійти" : "Створити акаунт")]);
        showError(err && err.message ? err.message : "Щось пішло не так");
      }
    }

    clear(switchRow);
    append(switchRow, [
      isLogin ? "Ще немає акаунту? " : "Вже маєте акаунт? ",
      h("button", { type: "button", onclick: () => { current = isLogin ? "register" : "login"; paint(); onMode && onMode(current); } }, isLogin ? "Зареєструватися" : "Увійти"),
    ]);

    loadUsers(isLogin, username);
  }

  async function loadUsers(isLogin, usernameInput) {
    clear(usersRow);
    if (!isLogin) return;
    let names = [];
    try { names = await store.listUsers(); } catch (e) { names = []; }
    if (!names.length) return;
    append(usersRow, [h("div", { class: "faint", style: "width:100%;font-size:12px;margin-bottom:2px" }, "Швидкий вибір профілю:")]);
    for (const n of names.slice(0, 8)) {
      const chip = h("button", { class: "chip", type: "button" },
        h("span", { class: "ico", html: iconMarkup("user") }), n);
      chip.addEventListener("click", () => { usernameInput.value = n; usernameInput.focus(); });
      usersRow.appendChild(chip);
    }
  }

  paint();
  return wrap;
}
