import { h, append, clear } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import {
  todayStr, addDaysStr, weekdayIdx, WEEKDAYS_SHORT, WEEKDAYS_LONG, MONTHS_GEN,
  minOf, nowMinutes, minutesToTime, fmtDateLong, normalizeUrl, prettyUrl, clamp, plural,
} from "../util.js";
import { itemStatus, statusClass, statusLabel } from "../schedule.js";
import { openItemSheet } from "../itemdetail.js";
import { openEventForm } from "../forms.js";
import { openExercise } from "./exercise.js";
import { nextCard } from "../nextcard.js";

const HOUR_H = 72;
const CARD_MIN_H = 62;
const DEFAULT_LESSON_MIN = 45;
const DAY_FROM = 0;
const DAY_TO = 24;
const SNAP_MIN = 30;

function isNightHour(hh) {
  return hh < 7 || hh >= 22;
}

function layoutTimed(items) {
  const rows = items.map((it) => {
    const s = minOf(it.start);
    const e = it.end ? Math.max(minOf(it.end), s + 20) : s + DEFAULT_LESSON_MIN;
    const hgt = Math.max(CARD_MIN_H, Math.round((e - s) / 60 * HOUR_H - 5));
    const effE = Math.max(e, s + (hgt / HOUR_H) * 60);
    return { it, s, e, effE, hgt, lane: 0, lanes: 1 };
  }).sort((a, b) => a.s - b.s || a.e - b.e);

  let cluster = [];
  let clusterMaxEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const laneEnds = [];
    for (const row of cluster) {
      let placed = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= row.s) { placed = i; break; }
      }
      if (placed === -1) { laneEnds.push(row.effE); placed = laneEnds.length - 1; }
      else laneEnds[placed] = row.effE;
      row.lane = placed;
    }
    const lanes = Math.max(1, laneEnds.length);
    for (const row of cluster) row.lanes = lanes;
    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const row of rows) {
    if (cluster.length && row.s >= clusterMaxEnd) flush();
    cluster.push(row);
    clusterMaxEnd = Math.max(clusterMaxEnd, row.effE);
  }
  flush();
  return rows;
}

function countLabel(n) {
  return `${n} ${plural(n, "подія", "події", "подій")}`;
}

export function renderDay(ctx) {
  const page = h("div", { class: "page page-day" });
  const lookahead = Number(window.root.dayLookahead) || 3;
  let tick = null;
  let firstScroll = true;

  function build() {
    clear(page);
    const today = todayStr();
    append(page, [
      h("div", { class: "page-head" },
        h("div", { class: "page-kicker" }, "Погодинно"),
        h("h1", { class: "page-title" }, "Графік дня"),
        h("div", { class: "page-sub" }, `${fmtDateLong(today)} · сьогодні та ще ${lookahead} ${lookahead === 1 ? "день" : "дні"}`),
      ),
      nextCard(ctx, { filter: (i) => i.category === "timed", hideEmpty: true }),
    ]);

    let todayScrollTarget = null;
    const list = h("div", { class: "day-list" });
    for (let i = 0; i <= lookahead; i++) {
      const date = addDaysStr(today, i);
      const block = dayBlock(date, today, i);
      list.appendChild(block.el);
      if (i === 0) todayScrollTarget = block.nowAnchor;
    }
    page.appendChild(list);

    if (firstScroll && todayScrollTarget) {
      firstScroll = false;
      requestAnimationFrame(() => ctx.scrollToEl(todayScrollTarget, 150));
    }
  }

  function dayBlock(date, today, offset) {
    const items = store.timedItems(date);
    const dow = weekdayIdx(date);
    const isToday = date === today;
    const from = DAY_FROM;
    const to = DAY_TO;

    const head = h("div", { class: "day-block-head" },
      h("div", { class: `day-badge${isToday ? " is-today" : ""}` },
        h("div", { class: "day-badge-dow" }, WEEKDAYS_SHORT[dow]),
        h("div", { class: "day-badge-num" }, String(Number(date.slice(8, 10)))),
      ),
      h("div", { class: "day-head-text" },
        h("div", { class: "day-head-title" }, offset === 0 ? "Сьогодні" : offset === 1 ? "Завтра" : offset === 2 ? "Післязавтра" : WEEKDAYS_LONG[dow]),
        h("div", { class: "day-head-sub" }, `${WEEKDAYS_LONG[dow]}, ${Number(date.slice(8, 10))} ${MONTHS_GEN[Number(date.slice(5, 7)) - 1]} · ${countLabel(items.length)}`),
      ),
    );

    const block = h("div", { class: "day-block" }, head);

    if (!items.length) {
      block.appendChild(h("div", { class: "day-free-note" },
        h("span", { class: "dfn-ico", html: iconMarkup("clock") }),
        h("span", {}, "Вільно — натисни на годину, щоб додати подію"),
      ));
    }

    const timeline = h("div", { class: "timeline" });
    const rangeStartMin = from * 60;
    const height = (to - from) * HOUR_H;
    const scroll = h("div", { class: "tl-scroll", style: `height:${height}px;--hour-h:${HOUR_H}px` });

    for (const span of [[-1, 7], [22, 25]]) {
      const a = Math.max(span[0], from);
      const b = Math.min(span[1], to);
      if (b <= a) continue;
      scroll.appendChild(h("div", { class: "night-band", style: `top:${(a - from) * HOUR_H}px;height:${(b - a) * HOUR_H}px` }));
    }

    const nowMin = nowMinutes();
    const nowTop = isToday ? (nowMin - rangeStartMin) / 60 * HOUR_H : null;

    for (let hh = from; hh <= to; hh++) {
      const top = (hh * 60 - rangeStartMin) / 60 * HOUR_H;
      const night = isNightHour(hh);
      scroll.appendChild(h("div", { class: `hour-line${night ? " is-night" : ""}`, style: `top:${top}px` }));
      if (hh < to) {
        let labelTop = top + HOUR_H / 2;
        if (nowTop !== null && Math.abs(labelTop - nowTop) < 22) {
          labelTop = nowTop + (labelTop >= nowTop ? 22 : -22);
        }
        scroll.appendChild(h("div", { class: `hour-label${night ? " is-night" : ""}`, style: `top:${labelTop}px` }, `${String(hh).padStart(2, "0")}:00`));
      }
    }

    const rows = layoutTimed(items);
    const area = h("div", { class: "tl-area" });
    for (const row of rows) {
      const st = itemStatus(row.it, date);
      const top = (row.s - rangeStartMin) / 60 * HOUR_H;
      const hgt = row.hgt;
      const left = (row.lane / row.lanes) * 100;
      const width = (1 / row.lanes) * 100;
      const card = eventCard(row.it, date, st, { top, hgt, left, width });
      area.appendChild(card);
    }
    scroll.appendChild(area);

    let nowAnchor = head;
    if (isToday && nowTop !== null) {
      scroll.appendChild(h("div", { class: "now-line", style: `top:${nowTop}px` }));
      scroll.appendChild(h("div", { class: "now-label", style: `top:${nowTop}px` }, `${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`));
      const marker = h("div", { class: "now-anchor", style: `top:${nowTop}px` });
      scroll.appendChild(marker);
      nowAnchor = marker;
    }

    scroll.addEventListener("click", (e) => {
      if (e.target.closest(".eb") || e.target.closest("a") || e.target.closest("button")) return;
      const rect = scroll.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snapped = clamp(Math.floor(((y / HOUR_H) * 60) / SNAP_MIN) * SNAP_MIN, 0, 23 * 60 + 30);
      openEventForm(ctx, null, "once", {
        date,
        start: minutesToTime(snapped),
        end: minutesToTime(Math.min(snapped + 60, 23 * 60 + 59)),
      });
    });

    timeline.appendChild(scroll);
    block.appendChild(timeline);
    if (offset !== 0) block.style.marginBottom = "22px";
    return { el: block, nowAnchor };
  }

  function eventCard(item, date, st, geo) {
    const isExercise = item.source === "exercise";
    const isLesson = item.source === "lesson";
    const style = `top:${geo.top}px;height:${geo.hgt}px;left:calc(${geo.left}% + 6px);width:calc(${geo.width}% - 12px)`;

    const titleRow = h("div", { class: "eb-title" },
      isLesson ? h("span", { class: "eb-badge eb-num" }, String(item.lessonNo)) : null,
      isExercise ? h("span", { class: "eb-badge eb-ico-badge", html: iconMarkup("dumbbell") }) : null,
      h("span", { class: "eb-name" }, item.short || item.title),
      item.link ? linkChip(item.link) : null,
    );

    const narrow = geo.width <= 70;
    const metaText = narrow && isExercise
      ? item.start
      : `${item.start}${item.end ? "–" + item.end : ""}${item.meta ? " · " + item.meta : ""}`;
    const metaRow = h("div", { class: "eb-meta-row" },
      h("span", { class: "eb-meta" }, metaText),
      isExercise && item.done ? h("span", { class: "eb-badge eb-done" }, "Виконано") : null,
      isExercise && !item.done ? h("button", {
        class: "eb-start", type: "button",
        onclick: (e) => { e.stopPropagation(); openExercise(ctx); },
      }, "Почати") : null,
      st === "live" || st === "soon" ? h("span", { class: "eb-badge" }, statusLabel(st, item)) : null,
    );

    const card = h("div", { class: `eb is-${item.source} ${statusClass(st)}`.trim(), style },
      titleRow,
      metaRow,
    );

    if (isExercise && item.done) {
      card.classList.add("is-static");
    } else {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        if (isExercise) { openExercise(ctx); return; }
        openItemSheet(item, date, ctx);
      });
    }
    return card;
  }

  function linkChip(linkUrl) {
    return h("a", {
      class: "eb-linkchip",
      href: normalizeUrl(linkUrl),
      target: "_blank",
      rel: "noopener noreferrer",
      title: prettyUrl(linkUrl),
      html: iconMarkup("link"),
      onclick: (e) => e.stopPropagation(),
    });
  }

  build();
  tick = setInterval(build, 20000);
  return {
    el: page,
    update: () => { firstScroll = false; build(); },
    destroy: () => clearInterval(tick),
  };
}
