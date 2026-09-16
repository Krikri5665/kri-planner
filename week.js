import { h, append, clear, kriTitle } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import { todayStr, addDaysStr, startOfWeekStr, fmtWeekRange, WEEKDAYS_SHORT, fmtDateLong, WEEKDAYS_LONG, weekdayIdx, plural, tripReminder } from "../util.js";
import { itemStatus } from "../schedule.js";
import { openItemSheet, openTripSheet } from "../itemdetail.js";
import { tripNotice } from "../nextcard.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Доброї ночі";
  if (hour < 12) return "Доброго ранку";
  if (hour < 18) return "Доброго дня";
  return "Доброго вечора";
}

export function renderWeek(ctx) {
  const page = h("div", { class: "page page-week" });
  const lookahead = Number(window.root.weekLookahead) || 3;

  function build() {
    clear(page);
    const today = todayStr();

    const titleEl = h("h1", { class: "page-title" }, "Календар");
    append(page, [
      h("div", { class: "page-head" },
        h("div", { class: "page-kicker" }, `${greeting()}${store.displayName() ? ", " + store.displayName() : ""}`),
        titleEl,
        h("div", { class: "page-sub" }, `${WEEKDAYS_LONG[weekdayIdx(today)]}, ${fmtDateLong(today)}`),
      ),
      tripBanners(today),
      h("div", { class: "section" },
        h("div", { class: "section-head is-stacked" },
          h("div", { class: "section-title" },
            h("span", { class: "ico", html: iconMarkup("calendar") }),
            "Розклад на тижні",
            h("span", { class: "tag tag-muted" }, `до ${lookahead} ${plural(lookahead, "тижня", "тижнів", "тижнів")} уперед`),
          ),
          h("div", { class: "section-hint" }, "Події на весь день, свята й подорожі. Події з часом — у «Графіку дня»"),
        ),
        weekList(today, lookahead),
      ),
    ]);

    if (ctx.consumeTitleAnim && ctx.consumeTitleAnim()) {
      kriTitle(titleEl, "Календар");
    }
  }

  function tripBanners(today) {
    const out = [];
    for (const trip of store.data.trips) {
      const rem = tripReminder(trip, today);
      if (!rem) continue;
      out.push(h("div", { class: "trip-banner" }, tripNotice(trip, rem, ctx)));
    }
    return out;
  }

  function weekList(today, lookahead) {
    const wrap = h("div", { class: "week-list" });
    const base = startOfWeekStr(today);
    for (let w = 0; w <= lookahead; w++) {
      const start = addDaysStr(base, w * 7);
      const isCurrent = w === 0;
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysStr(start, i);
        const items = store.calendarItems(date);
        const isToday = date === today;
        const dow = weekdayIdx(date);
        const dateCol = h("div", { class: "wday-date" },
          h("div", { class: "wday-name" }, WEEKDAYS_SHORT[dow]),
          h("div", { class: `wday-num${date < today ? " is-past" : ""}` }, String(Number(date.slice(8, 10)))),
        );
        const itemsCol = h("div", { class: "wday-items" });
        if (!items.length) {
          itemsCol.appendChild(h("div", { class: "wday-empty" }, "—"));
        } else {
          for (const item of items) itemsCol.appendChild(calChip(item, date));
        }
        days.push(h("div", { class: `wday${isToday ? " is-today" : ""}${dow >= 5 ? " is-weekend" : ""}` }, dateCol, itemsCol));
      }
      const card = h("div", { class: `card week-card${isCurrent ? " is-current" : ""}` },
        h("div", { class: "week-head" },
          h("div", {},
            h("div", { class: "week-head-title" }, fmtWeekRange(start)),
            h("div", { class: "week-head-sub" }, isCurrent ? "Цей тиждень" : w === 1 ? "Наступний тиждень" : `Через ${w} ${plural(w, "тиждень", "тижні", "тижнів")}`),
          ),
          isCurrent ? h("span", { class: "tag" }, "Сьогодні тут") : null,
        ),
        ...days,
      );
      wrap.appendChild(card);
    }
    return wrap;
  }

  function calChip(item, date) {
    if (item.source === "trip") {
      const rem = item.reminder;
      return h("button", {
        class: `trip-chip is-${rem.kind}`,
        type: "button",
        onclick: () => openTripSheet(item.trip, ctx),
      },
        h("span", { class: "trip-chip-ico", html: iconMarkup("luggage") }),
        h("span", { class: "trip-chip-text" },
          h("span", { class: "trip-chip-title" }, rem.title),
          h("span", { class: "trip-chip-sub" }, `${item.trip.title}${rem.note ? " · " + rem.note : ""}`),
        ),
        h("span", { class: "chev", html: iconMarkup("chevronRight") }),
      );
    }
    const st = itemStatus(item, date);
    const isHoliday = item.category === "holiday";
    return h("button", {
      class: `chip-item is-${isHoliday ? "holiday" : "allday"}${st === "past" ? " is-past" : ""}`,
      onclick: () => openItemSheet(item, date, ctx),
    },
      h("span", { class: "ci-ico", html: iconMarkup(isHoliday ? "gift" : "calendar") }),
      h("span", { class: "ci-title" }, item.title),
      item.start ? h("span", { class: "ci-time" }, item.start) : null,
    );
  }

  build();
  return { el: page, update: build };
}
