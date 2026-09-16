import { h, append, openSheet, btn, toast, confirmDialog } from "./ui.js";
import { iconMarkup } from "./icons.js";
import { store } from "./store.js";
import { fmtDateLong, prettyUrl, normalizeUrl, todayStr, tripDuration, tripRangeLabel, tripReminder, WEEKDAYS_LONG, weekdayIdx, plural } from "./util.js";
import { statusLabel, itemStatus } from "./schedule.js";

export function openItemSheet(item, dateStr, ctx) {
  const sheet = openSheet({
    title: item.title,
    subtitle: `${fmtDateLong(dateStr)}${item.start ? " · " + (item.end ? `${item.start}–${item.end}` : item.start) : " · весь день"}`,
    icon: item.source === "lesson" ? "book" : "calendar",
  });
  const st = itemStatus(item, dateStr);
  const body = sheet.body;

  append(body, [
    h("div", { class: "chip-row", style: "margin-bottom:14px" },
      h("span", { class: `tag${item.source === "lesson" ? "" : " tag-muted"}` }, item.source === "lesson" ? `Заняття №${item.lessonNo}` : (item.kind && item.kind !== "once" ? "Повторювана подія" : "Подія")),
      item.meta ? h("span", { class: "tag tag-muted" }, item.meta) : null,
      statusLabel(st, item) ? h("span", { class: "tag" }, statusLabel(st, item)) : null,
    ),
    item.desc ? h("div", { style: "font-size:14.5px;line-height:1.55;white-space:pre-wrap;color:var(--dim)" }, item.desc) : h("div", { class: "faint", style: "font-size:14px" }, "Опису немає."),
    item.link
      ? h("a", { class: "task-link", href: normalizeUrl(item.link), target: "_blank", rel: "noopener noreferrer", style: "margin-top:14px" },
          h("span", { class: "ico", html: iconMarkup("link") }), prettyUrl(item.link))
      : null,
    item.raw && item.raw.kind && item.raw.kind !== "once"
      ? h("div", { class: "faint", style: "font-size:12.5px;margin-top:14px" }, "Повторюється: " + repeatText(item.raw))
      : null,
  ]);

  const actions = [];
  if (item.source === "event") {
    actions.push(btn("Редагувати", { variant: "soft", block: true, icon: "edit", onClick: () => { sheet.close(); ctx.openEventForm(item.raw); } }));
    actions.push(btn("Видалити", {
      variant: "danger-ghost", block: true, icon: "trash",
      onClick: async () => {
        if (await confirmDialog({ title: "Видалити подію?", message: `«${item.title}» буде видалено з календаря.`, confirmText: "Видалити", danger: true })) {
          store.removeEvent(item.raw.id);
          toast("Подію видалено", { icon: "trash", duration: 2400 });
          sheet.close();
        }
      },
    }));
  } else {
    actions.push(btn("Перейти в графік дня", { variant: "soft", block: true, icon: "clock", onClick: () => { sheet.close(); ctx.navigate("calendar", "day"); } }));
  }
  append(sheet.footer, actions);
  return sheet;
}

export function openTripSheet(trip, ctx) {
  const today = todayStr();
  const rem = tripReminder(trip, today);
  const days = tripDuration(trip);
  const sheet = openSheet({
    title: trip.title || "Подорож",
    subtitle: `${tripRangeLabel(trip)} · ${days} ${plural(days, "день", "дні", "днів")}`,
    icon: "luggage",
    size: "md",
  });

  append(sheet.body, [
    rem ? h("div", { class: `trip-head is-${rem.kind}` },
      h("span", { class: "trip-head-ico", html: iconMarkup("luggage") }),
      h("div", { class: "trip-head-text" },
        h("div", { class: "trip-head-title" }, rem.title),
        rem.note ? h("div", { class: "trip-head-sub" }, rem.note) : null,
      ),
    ) : null,
    h("div", { class: "trip-rows" },
      tripRow("Виїзд", trip.from),
      tripRow("Повернення", trip.to),
      tripRow("Тривалість", null, `${days} ${plural(days, "день", "дні", "днів")}`),
    ),
    trip.desc ? h("div", { class: "trip-desc" }, trip.desc) : null,
    trip.link
      ? h("a", { class: "task-link", href: normalizeUrl(trip.link), target: "_blank", rel: "noopener noreferrer", style: "margin-top:14px" },
          h("span", { class: "ico", html: iconMarkup("link") }), prettyUrl(trip.link))
      : null,
  ]);

  append(sheet.footer, [
    btn("Редагувати подорож", { variant: "soft", block: true, icon: "edit", onClick: () => { sheet.close(); ctx.openTripForm(trip); } }),
    btn("Видалити", {
      variant: "danger-ghost", block: true, icon: "trash",
      onClick: async () => {
        if (await confirmDialog({ title: "Видалити подорож?", message: `«${trip.title}» зникне з календаря.`, confirmText: "Видалити", danger: true })) {
          store.removeTrip(trip.id);
          toast("Подорож видалено", { icon: "trash", duration: 2400 });
          sheet.close();
        }
      },
    }),
  ]);
  return sheet;
}

function tripRow(label, dateStr, override) {
  return h("div", { class: "trip-row" },
    h("span", { class: "trip-row-label" }, label),
    h("span", { class: "trip-row-value" },
      override || (dateStr ? `${fmtDateLong(dateStr)} · ${WEEKDAYS_LONG[weekdayIdx(dateStr)].toLowerCase()}` : ""),
    ),
  );
}

function repeatText(ev) {
  const k = ev.kind;
  if (k === "yearly") return "щороку";
  if (k === "daily") return "щодня";
  if (k === "weekly") return "щотижня";
  if (k === "monthly") return "щомісяця";
  return String(k);
}
