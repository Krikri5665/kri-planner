import { store } from "./store.js";
import {
  todayStr, addDaysStr, fmtDateLong, weekdayIdx, WEEKDAYS_LONG,
  normalizeUrl, uid, strToDate, roomLabel, tripDuration,
} from "./util.js";

const SESSION_PREFIX =
  "Ти — KRI ШІ, розумний і доброзичливий помічник у застосунку «Календар і Щоденник». Допомагаєш користувачеві з розкладом, подіями та завданнями — навчання, робота, дім.";

const CAL_STATIC = `${SESSION_PREFIX}

ЩО ТИ ВМІЄШ:
1. Відповідати на питання про розклад і події (що сьогодні, що завтра, коли наступне заняття, чи є вільний час, скільки подій тощо).
2. Створювати нові події в календарі, коли користувач просить щось додати (наприклад: «додай тренування у четвер о 18:00», «нагадай про лікаря 20 вересня»).
3. Змінювати або видаляти події, якщо користувач просить.
4. Додавати подорожі, коли користувач називає дати виїзду та повернення.

ЯК ВЛАШТОВАНИЙ ЗАСТОСУНОК (важливо для відповідей):
- «Графік дня» показує ЛИШЕ події з часом (заняття з розкладу, тренування, зустрічі) — по годинах.
- «Календар» показує ЛИШЕ події на весь день, свята та подорожі.
- Тому якщо подію додано без часу — вона видима в Календарі, а якщо з часом — у Графіку дня.

ЖОРСТКІ ПРАВИЛА:
- Відповідай ЛИШЕ українською мовою, коротко (1–4 речення), дружньо й по суті. Без зайвих вступів.
- Спирайся ВИКЛЮЧНО на блок СТАН нижче. Ніколи не вигадуй занять, подій чи завдань, яких там немає.
- Якщо чогось немає — прямо скажи, що в розкладі цього немає.
- Час пиши у форматі 14:00, дати — словами з дужками: «завтра, 15 вересня (2026-09-15)».
- Можна використовувати простий markdown: **жирний** для назв і списки через «- ».
- Не питай зайвих підтверджень: якщо користувач просить додати подію й даних достатньо — просто додай.
- Якщо даних для дії бракує (наприклад незрозуміла дата), постав коротке уточнювальне питання і НЕ додавай блок дій.
- Ніякого NSFW-контенту.

БЛОК ДІЙ (тільки якщо треба щось змінити в календарі):
Після тексту відповіді додай РІВНО ОДИН блок такого вигляду, і більше нічого після нього:
<<<ДІЇ>>>
{"actions":[...]}
<<<КІНЕЦЬ>>>

Формати дій у масиві:
{"type":"add_event","title":"Назва","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","desc":"опис","link":"https://...","repeat":"none"}
{"type":"add_event","title":"Назва","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","repeat":"weekly","days":[1,3],"until":"YYYY-MM-DD"}
{"type":"add_event","title":"День народження","date":"YYYY-MM-DD","repeat":"yearly"}
{"type":"add_trip","title":"Прага","from":"YYYY-MM-DD","to":"YYYY-MM-DD","desc":"опис","link":"https://..."}
{"type":"delete_event","title":"Назва","date":"YYYY-MM-DD"}
{"type":"delete_trip","title":"Прага"}

Дозволені значення "repeat": "none", "daily", "weekly", "monthly", "yearly".
Обов'язкові поля: type, title, date. Решту додавай лише якщо вони відомі. Якщо змін не потрібно — блок НЕ додавай взагалі.`;

const DIARY_STATIC = `${SESSION_PREFIX}

ЗАРАЗ ТИ ПРАЦЮЄШ У РОЗДІЛІ «ЩОДЕННИК» — це завдання й доручення: навчання, робота, дім.

ЩО ТИ ВМІЄШ:
1. Відповідати на питання про завдання (що саме, на коли, з якої теми, що лишилось зробити).
2. Додавати нові завдання з тексту користувача (наприклад: «алгебра, параграф 12 на завтра» або «звіт до п'ятниці»).
3. Позначати завдання виконаними або видаляти їх.

ЖОРСТКІ ПРАВИЛА:
- Відповідай ЛИШЕ українською мовою, коротко (1–4 речення), дружньо й по суті. Без зайвих вступів.
- Спирайся ВИКЛЮЧНО на блок СТАН нижче. Ніколи не вигадуй завдань, яких там немає.
- Час пиши у форматі 14:00, дати — «завтра, 15 вересня (2026-09-15)».
- Можна використовувати простий markdown: **жирний** для назв і списки через «- ».
- Якщо тема схожа на одну з тем розкладу — використай саме її назву.
- Якщо незрозуміло, на яку дату завдання, постав коротке уточнення і НЕ додавай блок дій.
- Ніякого NSFW-контенту.

БЛОК ДІЙ (тільки якщо треба щось змінити в щоденнику):
Після тексту відповіді додай РІВНО ОДИН блок такого вигляду, і більше нічого після нього:
<<<ДІЇ>>>
{"actions":[...]}
<<<КІНЕЦЬ>>>

Формати дій у масиві:
{"type":"add_task","subject":"Робота","title":"Звіт за квартал","desc":"до п'ятниці","due":"YYYY-MM-DD","link":"https://..."}
{"type":"complete_task","title":"Звіт за квартал","due":"YYYY-MM-DD"}
{"type":"delete_task","title":"Звіт за квартал","due":"YYYY-MM-DD"}

Обов'язкові поля: type, title. Для add_task також обов'язкове "due". Якщо змін не потрібно — блок НЕ додавай взагалі.`;

function fmtTime(t) {
  return t ? String(t).slice(0, 5) : "";
}

function timeRange(start, end) {
  if (!start) return "";
  return end ? `${fmtTime(start)}–${fmtTime(end)}` : fmtTime(start);
}

function dateBlocks(days = 14) {
  const lines = [];
  const t = todayStr();
  for (let i = 0; i < days; i++) {
    const d = addDaysStr(t, i);
    const label = i === 0 ? "сьогодні" : i === 1 ? "завтра" : i === 2 ? "післязавтра" : `через ${i} дн.`;
    lines.push(`- ${label}: ${WEEKDAYS_LONG[weekdayIdx(d)]}, ${fmtDateLong(d)} — "${d}"`);
  }
  return lines.join("\n");
}

export function buildCalendarState() {
  const t = todayStr();
  const d = new Date();
  const lines = [];
  lines.push("СТАН");
  lines.push(`Сьогодні: ${WEEKDAYS_LONG[weekdayIdx(t)]}, ${fmtDateLong(t)} ("${t}"). Зараз ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}.`);
  lines.push("");
  lines.push("Дати найближчих 14 днів (використовуй саме ці ISO-дати у полі date):");
  lines.push(dateBlocks(14));
  lines.push("");
  lines.push("Розклад занять (повторюється щотижня):");
  for (let dow = 1; dow <= 7; dow++) {
    const lessons = store.timetableFor(dow);
    if (!lessons.length) continue;
    const parts = lessons.map((l, i) => `${i + 1}) ${timeRange(l.start, l.end)} ${l.subject}${l.room ? ` (${roomLabel(l.room)})` : ""}`);
    lines.push(`- ${WEEKDAYS_LONG[dow - 1]}: ${parts.join("; ")}`);
  }
  const anyLessons = Object.keys(store.data.timetable).some((k) => (store.data.timetable[k] || []).length);
  if (!anyLessons) lines.push("- (розклад ще не заповнено)");
  lines.push("");
  const upcoming = store.upcomingEvents(t, 21);
  lines.push("Події на найближчі 21 день:");
  if (!upcoming.length) lines.push("- (подій немає)");
  for (const { date, ev } of upcoming.slice(0, 60)) {
    const when = ev.allDay ? "весь день" : timeRange(ev.start, ev.end) || "без часу";
    lines.push(`- ${fmtDateLong(date)} ("${date}") ${when} — ${ev.title}${ev.desc ? ` — ${ev.desc}` : ""}${ev.kind && ev.kind !== "once" ? ` [повтор: ${ev.kind}]` : ""}`);
  }
  lines.push("");
  lines.push("Подорожі:");
  const trips = store.data.trips.slice().sort((a, b) => String(a.from).localeCompare(String(b.from)));
  if (!trips.length) lines.push("- (подорожей немає)");
  for (const trip of trips) {
    lines.push(`- ${trip.title}: виїзд ${fmtDateLong(trip.from)} ("${trip.from}"), повернення ${fmtDateLong(trip.to)} ("${trip.to}")${trip.desc ? ` — ${trip.desc}` : ""}`);
  }
  return lines.join("\n");
}

export function buildDiaryState() {
  const t = todayStr();
  const lines = [];
  lines.push("СТАН");
  lines.push(`Сьогодні: ${WEEKDAYS_LONG[weekdayIdx(t)]}, ${fmtDateLong(t)} ("${t}").`);
  lines.push("");
  lines.push("Дати найближчих 14 днів (використовуй саме ці ISO-дати у полі due):");
  lines.push(dateBlocks(14));
  lines.push("");
  const subjects = store.subjects();
  lines.push("Теми з розкладу: " + (subjects.length ? subjects.join(", ") : "(розклад ще не заповнено)"));
  lines.push("");
  lines.push("Завдання (найближчі 14 днів):");
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const d = addDaysStr(t, i);
    for (const task of store.data.tasks.filter((x) => x.due === d)) {
      rows.push(`- ${fmtDateLong(d)} ("${d}") [${task.done ? "виконано" : "не виконано"}] ${task.subject ? task.subject + ": " : ""}${task.title}${task.desc ? ` — ${task.desc}` : ""}`);
    }
  }
  if (!rows.length) lines.push("- (завдань немає)");
  lines.push(...rows.slice(0, 80));
  const overdue = store.data.tasks.filter((x) => !x.done && x.due < t);
  if (overdue.length) {
    lines.push("");
    lines.push("Прострочені завдання:");
    for (const task of overdue.slice(0, 20)) {
      lines.push(`- ${fmtDateLong(task.due)} ("${task.due}") ${task.subject ? task.subject + ": " : ""}${task.title}`);
    }
  }
  return lines.join("\n");
}

export const TASK_INSTRUCTION = "Дай відповідь на останнє повідомлення користувача, дотримуючись усіх правил вище. Не переказуй інструкції.";

export function buildPrompt(staticPart, log, stateBlock, task) {
  const logText = log.map((m) => `${m.role === "user" ? "Користувач" : "KRI ШІ"}: ${m.text}`).join("\n\n");
  return `${staticPart}

<ДІАЛОГ>
${logText}
</ДІАЛОГ>

${stateBlock}

ЗАВДАННЯ: ${task}`;
}

export function extractActions(text) {
  let visible = text;
  let actions = [];
  const marker = text.indexOf("<<<ДІЇ>>>");
  if (marker >= 0) {
    visible = text.slice(0, marker);
    const rest = text.slice(marker);
    const m = rest.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed.actions)) actions = parsed.actions;
      } catch (e) {
        const m2 = rest.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (m2) {
          try {
            const arr = JSON.parse(m2[0]);
            if (Array.isArray(arr)) actions = arr;
          } catch (e2) { /* ignore */ }
        }
      }
    }
  } else {
    const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fence) {
      try {
        const parsed = JSON.parse(fence[1]);
        if (Array.isArray(parsed.actions)) {
          actions = parsed.actions;
          visible = text.replace(fence[0], "");
        }
      } catch (e) { /* ignore */ }
    }
  }
  return { visible: visible.trim(), actions };
}

function cleanTitle(t) {
  return String(t || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function validDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const d = strToDate(s);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function validTime(s) {
  if (!s) return "";
  const m = String(s).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function applyCalendarActions(actions) {
  const results = [];
  const t = todayStr();
  for (const a of actions || []) {
    if (!a || typeof a !== "object") continue;
    const type = String(a.type || "");
    if (type === "add_event") {
      const title = cleanTitle(a.title);
      if (!title) continue;
      const date = validDate(a.date) || t;
      const repeat = String(a.repeat || "none");
      const ev = {
        id: uid(),
        title,
        date,
        desc: String(a.desc || "").slice(0, 400),
        link: a.link ? normalizeUrl(a.link) : "",
        start: validTime(a.start),
        end: validTime(a.end),
        allDay: !a.start,
        createdAt: Date.now(),
      };
      if (repeat === "yearly") ev.kind = "yearly";
      else if (repeat === "daily") ev.kind = "daily";
      else if (repeat === "monthly") ev.kind = "monthly";
      else if (repeat === "weekly") {
        ev.kind = "weekly";
        const days = Array.isArray(a.days) ? a.days.map(Number).filter((n) => n >= 1 && n <= 7) : [];
        ev.days = days.length ? days : [weekdayIdx(date) + 1];
      } else ev.kind = "once";
      if (ev.kind !== "once" && validDate(a.until)) ev.until = a.until;
      store.data.events.push(ev);
      results.push(`Додано: «${title}» — ${fmtDateLong(date)}${ev.start ? ", " + ev.start : ""}`);
    } else if (type === "delete_event") {
      const title = cleanTitle(a.title).toLowerCase();
      const date = validDate(a.date);
      const before = store.data.events.length;
      store.data.events = store.data.events.filter((ev) => {
        const sameTitle = String(ev.title).trim().toLowerCase() === title;
        if (!sameTitle) return true;
        if (date && ev.kind === "once" && ev.date !== date) return true;
        return false;
      });
      if (store.data.events.length < before) results.push(`Видалено: «${cleanTitle(a.title)}»`);
    } else if (type === "add_trip") {
      const title = cleanTitle(a.title);
      if (!title) continue;
      const from = validDate(a.from) || validDate(a.to) || t;
      const to = validDate(a.to) || from;
      const trip = store.addTrip({
        title,
        from,
        to,
        desc: String(a.desc || "").slice(0, 400),
        link: a.link ? normalizeUrl(a.link) : "",
      });
      results.push(`Додано подорож: «${trip.title}» — ${fmtDateLong(trip.from)} → ${fmtDateLong(trip.to)} (${tripDuration(trip)} дн.)`);
    } else if (type === "delete_trip") {
      const title = cleanTitle(a.title).toLowerCase();
      const before = store.data.trips.length;
      store.data.trips = store.data.trips.filter((tr) => String(tr.title).trim().toLowerCase() !== title);
      if (store.data.trips.length < before) {
        store.commit();
        results.push(`Видалено подорож: «${cleanTitle(a.title)}»`);
      }
    }
  }
  if (results.length) store.commit();
  return results;
}

export function applyDiaryActions(actions) {
  const results = [];
  const t = todayStr();
  for (const a of actions || []) {
    if (!a || typeof a !== "object") continue;
    const type = String(a.type || "");
    const title = cleanTitle(a.title);
    if (!title) continue;
    const due = validDate(a.due);
    if (type === "add_task") {
      const task = store.addTask({
        subject: String(a.subject || "").slice(0, 60),
        title,
        desc: String(a.desc || "").slice(0, 400),
        link: a.link ? normalizeUrl(a.link) : "",
        due: due || t,
      });
      results.push(`Додано завдання: ${task.subject ? task.subject + " — " : ""}${title} (${fmtDateLong(task.due)})`);
    } else if (type === "complete_task") {
      let hit = 0;
      for (const task of store.data.tasks) {
        if (task.done) continue;
        if (String(task.title).trim().toLowerCase() !== title.toLowerCase()) continue;
        if (due && task.due !== due) continue;
        task.done = true;
        task.doneAt = Date.now();
        hit++;
      }
      if (hit) { store.commit(); results.push(`Позначено виконаним: «${title}»`); }
    } else if (type === "delete_task") {
      const before = store.data.tasks.length;
      store.data.tasks = store.data.tasks.filter((task) => {
        if (String(task.title).trim().toLowerCase() !== title.toLowerCase()) return true;
        if (due && task.due !== due) return true;
        return false;
      });
      if (store.data.tasks.length < before) { store.commit(); results.push(`Видалено: «${title}»`); }
    }
  }
  return results;
}

/* ---------- conversation ---------- */

export class ChatSession {
  constructor(kind) {
    this.kind = kind;
    this.log = (store.data.chats && store.data.chats[kind]) || [];
    this.summary = (store.data.chatSummaries && store.data.chatSummaries[kind]) || "";
    this.busy = false;
    this._compacting = false;
  }

  static load(kind) {
    if (!store.data.chats) store.data.chats = {};
    if (!store.data.chatSummaries) store.data.chatSummaries = {};
    return new ChatSession(kind);
  }

  persist() {
    if (!store.data.chats) store.data.chats = {};
    store.data.chats[this.kind] = this.log.slice(-60);
    if (!store.data.chatSummaries) store.data.chatSummaries = {};
    store.data.chatSummaries[this.kind] = this.summary;
    store.save();
  }

  clear() {
    this.log = [];
    this.summary = "";
    this.persist();
  }

  get staticPart() {
    return this.kind === "calendar" ? CAL_STATIC : DIARY_STATIC;
  }

  stateBlock() {
    return this.kind === "calendar" ? buildCalendarState() : buildDiaryState();
  }

  build(task) {
    const logPart = this.summary ? [{ role: "assistant", text: `[Стислий конспект попередньої розмови: ${this.summary}]` }, ...this.log] : this.log;
    return buildPrompt(this.staticPart, logPart, this.stateBlock(), task);
  }

  async send(userText, { onChunk } = {}) {
    const text = String(userText || "").trim();
    if (!text || this.busy) return null;
    this.busy = true;
    this.log.push({ role: "user", text });
    this.persist();

    let raw = "";
    try {
      const promise = window.root.generateText({
        instruction: this.build(TASK_INSTRUCTION),
        onChunk: (d) => {
          raw = d.fullTextSoFar || "";
          const cut = raw.indexOf("<<<ДІЇ>>>");
          const shown = cut >= 0 ? raw.slice(0, cut) : raw;
          onChunk && onChunk(shown.replace(/<<<КІНЕЦЬ>>>/g, ""));
        },
      });
      this._promise = promise;
      const result = await promise;
      raw = result.text || result.toString() || raw;
    } catch (err) {
      console.warn("AI error", err);
      this.log.pop();
      this.persist();
      this.busy = false;
      if (!raw) throw new Error("Не вдалося отримати відповідь від ШІ. Перевірте з'єднання й спробуйте ще раз.");
    } finally {
      this._promise = null;
    }

    const { visible, actions } = extractActions(raw);
    const results = this.kind === "calendar" ? applyCalendarActions(actions) : applyDiaryActions(actions);
    const reply = { role: "assistant", text: visible || "Готово.", changes: results };
    this.log.push(reply);
    this.persist();
    this.busy = false;
    this.maybeCompact();
    return reply;
  }

  stop() {
    if (this._promise && typeof this._promise.stop === "function") {
      try { this._promise.stop(); } catch (e) { /* ignore */ }
    }
  }

  async maybeCompact() {
    if (this._compacting || this.log.length <= 14) return;
    try {
      const meta = window.root.generateText({ getMetaObject: true });
      if (!meta || !meta.countTokens) return;
      const probe = this.build(TASK_INSTRUCTION);
      if (meta.countTokens(probe) < (meta.idealMaxContextTokens || 6000) * 0.8) return;
      this._compacting = true;
      const keep = 8;
      const n = this.log.length - keep;
      if (n < 4) return;
      const boundary = this.log[n - 1].text.slice(-30);
      const res = await window.root.generateText(
        this.build(`Стисло перекажи перші ${n} повідомлень діалогу (до повідомлення, яке закінчується на «${boundary}»), враховуючи наявний конспект. Тільки факти, дати, назви. Без вступів.`),
      );
      this.summary = String(res.text || "").trim().slice(0, 2000);
      this.log = this.log.slice(n);
      this.persist();
    } catch (e) {
      console.warn("compact failed", e);
    } finally {
      this._compacting = false;
    }
  }

  suggestions() {
    if (this.kind === "calendar") {
      return [
        "Що в розкладі на завтра?",
        "Скільки в мене подій цього тижня?",
        "Додай тренування у четвер о 18:00",
        "Що в мене сьогодні?",
      ];
    }
    return [
      "Що задано на завтра?",
      "Додай з алгебри параграф 12 на завтра",
      "Що в мене найближчим часом?",
      "Додай проєкт з історії до п'ятниці",
    ];
  }
}
