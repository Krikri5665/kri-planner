import { h, append, clear, toast, toggleRow, field } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import { todayStr, toISODow, plural } from "../util.js";
import { openTaskForm, openTimetableEditor } from "../forms.js";

export function renderDiaryEdit(ctx) {
  const page = h("div", { class: "page page-edit" });

  function build() {
    clear(page);
    append(page, [
      h("div", { class: "page-head" },
        h("div", { class: "page-kicker" }, "Щоденник · керування"),
        h("h1", { class: "page-title" }, "Редагування"),
        h("div", { class: "page-sub" }, "Завдання, розклад і налаштування щоденника"),
      ),
      h("div", { class: "section" },
        h("div", { class: "section-title", style: "margin:0 2px 10px" }, h("span", { class: "ico", html: iconMarkup("plus") }), "Додати"),
        h("div", { class: "tile-grid" },
          tile("Додати завдання", "Тема, назва, опис, дата та посилання", "clipboard", () => openTaskForm(ctx, null)),
          tile("Розклад", "Заняття на всі дні тижня — з'являться в Графіку дня", "book", () => openTimetableEditor(ctx, toISODow(new Date()))),
        ),
      ),
      settingsSection(),
    ]);
  }

  function tile(title, sub, ico, onclick) {
    return h("button", { class: "tile", onclick },
      h("span", { class: "tile-ico", html: iconMarkup(ico) }),
      h("span", { class: "tile-text" },
        h("span", { class: "tile-title" }, title),
        h("span", { class: "tile-sub" }, sub),
      ),
      h("span", { class: "chev", html: iconMarkup("chevronRight") }),
    );
  }

  function settingsSection() {
    const s = store.data.settings;
    const timeInput = h("input", { class: "input", type: "time", value: s.reminders.homeworkTime || "18:00", style: "max-width:140px" });
    timeInput.addEventListener("change", () => store.setSetting("reminders.homeworkTime", timeInput.value || "18:00"));
    return h("div", { class: "section" },
      h("div", { class: "section-head" },
        h("div", { class: "section-title" }, h("span", { class: "ico", html: iconMarkup("sliders") }), "Налаштування щоденника"),
      ),
      h("div", { class: "card" },
        toggleRow("Показувати виконані завдання", !!s.diary.showDone, (v) => store.setSetting("diary.showDone", v), "Окремий згорнутий список унизу"),
        toggleRow("Пропонувати «найближче заняття»", !!s.diary.defaultNextLesson, (v) => store.setSetting("diary.defaultNextLesson", v), "Автоматична дата, якщо завдання прив'язане до теми"),
        toggleRow("Нагадування про завдання", !!s.reminders.homework, (v) => { store.setSetting("reminders.homework", v); build(); }, "Нагадати ввечері, якщо залишились невиконані завдання"),
        s.reminders.homework ? field("Час нагадування", timeInput) : null,
        toggleRow("Переносити прострочені на сьогодні", !!s.diary.rollOver, (v) => { store.setSetting("diary.rollOver", v); if (v) rollOver(); }, "Старі завдання не загубляться"),
      ),
      h("div", { class: "card", style: "margin-top:12px" },
        h("button", {
          class: "tile", style: "box-shadow:none;border:none;padding:4px 0;background:transparent",
          onclick: () => ctx.navigate("calendar", "edit", { scrollTo: "app-settings" }),
        },
          h("span", { class: "tile-ico", html: iconMarkup("sliders") }),
          h("span", { class: "tile-text" },
            h("span", { class: "tile-title" }, "Налаштувати весь застосунок"),
            h("span", { class: "tile-sub" }, "Колір, тема, зарядка, нагадування — у розділі «Календар → Редагування»"),
          ),
          h("span", { class: "chev", html: iconMarkup("chevronRight") }),
        ),
      ),
    );
  }

  function rollOver() {
    const today = todayStr();
    let moved = 0;
    for (const t of store.data.tasks) {
      if (!t.done && t.due < today && t.due) { t.due = today; moved++; }
    }
    if (moved) { store.commit(); toast(`Перенесено ${moved} ${plural(moved, "завдання", "завдання", "завдань")} на сьогодні`, { icon: "refresh" }); }
  }

  build();
  return { el: page, update: build };
}
