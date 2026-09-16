import { h, btn } from "./ui.js";
import { iconMarkup } from "./icons.js";
import { nextItem, countdownText } from "./schedule.js";
import { openItemSheet, openTripSheet } from "./itemdetail.js";
import { openExercise } from "./screens/exercise.js";
import { tripRangeLabel } from "./util.js";

export function nextCard(ctx, opts = {}) {
  const { filter, hideEmpty = false } = opts;
  const next = nextItem(filter);

  if (!next) {
    if (hideEmpty) return null;
    return h("div", { class: "gradient-note" },
      h("div", { class: "gn-title" }, h("span", { class: "ico", html: iconMarkup("sparkles") }), "Вільно"),
      h("div", { class: "gn-text" }, "На сьогодні й на завтра в розкладі порожньо. Гарний час, щоб додати щось нове."),
      h("div", { class: "gn-actions" },
        btn("Додати подію", { variant: "ghost", size: "sm", icon: "plus", onClick: () => ctx.openEventForm(null) }),
      ),
    );
  }

  const { item, status, date } = next;
  const isTomorrow = status === "tomorrow";
  const raw = isTomorrow
    ? "Наступне завтра"
    : status === "live"
      ? (item.end ? `Зараз триває до ${item.end}` : "Зараз триває")
      : (item.start ? countdownText(item, date) : "Наступне");
  const labelText = raw.charAt(0).toUpperCase() + raw.slice(1);

  const open = () => {
    if (item.source === "exercise") { openExercise(ctx); return; }
    if (item.source === "trip") { openTripSheet(item.trip, ctx); return; }
    openItemSheet(item, date, ctx);
  };

  return h("div", { class: "gradient-note", role: "button", style: "cursor:pointer", onclick: open },
    h("div", { class: "gn-title" }, h("span", { class: "ico", html: iconMarkup(isTomorrow ? "calendar" : "clock") }), labelText),
    h("div", { class: "gn-text" },
      h("strong", {}, item.title),
      item.start ? ` · ${item.start}${item.end ? "–" + item.end : ""}` : "",
      item.meta ? ` · ${item.meta}` : "",
    ),
    item.source === "exercise" && !item.done
      ? h("div", { class: "gn-actions" },
          btn("Почати", { variant: "soft", size: "sm", icon: "dumbbell", onClick: (e) => { e.stopPropagation(); openExercise(ctx); } }),
        )
      : null,
  );
}

export function tripNotice(trip, reminder, ctx) {
  return h("button", {
    class: `trip-note is-${reminder.kind}`,
    type: "button",
    onclick: () => openTripSheet(trip, ctx),
  },
    h("span", { class: "trip-note-ico", html: iconMarkup("luggage") }),
    h("span", { class: "trip-note-text" },
      h("span", { class: "trip-note-title" }, reminder.title),
      h("span", { class: "trip-note-sub" }, `${trip.title} · ${reminder.note || tripRangeLabel(trip)}`),
    ),
    h("span", { class: "chev", html: iconMarkup("chevronRight") }),
  );
}
