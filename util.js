export const MONTHS_GEN = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];
export const MONTHS_NOM = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];
export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
export const WEEKDAYS_LONG = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
export const MONTHS_SHORT = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

export const pad = (n) => String(n).padStart(2, "0");

export function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function strToDate(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function todayStr() {
  return dateToStr(new Date());
}

export function addDaysStr(s, n) {
  const d = strToDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

export function weekdayIdx(date) {
  const d = typeof date === "string" ? strToDate(date) : date;
  return (d.getDay() + 6) % 7;
}

export function toISODow(date) {
  return weekdayIdx(date) + 1;
}

export function startOfWeekStr(s) {
  const idx = weekdayIdx(s);
  return addDaysStr(s, -idx);
}

export function diffDays(a, b) {
  return Math.round((strToDate(b) - strToDate(a)) / 86400000);
}

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function minOf(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function minutesToTime(m) {
  const mm = Math.max(0, Math.min(24 * 60, Math.round(m)));
  return `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`;
}

export function fmtDateLong(s) {
  const d = strToDate(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateMedium(s) {
  const d = strToDate(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function fmtDateShort(s) {
  const d = strToDate(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function fmtWeekRange(startStr) {
  const a = strToDate(startStr);
  const b = strToDate(addDaysStr(startStr, 6));
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[a.getMonth()]}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
  }
  return `${fmtDateShort(startStr)} ${a.getFullYear()} – ${fmtDateShort(addDaysStr(startStr, 6))} ${b.getFullYear()}`;
}

export function fmtDayHeader(s) {
  const d = strToDate(s);
  return `${WEEKDAYS_LONG[weekdayIdx(s)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function relativeDayLabel(s) {
  const delta = diffDays(todayStr(), s);
  if (delta === 0) return "Сьогодні";
  if (delta === 1) return "Завтра";
  if (delta === 2) return "Післязавтра";
  if (delta === -1) return "Вчора";
  return null;
}

export function relDayWord(delta) {
  if (delta === 0) return "сьогодні";
  if (delta === 1) return "завтра";
  if (delta === 2) return "післязавтра";
  return `через ${delta} дн.`;
}

export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function weekdayShortOf(s) {
  return WEEKDAYS_SHORT[weekdayIdx(s)];
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function roomLabel(room) {
  const r = String(room == null ? "" : room).trim();
  if (!r) return "";
  return /^\d/.test(r) ? `каб. ${r}` : r;
}

export function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeUrl(url) {
  if (!url) return "";
  const t = String(url).trim();
  if (!t) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return "https://" + t;
}

export function prettyUrl(url) {
  return String(url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function occurrencesOfRepeatPattern(ev, dateStr) {
  const d = strToDate(dateStr);
  if (!ev || !ev.date) return false;
  const start = ev.date;
  if (dateStr < start) return false;
  const until = ev.until || null;
  if (until && dateStr > until) return false;

  const kind = ev.kind || "once";
  if (kind === "once") return dateStr === start;

  const sd = strToDate(start);
  if (kind === "yearly") {
    return d.getMonth() === sd.getMonth() && d.getDate() === sd.getDate();
  }
  if (kind === "daily") {
    const iv = Math.max(1, Number(ev.interval || 1));
    return diffDays(start, dateStr) % iv === 0;
  }
  if (kind === "weekly") {
    const iv = Math.max(1, Number(ev.interval || 1));
    const days = ev.days && ev.days.length ? ev.days : [toISODow(sd)];
    if (!days.includes(toISODow(d))) return false;
    const weeks = Math.floor(diffDays(startOfWeekStr(start), startOfWeekStr(dateStr)) / 7);
    return weeks % iv === 0;
  }
  if (kind === "monthly") {
    const iv = Math.max(1, Number(ev.interval || 1));
    const months = (d.getFullYear() - sd.getFullYear()) * 12 + (d.getMonth() - sd.getMonth());
    if (months % iv !== 0) return false;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const want = Math.min(sd.getDate(), lastDay);
    return d.getDate() === want;
  }
  if (kind === "everyN") {
    const iv = Math.max(1, Number(ev.interval || 1));
    const unit = ev.unit || "day";
    if (unit === "day") return diffDays(start, dateStr) % iv === 0;
    if (unit === "week") {
      const weeks = Math.floor(diffDays(startOfWeekStr(start), startOfWeekStr(dateStr)) / 7);
      return weeks % iv === 0 && toISODow(d) === toISODow(sd);
    }
    if (unit === "month") {
      const months = (d.getFullYear() - sd.getFullYear()) * 12 + (d.getMonth() - sd.getMonth());
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const want = Math.min(sd.getDate(), lastDay);
      return months % iv === 0 && d.getDate() === want;
    }
  }
  return false;
}

/* ---------- подорожі ---------- */

export function tripCovers(trip, dateStr) {
  if (!trip || !trip.from || !trip.to) return false;
  return dateStr >= trip.from && dateStr <= trip.to;
}

export function tripDuration(trip) {
  return Math.max(1, diffDays(trip.from, trip.to) + 1);
}

export function tripDayIndex(trip, dateStr) {
  return diffDays(trip.from, dateStr) + 1;
}

export function tripRangeLabel(trip) {
  if (!trip || !trip.from || !trip.to) return "";
  if (trip.from === trip.to) return fmtDateMedium(trip.from);
  return `${fmtDateMedium(trip.from)} — ${fmtDateMedium(trip.to)}`;
}

export function tripReminder(trip, dateStr) {
  if (!trip || !trip.from || !trip.to) return null;
  const from = trip.from;
  const to = trip.to;
  const first = addDaysStr(from, -1);
  if (dateStr < first || dateStr > to) return null;

  if (dateStr === from) {
    const oneDay = from === to;
    return {
      kind: "start",
      title: oneDay ? "Сьогодні подорож" : "Сьогодні у вас подорож",
      note: oneDay ? "" : `Повернення ${fmtDateMedium(to)}`,
    };
  }
  if (dateStr === to) {
    return {
      kind: "end",
      title: "Сьогодні повернення",
      note: from === to ? "" : `${fmtDateMedium(from)} — ${fmtDateMedium(to)}`,
    };
  }
  if (dateStr === first) {
    return {
      kind: "before",
      title: "Завтра подорож",
      note: `Виїзд ${fmtDateMedium(from)}`,
    };
  }
  if (dateStr > from && dateStr < to) {
    const tomorrowIsEnd = dateStr === addDaysStr(to, -1);
    return {
      kind: "during",
      title: "Подорож триває",
      note: tomorrowIsEnd ? "Завтра повернення" : `Повернення ${fmtDateMedium(to)}`,
    };
  }
  return null;
}

export function repeatLabel(ev) {
  const kind = ev.kind || "once";
  if (kind === "once") return "Одноразова";
  if (kind === "yearly") return "Щороку";
  if (kind === "daily") return Number(ev.interval || 1) === 1 ? "Щодня" : `Кожні ${ev.interval} дн.`;
  if (kind === "weekly") {
    const iv = Number(ev.interval || 1);
    const names = (ev.days || []).map((i) => WEEKDAYS_SHORT[i - 1]).join(", ");
    const base = iv === 1 ? "Щотижня" : `Кожні ${iv} тиж.`;
    return names ? `${base} · ${names}` : base;
  }
  if (kind === "monthly") {
    const iv = Number(ev.interval || 1);
    return iv === 1 ? "Щомісяця" : `Кожні ${iv} міс.`;
  }
  if (kind === "everyN") {
    const iv = Number(ev.interval || 1);
    const u = ev.unit === "week" ? "тиж." : ev.unit === "month" ? "міс." : "дн.";
    return `Кожні ${iv} ${u}`;
  }
  return "";
}
