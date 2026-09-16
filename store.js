import {
  uid, todayStr, strToDate, weekdayIdx, toISODow, occurrencesOfRepeatPattern, addDaysStr, minOf,
  minutesToTime, roomLabel, fmtDateMedium, tripCovers, tripReminder,
} from "./util.js";

const SESSION_KEY = "kri.planner.session.v1";
const ACCOUNTS = "accounts";
const STORE = "appData";

function kv() {
  return window.root.kv;
}

export function defaultSettings() {
  return {
    theme: "teal",
    mode: "light",
    language: "uk",
    exercise: {
      enabled: true,
      time: "09:00",
      duration: 20,
      level: "beginner",
      lastDone: null,
      streak: 0,
      best: 0,
    },
    reminders: {
      events: true,
      eventsMinutes: 5,
      homework: false,
      homeworkTime: "18:00",
    },
    diary: {
      showDone: true,
      hideEmptyDays: false,
      defaultNextLesson: true,
      rollOver: false,
    },
  };
}

export function defaultData() {
  return {
    version: 1,
    createdAt: Date.now(),
    settings: defaultSettings(),
    timetable: {},
    events: [],
    trips: [],
    tasks: [],
    exerciseLog: {},
  };
}

function migrate(data) {
  const base = defaultData();
  const out = Object.assign({}, base, data || {});
  out.settings = Object.assign({}, base.settings, (data && data.settings) || {});
  out.settings.exercise = Object.assign({}, base.settings.exercise, (data && data.settings && data.settings.exercise) || {});
  out.settings.reminders = Object.assign({}, base.settings.reminders, (data && data.settings && data.settings.reminders) || {});
  out.settings.diary = Object.assign({}, base.settings.diary, (data && data.settings && data.settings.diary) || {});
  out.timetable = (data && data.timetable) || {};
  out.events = (data && data.events) || [];
  out.trips = (data && data.trips) || [];
  out.tasks = (data && data.tasks) || [];
  out.exerciseLog = (data && data.exerciseLog) || {};
  return out;
}

function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(password, saltB64, iterations = 120000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToB64(new Uint8Array(bits));
}

export const store = {
  user: null,
  data: defaultData(),
  profile: { displayName: "", avatar: "" },
  ready: false,
  _subs: new Set(),
  _saveTimer: null,

  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  },

  emit() {
    for (const fn of Array.from(this._subs)) fn();
  },

  displayName() {
    return (this.profile && this.profile.displayName) || this.user || "";
  },

  avatar() {
    return (this.profile && this.profile.avatar) || "";
  },

  async init() {
    try {
      this.user = localStorage.getItem(SESSION_KEY) || null;
      if (this.user) {
        const accounts = (await kv()[ACCOUNTS].get(this.user)) || null;
        if (!accounts) this.user = null;
        else {
          this.profile = {
            displayName: accounts.displayName || this.user,
            avatar: accounts.avatar || "",
          };
          const raw = await kv()[STORE].get(this.user);
          this.data = migrate(raw);
        }
      }
    } catch (e) {
      console.warn("store init failed", e);
      this.user = null;
      this.data = defaultData();
    }
    this.ready = true;
    this.emit();
    return this.user;
  },

  async register(username, password, displayName) {
    const name = String(username || "").trim();
    const existing = await kv()[ACCOUNTS].get(name);
    if (existing) throw new Error("Профіль із такою назвою вже існує");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = bytesToB64(salt);
    const hash = await hashPassword(password, saltB64);
    const shown = String(displayName || "").trim() || name;
    await kv()[ACCOUNTS].set(name, { salt: saltB64, hash, createdAt: Date.now(), displayName: shown, avatar: "" });
    const data = defaultData();
    data.settings = defaultSettings();
    await kv()[STORE].set(name, data);
    this.user = name;
    this.profile = { displayName: shown, avatar: "" };
    this.data = data;
    localStorage.setItem(SESSION_KEY, name);
    this.emit();
    return name;
  },

  async login(username, password) {
    const name = String(username || "").trim();
    const account = await kv()[ACCOUNTS].get(name);
    if (!account) throw new Error("Такого профілю не знайдено");
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.hash) throw new Error("Невірний пароль");
    this.user = name;
    this.profile = { displayName: account.displayName || name, avatar: account.avatar || "" };
    const raw = await kv()[STORE].get(name);
    this.data = migrate(raw);
    localStorage.setItem(SESSION_KEY, name);
    this.emit();
    return name;
  },

  /* ---------- профіль ---------- */

  async accountInfo() {
    if (!this.user) return null;
    return (await kv()[ACCOUNTS].get(this.user)) || null;
  },

  async saveProfile({ displayName, avatar }) {
    if (!this.user) throw new Error("Немає активного профілю");
    const account = (await kv()[ACCOUNTS].get(this.user)) || {};
    const next = {
      displayName: displayName != null ? String(displayName).trim() : (this.profile.displayName || this.user),
      avatar: avatar != null ? avatar : (this.profile.avatar || ""),
    };
    if (!next.displayName) next.displayName = this.user;
    await kv()[ACCOUNTS].set(this.user, Object.assign({}, account, next));
    this.profile = next;
    this.emit();
    return next;
  },

  async verifyPassword(password) {
    const account = await this.accountInfo();
    if (!account) return false;
    const hash = await hashPassword(String(password || ""), account.salt);
    return hash === account.hash;
  },

  async changePassword(current, next) {
    const pwd = String(next || "");
    if (pwd.length < 4) throw new Error("Новий пароль — мінімум 4 символи");
    if (!(await this.verifyPassword(current))) throw new Error("Поточний пароль невірний");
    const account = await this.accountInfo();
    const salt = bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPassword(pwd, salt);
    await kv()[ACCOUNTS].set(this.user, Object.assign({}, account, { salt, hash }));
  },

  async renameProfile(newName) {
    const old = this.user;
    const next = String(newName || "").trim();
    if (!old) throw new Error("Немає активного профілю");
    if (!next || next === old) return old;
    if (next.length < 2) throw new Error("Назва профілю занадто коротка");
    if (await kv()[ACCOUNTS].get(next)) throw new Error("Така назва профілю вже зайнята");
    clearTimeout(this._saveTimer);
    await kv()[STORE].set(old, this.data);
    const account = await kv()[ACCOUNTS].get(old);
    await kv()[ACCOUNTS].set(next, account);
    await kv()[STORE].set(next, this.data);
    if (!(await kv()[ACCOUNTS].get(next))) throw new Error("Не вдалося зберегти профіль");
    await kv()[ACCOUNTS].delete(old);
    await kv()[STORE].delete(old);
    this.user = next;
    localStorage.setItem(SESSION_KEY, next);
    this.emit();
    return next;
  },

  async logout() {
    this.user = null;
    this.profile = { displayName: "", avatar: "" };
    this.data = defaultData();
    localStorage.removeItem(SESSION_KEY);
    this.emit();
  },

  async listUsers() {
    try {
      const keys = await kv()[ACCOUNTS].keys();
      return keys.slice().sort((a, b) => a.localeCompare(b, "uk"));
    } catch (e) {
      return [];
    }
  },

  save() {
    if (!this.user) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const payload = this.data;
      kv()[STORE].set(this.user, payload).catch((e) => console.warn("save failed", e));
    }, 350);
  },

  commit() {
    this.save();
    this.emit();
  },

  /* ---------- timetable ---------- */

  timetableFor(dow) {
    const list = this.data.timetable[String(dow)] || [];
    return list.slice().sort((a, b) => (minOf(a.start) ?? 0) - (minOf(b.start) ?? 0));
  },

  setTimetable(dow, list) {
    this.data.timetable[String(dow)] = list;
    this.commit();
  },

  addLesson(dow, lesson) {
    const list = (this.data.timetable[String(dow)] || []).slice();
    list.push(Object.assign({ id: uid() }, lesson));
    list.sort((a, b) => (minOf(a.start) ?? 0) - (minOf(b.start) ?? 0));
    this.setTimetable(dow, list);
    return list;
  },

  updateLesson(dow, id, patch) {
    const list = (this.data.timetable[String(dow)] || []).map((l) => (l.id === id ? Object.assign({}, l, patch) : l));
    list.sort((a, b) => (minOf(a.start) ?? 0) - (minOf(b.start) ?? 0));
    this.setTimetable(dow, list);
  },

  removeLesson(dow, id) {
    this.setTimetable(dow, (this.data.timetable[String(dow)] || []).filter((l) => l.id !== id));
  },

  subjects() {
    const seen = new Set();
    for (const dow of Object.keys(this.data.timetable)) {
      for (const l of this.data.timetable[dow] || []) {
        if (l.subject) seen.add(String(l.subject).trim());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "uk"));
  },

  lessonsForSubject(subject) {
    const out = [];
    for (const dow of Object.keys(this.data.timetable)) {
      for (const l of this.data.timetable[dow] || []) {
        if (String(l.subject).trim().toLowerCase() === String(subject).trim().toLowerCase()) {
          out.push(Object.assign({ dow: Number(dow) }, l));
        }
      }
    }
    return out;
  },

  /* ---------- events ---------- */

  addEvent(ev) {
    const item = Object.assign(
      { id: uid(), kind: "once", title: "", desc: "", link: "", date: todayStr(), start: "", end: "", allDay: false, createdAt: Date.now() },
      ev,
    );
    this.data.events.push(item);
    this.commit();
    return item;
  },

  updateEvent(id, patch) {
    const i = this.data.events.findIndex((e) => e.id === id);
    if (i >= 0) this.data.events[i] = Object.assign({}, this.data.events[i], patch);
    this.commit();
  },

  removeEvent(id) {
    this.data.events = this.data.events.filter((e) => e.id !== id);
    this.commit();
  },

  /* ---------- подорожі ---------- */

  normalizeTrip(from, to) {
    let a = from;
    let b = to;
    if (!a || !b) return { from: a || b || todayStr(), to: b || a || todayStr() };
    if (b < a) { const t = a; a = b; b = t; }
    return { from: a, to: b };
  },

  addTrip(trip) {
    const range = this.normalizeTrip(trip.from, trip.to);
    const item = Object.assign(
      { id: uid(), title: "", desc: "", link: "", createdAt: Date.now() },
      trip,
      range,
    );
    this.data.trips.push(item);
    this.commit();
    return item;
  },

  updateTrip(id, patch) {
    const i = this.data.trips.findIndex((t) => t.id === id);
    if (i >= 0) {
      const next = Object.assign({}, this.data.trips[i], patch);
      const range = this.normalizeTrip(next.from, next.to);
      this.data.trips[i] = Object.assign(next, range);
    }
    this.commit();
  },

  removeTrip(id) {
    this.data.trips = this.data.trips.filter((t) => t.id !== id);
    this.commit();
  },

  tripsOn(dateStr) {
    return this.data.trips.filter((t) => tripCovers(t, dateStr));
  },

  /* ---------- tasks ---------- */

  addTask(task) {
    const item = Object.assign(
      { id: uid(), subject: "", title: "", desc: "", link: "", due: todayStr(), done: false, doneAt: null, createdAt: Date.now() },
      task,
    );
    this.data.tasks.push(item);
    this.commit();
    return item;
  },

  updateTask(id, patch) {
    const i = this.data.tasks.findIndex((t) => t.id === id);
    if (i >= 0) this.data.tasks[i] = Object.assign({}, this.data.tasks[i], patch);
    this.commit();
  },

  removeTask(id) {
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.commit();
  },

  clearDoneTasks() {
    const before = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => !t.done);
    const removed = before - this.data.tasks.length;
    if (removed) this.commit();
    return removed;
  },

  toggleTask(id) {
    const t = this.data.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    this.commit();
  },

  tasksFor(dateStr, includeDone = false) {
    return this.data.tasks
      .filter((t) => t.due === dateStr && (includeDone || !t.done))
      .sort((a, b) => String(a.subject).localeCompare(String(b.subject), "uk"));
  },

  /* ---------- settings ---------- */

  setSetting(path, value) {
    const parts = path.split(".");
    let node = this.data.settings;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
    node[parts[parts.length - 1]] = value;
    this.commit();
  },

  /* ---------- merged schedule ---------- */

  dayItems(dateStr) {
    const items = [];
    const dow = toISODow(dateStr);
    const lessons = this.timetableFor(dow);
    let lessonNo = 0;
    for (const l of lessons) {
      lessonNo++;
      items.push({
        id: "tt-" + l.id,
        source: "lesson",
        category: "timed",
        lessonNo,
        title: l.subject || "Заняття",
        desc: l.note || "",
        meta: [roomLabel(l.room), l.teacher].filter(Boolean).join(" · "),
        link: l.link || "",
        start: l.start || "",
        end: l.end || "",
        allDay: false,
        raw: l,
      });
    }
    for (const ev of this.data.events) {
      if (!occurrencesOfRepeatPattern(ev, dateStr)) continue;
      const holiday = ev.kind === "yearly";
      const allDay = !ev.start || !!ev.allDay;
      items.push({
        id: "ev-" + ev.id,
        source: "event",
        category: holiday ? "holiday" : allDay ? "allday" : "timed",
        kind: ev.kind,
        title: ev.title || "Подія",
        desc: ev.desc || "",
        meta: "",
        link: ev.link || "",
        start: allDay ? "" : (ev.start || ""),
        end: allDay ? "" : (ev.end || ""),
        allDay,
        raw: ev,
      });
    }
    for (const trip of this.data.trips) {
      const reminder = tripReminder(trip, dateStr);
      if (!reminder) continue;
      items.push({
        id: "trip-" + trip.id,
        source: "trip",
        category: "trip",
        title: trip.title || "Подорож",
        desc: trip.desc || "",
        meta: `${fmtDateMedium(trip.from)} — ${fmtDateMedium(trip.to)}`,
        link: trip.link || "",
        start: "",
        end: "",
        allDay: true,
        reminder,
        trip,
        raw: trip,
      });
    }
    const ex = this.data.settings.exercise;
    if (ex && ex.enabled && dateStr === todayStr()) {
      const s = minOf(ex.time || "09:00");
      const start = s == null ? 540 : s;
      const dur = Math.max(5, Number(ex.duration) || 20);
      items.push({
        id: "exercise-" + dateStr,
        source: "exercise",
        category: "timed",
        title: "Ранкова зарядка",
        short: "Зарядка",
        desc: "Віджимання, підтягування, присідання — три вправи поспіль.",
        meta: `${dur} хв`,
        link: "",
        start: minutesToTime(start),
        end: minutesToTime(start + dur),
        allDay: false,
        done: !!this.data.exerciseLog[dateStr],
        raw: null,
      });
    }
    items.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      const am = a.start ? minOf(a.start) : 24 * 60;
      const bm = b.start ? minOf(b.start) : 24 * 60;
      if (am !== bm) return am - bm;
      return String(a.title).localeCompare(String(b.title), "uk");
    });
    return items;
  },

  /* Події «з часом» — те, що показує Графік дня. */
  timedItems(dateStr) {
    return this.dayItems(dateStr).filter((i) => i.category === "timed" && i.start);
  },

  /* Події «на весь день»: свята, події без часу та подорожі — те, що показує Календар. */
  calendarItems(dateStr) {
    return this.dayItems(dateStr).filter((i) => i.category !== "timed");
  },

  weekItems(startStr) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysStr(startStr, i);
      out.push({ date: d, items: this.dayItems(d) });
    }
    return out;
  },

  upcomingEvents(fromDate, days = 30) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = addDaysStr(fromDate, i);
      for (const ev of this.data.events) {
        if (occurrencesOfRepeatPattern(ev, d)) out.push({ date: d, ev });
      }
    }
    return out;
  },
};

export function isSameDay(a, b) {
  return a === b;
}

export function dowName(dow) {
  return ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"][dow - 1] || "";
}

export function dowOfDate(dateStr) {
  return toISODow(dateStr);
}

export function dateOfDowInWeek(startStr, dow) {
  return addDaysStr(startStr, dow - 1);
}
