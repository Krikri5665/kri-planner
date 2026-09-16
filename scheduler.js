import { toast } from "./ui.js";
import { store } from "./store.js";
import { todayStr, addDaysStr, minOf, nowMinutes } from "./util.js";

const KEY = "kri.planner.notified.v1";
let timer = null;

function loadNotified() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function saveNotified(obj) {
  const keys = Object.keys(obj);
  if (keys.length > 120) {
    const sorted = keys.sort();
    const trimmed = {};
    for (const k of sorted.slice(-80)) trimmed[k] = obj[k];
    obj = trimmed;
  }
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
}

export function startScheduler(ctx) {
  stopScheduler();
  const tick = () => {
    try { check(ctx); } catch (e) { console.warn("scheduler", e); }
  };
  tick();
  timer = setInterval(tick, 25000);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

function check(ctx) {
  if (!store.user) return;
  const notified = loadNotified();
  const today = todayStr();
  const now = nowMinutes();
  let dirty = false;

  const r = store.data.settings.reminders;
  if (r.events) {
    const mins = Number(r.eventsMinutes) || 5;
    for (const item of store.dayItems(today)) {
      if (!item.start || item.source === "exercise" || item.source === "trip") continue;
      const s = minOf(item.start);
      if (s == null) continue;
      const diff = s - now;
      if (diff <= 0 || diff > mins) continue;
      const key = `ev.${item.id}.${today}`;
      if (notified[key]) continue;
      notified[key] = Date.now();
      dirty = true;
      toast(`${item.title} — о ${item.start}`, {
        icon: "bell",
        duration: 10000,
        actionLabel: "Показати",
        onAction: () => ctx.navigate("calendar", "day"),
      });
    }
  }

  const hwKey = "hw." + today;
  if (r.homework && now >= (minOf(r.homeworkTime || "18:00") ?? 1080) && !notified[hwKey]) {
    const pending = store.data.tasks.filter((t) => !t.done && (t.due === today || t.due === addDaysStr(today, 1)));
    if (pending.length) {
      notified[hwKey] = Date.now();
      dirty = true;
      toast(`Залишилось ${pending.length} незавершених завдань`, {
        icon: "clipboard",
        duration: 10000,
        actionLabel: "Відкрити",
        onAction: () => ctx.navigate("diary", "tasks"),
      });
    }
  }

  if (dirty) saveNotified(notified);
}
