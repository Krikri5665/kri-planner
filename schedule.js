import { minOf, nowMinutes, todayStr, diffDays, relDayWord, plural, addDaysStr } from "./util.js";
import { store } from "./store.js";

export const soonMinutes = () => Number(window.root.soonMinutes) || 5;

export function itemStatus(item, dateStr, nowMin = nowMinutes()) {
  const isTimed = item.category ? item.category === "timed" : !!item.start;
  if (!isTimed || !item.start) {
    return dateStr === todayStr() ? "allday" : (dateStr < todayStr() ? "past" : "allday");
  }
  if (item.done) return "past";
  const delta = diffDays(todayStr(), dateStr);
  if (delta < 0) return "past";
  if (delta > 0) return "upcoming";
  const s = minOf(item.start);
  if (s == null) return "allday";
  const e = item.end ? minOf(item.end) : s + 45;
  const soon = soonMinutes();
  // Зарядку можна зробити будь-коли протягом дня, тож після її вікна вона
  // лишається активною (з кнопкою «Почати»), а не «завершеною».
  if (item.source === "exercise") {
    if (nowMin < s - soon) return "upcoming";
    if (nowMin <= s) return "soon";
    if (nowMin < e) return "live";
    return "upcoming";
  }
  if (nowMin < s - soon) return "upcoming";
  if (nowMin <= s) return "soon";
  if (nowMin < e) return "live";
  if (nowMin < e + soon) return "ending";
  return "past";
}

export function statusClass(status) {
  switch (status) {
    case "soon": return "is-soon";
    case "live": return "is-now";
    case "ending": return "is-ending";
    case "past": return "is-past";
    default: return "";
  }
}

export function statusLabel(status, item) {
  if (item && item.source === "exercise" && item.done) return "Виконано";
  switch (status) {
    case "soon": return "Ось-ось";
    case "live": return "Зараз";
    case "ending": return "Завершується";
    case "past": return "Завершено";
    default: return "";
  }
}

export function humanDuration(mins) {
  const m = Math.max(0, Math.round(mins));
  if (m < 1) return "менше хвилини";
  if (m < 60) return `${m} ${plural(m, "хвилина", "хвилини", "хвилин")}`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  if (hours < 24) {
    return rest ? `${hours} год ${rest} хв` : `${hours} ${plural(hours, "година", "години", "годин")}`;
  }
  const days = Math.round(hours / 24);
  return `${days} ${plural(days, "день", "дні", "днів")}`;
}

export function nextItem(filter) {
  const today = todayStr();
  const items = store.dayItems(today);
  const now = nowMinutes();
  let exerciseFallback = null;
  for (const item of items) {
    if (filter && !filter(item)) continue;
    const st = itemStatus(item, today, now);
    if (st === "live" || st === "soon" || st === "upcoming") {
      // Зарядку можна зробити будь-коли, тож вона не має затуляти реальну найближчу подію:
      // показуємо її лише тоді, коли вона триває «зараз», або коли більше нічого немає.
      if (item.source === "exercise") {
        if (st === "live") return { item, status: st, date: today };
        if (!exerciseFallback) exerciseFallback = { item, status: st, date: today };
        continue;
      }
      return { item, status: st, date: today };
    }
  }
  if (exerciseFallback) return exerciseFallback;
  const tomorrow = addDaysStr(today, 1);
  const tItems = store.dayItems(tomorrow).filter((i) => (!filter || filter(i)) && i.source !== "exercise");
  if (tItems.length) return { item: tItems[0], status: "tomorrow", date: tomorrow };
  return null;
}

export function countdownText(item, dateStr) {
  if (!item.start) return "";
  const delta = diffDays(todayStr(), dateStr);
  const now = nowMinutes();
  const s = minOf(item.start);
  const minutes = delta * 1440 + s - now;
  if (minutes <= 0) return "зараз";
  if (delta === 0) return `через ${humanDuration(minutes)}`;
  return `${relDayWord(delta)}, у ${item.start}`;
}

export function dayHasContent(dateStr) {
  return store.dayItems(dateStr).length > 0;
}
