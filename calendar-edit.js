import { h, append, clear, btn, toast, confirmDialog, toggleRow, segmented, field, selectInput } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import { todayStr, addDaysStr, toISODow, plural, occurrencesOfRepeatPattern, diffDays, tripDuration, tripRangeLabel, tripReminder } from "../util.js";
import { openEventForm, openTimetableEditor, openTripForm } from "../forms.js";
import { openTripSheet } from "../itemdetail.js";
import { exerciseSettingsBlock } from "./exercise.js";
import { PALETTES, applyTheme } from "../themes.js";

export function nextOccurrence(ev) {
  const today = todayStr();
  if (ev.kind === "once" || !ev.kind) return ev.date;
  for (let i = 0; i < 400; i++) {
    const d = addDaysStr(today, i);
    if (occurrencesOfRepeatPattern(ev, d)) return d;
  }
  return null;
}

export function renderCalendarEdit(ctx) {
  const page = h("div", { class: "page page-edit" });

  function build() {
    clear(page);
    append(page, [
      h("div", { class: "page-head" },
        h("div", { class: "page-kicker" }, "Керування"),
        h("h1", { class: "page-title" }, "Редагування"),
        h("div", { class: "page-sub" }, "Події, подорожі, графік тижня та налаштування застосунку"),
      ),
      h("div", { class: "section" },
        h("div", { class: "section-title", style: "margin:0 2px 10px" }, h("span", { class: "ico", html: iconMarkup("plus") }), "Додати"),
        h("div", { class: "tile-grid" },
          tile("Додати одноразову подію", "Зустріч, тренування, візит — на конкретну дату", "calendar", () => openEventForm(ctx, null, "once")),
          tile("Додати свято", "Повторюється щороку раз на рік і показується в Календарі", "gift", () => openEventForm(ctx, null, "yearly")),
          tile("Додати подорож", "Обери дати виїзду й повернення — Календар нагадає заздалегідь", "luggage", () => openTripForm(ctx, null)),
          tile("Додати повторювану подію", "Щодня, щотижня, щомісяця або кожні N днів", "refresh", () => openEventForm(ctx, null, "weekly")),
          tile("Редагувати графік", "Заняття тижня по годинах — повторюються щотижня", "book", () => openTimetableEditor(ctx, toISODow(new Date()))),
        ),
      ),
      tripsSection(),
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

  function tripsSection() {
    const today = todayStr();
    const list = store.data.trips.slice().sort((a, b) => String(a.from).localeCompare(String(b.from)));
    const box = h("div", { class: "section" },
      h("div", { class: "section-head" },
        h("div", { class: "section-title" }, h("span", { class: "ico", html: iconMarkup("luggage") }), "Мої подорожі"),
        h("div", { class: "section-hint" }, `${list.length} ${plural(list.length, "подорож", "подорожі", "подорожей")}`),
      ),
    );
    if (!list.length) {
      box.appendChild(h("div", { class: "empty-state" },
        h("span", { class: "ico", html: iconMarkup("mapPin") }),
        h("h4", {}, "Подорожей поки немає"),
        h("p", {}, "Додайте подорож — і Календар нагадає за день до виїзду та в день подорожі."),
      ));
      return box;
    }
    for (const trip of list) {
      const days = tripDuration(trip);
      const rem = tripReminder(trip, today);
      const until = diffDays(today, trip.from);
      const when = rem
        ? rem.title
        : (trip.to < today
          ? "Завершено"
          : until === 1
            ? "Завтра подорож"
            : `Через ${until} ${plural(until, "день", "дні", "днів")}`);
      const row = h("div", { class: `list-row is-trip${rem ? " is-active" : ""}` },
        h("span", { class: "tile-ico is-trip", html: iconMarkup("luggage") }),
        h("div", { class: "list-row-main", style: "cursor:pointer", onclick: () => openTripSheet(trip, ctx) },
          h("div", { class: "list-row-title" }, trip.title),
          h("div", { class: "list-row-sub" },
            h("span", {}, tripRangeLabel(trip)),
            h("span", {}, `${days} ${plural(days, "день", "дні", "днів")}`),
            h("span", { class: `tag${rem ? "" : " tag-muted"}` }, when),
          ),
        ),
        h("div", { class: "list-row-actions" },
          h("button", { class: "icon-btn", title: "Редагувати", html: iconMarkup("edit"), onclick: () => openTripForm(ctx, trip) }),
          h("button", {
            class: "icon-btn", title: "Видалити", html: iconMarkup("trash"),
            onclick: async () => {
              if (await confirmDialog({ title: "Видалити подорож?", message: `«${trip.title}» зникне з календаря.`, confirmText: "Видалити", danger: true })) {
                store.removeTrip(trip.id);
                toast("Подорож видалено", { icon: "trash", duration: 2200 });
              }
            },
          }),
        ),
      );
      box.appendChild(row);
    }
    return box;
  }

  function settingsSection() {
    const s = store.data.settings;
    const box = h("div", { class: "section", id: "app-settings" },
      h("div", { class: "section-head" },
        h("div", { class: "section-title" }, h("span", { class: "ico", html: iconMarkup("sliders") }), "Налаштування"),
      ),
      h("div", { class: "card" },
        h("button", {
          class: "tile", style: "box-shadow:none;border:none;padding:14px 0;background:transparent", onclick: () => toast("Зміна мови з'явиться в наступному оновленні", { icon: "globe", duration: 3000 }),
        },
          h("span", { class: "tile-ico", html: iconMarkup("globe") }),
          h("span", { class: "tile-text" },
            h("span", { class: "tile-title" }, "Змінити мову"),
            h("span", { class: "tile-sub" }, "Зараз — українська"),
          ),
          h("span", { class: "chev", html: iconMarkup("chevronRight") }),
        ),
      ),
      h("div", { class: "card", style: "margin-top:12px" },
        h("div", { class: "section-title", style: "margin-bottom:6px" }, h("span", { class: "ico", html: iconMarkup("dumbbell") }), "Зарядка"),
        exerciseBlock.el,
      ),
      h("div", { class: "card", style: "margin-top:12px" },
        h("div", { class: "section-title", style: "margin-bottom:6px" }, h("span", { class: "ico", html: iconMarkup("bell") }), "Нагадування"),
        toggleRow("Нагадувати про події", !!s.reminders.events, (v) => { store.setSetting("reminders.events", v); rebuild(); }, "Спливаюче повідомлення перед початком події"),
        s.reminders.events ? field("За скільки хвилин", selectInput(
          [{ value: 5, label: "за 5 хвилин" }, { value: 10, label: "за 10 хвилин" }, { value: 15, label: "за 15 хвилин" }, { value: 30, label: "за 30 хвилин" }],
          s.reminders.eventsMinutes,
          { onchange: (e) => store.setSetting("reminders.eventsMinutes", Number(e.target.value)) },
        )) : null,
      ),
      h("div", { class: "card", style: "margin-top:12px" },
        h("div", { class: "section-title", style: "margin-bottom:10px" }, h("span", { class: "ico", html: iconMarkup("palette") }), "Вигляд"),
        h("div", { class: "field-label" }, "Світлий чи темний режим"),
        segmented(
          [{ value: "light", label: "Світлий", icon: "sun" }, { value: "dark", label: "Темний", icon: "moon" }],
          s.mode,
          (v) => { store.setSetting("mode", v); applyTheme(store.data.settings.theme, v); rebuild(); },
          { fill: true },
        ),
        h("div", { class: "field-label", style: "margin:16px 0 8px" }, "Головний колір"),
        h("div", { class: "color-grid" }, PALETTES.map((p) => {
          const active = p.id === s.theme;
          const swatch = p[mode()];
          const opt = h("button", { class: `color-opt${active ? " is-active" : ""}`, type: "button" },
            h("span", { class: "color-swatch", style: `background:linear-gradient(135deg,${swatch.c1},${swatch.c2} 55%,${swatch.c3})` }),
            h("span", {},
              h("span", { class: "color-opt-name" }, p.name),
              h("span", { class: "color-opt-hint" }, p.hint),
            ),
          );
          opt.addEventListener("click", () => { store.setSetting("theme", p.id); applyTheme(p.id, store.data.settings.mode); rebuild(); });
          return opt;
        })),
      ),
      accountCard(),
    );
    return box;
  }

  function mode() {
    return store.data.settings.mode === "dark" ? "dark" : "light";
  }

  const exerciseBlock = exerciseSettingsBlock(ctx);

  function accountCard() {
    return h("div", { class: "card", style: "margin-top:12px" },
      h("div", { class: "section-title", style: "margin-bottom:10px" }, h("span", { class: "ico", html: iconMarkup("user") }), "Профіль"),
      h("div", { class: "row-between" },
        h("div", {},
          h("div", { style: "font-weight:800;font-size:15px" }, store.displayName() || "—"),
          h("div", { class: "faint", style: "font-size:12.5px;margin-top:2px" }, `Назва профілю: ${store.user || "—"} · дані на цьому пристрої`),
        ),
        btn("Вийти", {
          variant: "danger-ghost", size: "sm", icon: "arrowLeft",
          onClick: async () => {
            if (await confirmDialog({ title: "Вийти з акаунту?", message: "Ви зможете увійти знову в будь-який момент — дані залишаться на пристрої.", confirmText: "Вийти", danger: true })) {
              await store.logout();
            }
          },
        }),
      ),
    );
  }

  function rebuild() { build(); }

  build();
  return { el: page, update: build };
}
