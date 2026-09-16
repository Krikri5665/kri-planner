import { h, append, clear, openSheet, btn, toast, burstConfetti, toggleRow, field } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import { todayStr, addDaysStr, minutesToTime, minOf } from "../util.js";

export const LEVELS = [
  { id: "beginner", name: "Початківець", icon: "user" },
  { id: "advanced", name: "Знаток", icon: "target" },
  { id: "athlete", name: "Спортсмен", icon: "flame" },
];

export const EXERCISES = [
  { id: "pushups", name: "Віджимання", unit: "віджимань", icon: "dumbbell", reps: { beginner: 10, advanced: 25, athlete: 45 } },
  { id: "pullups", name: "Підтягування", unit: "підтягувань", icon: "target", reps: { beginner: 5, advanced: 10, athlete: 20 } },
  { id: "squats", name: "Присідання", unit: "присідань", icon: "flame", reps: { beginner: 10, advanced: 25, athlete: 35 } },
];

export function openExercise(ctx, onFinished) {
  const sheet = openSheet({
    title: "Ранкова зарядка",
    subtitle: `${EXERCISES.length} вправи · приблизно ${store.data.settings.exercise.duration || 20} хвилин`,
    icon: "dumbbell",
    size: "lg",
  });
  let step = 0;
  const body = sheet.body;

  function level() {
    return store.data.settings.exercise.level || "beginner";
  }

  function setLevel(id) {
    store.setSetting("exercise.level", id);
    render();
  }

  function progress() {
    return h("div", { class: "ex-progress" }, EXERCISES.map((_, i) => h("span", { class: i < step ? "is-done" : "" })));
  }

  function render() {
    clear(body);
    clear(sheet.footer);
    if (step >= EXERCISES.length) return renderDone();

    const ex = EXERCISES[step];
    const lvl = level();
    const wrap = h("div", { class: "ex-wrap" });

    append(wrap, [
      progress(),
      h("div", { class: "ex-art", html: iconMarkup(ex.icon) }),
      h("div", {},
        h("div", { class: "faint", style: "font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em" }, `Вправа ${step + 1} з ${EXERCISES.length}`),
        h("div", { class: "ex-name" }, ex.name),
      ),
      h("div", {},
        h("div", { class: "ex-reps" }, String(ex.reps[lvl])),
        h("div", { class: "ex-reps-unit" }, ex.unit),
      ),
      h("div", { class: "level-list" }, LEVELS.map((L) => {
        const row = h("button", { class: `level-row${L.id === lvl ? " is-active" : ""}`, type: "button" },
          h("span", { class: "level-row-name" }, h("span", { class: "ico", html: iconMarkup(L.icon) }), L.name),
          h("span", { class: "level-row-reps" }, `${ex.reps[L.id]} ${ex.unit}`),
        );
        row.addEventListener("click", () => setLevel(L.id));
        return row;
      })),
      h("div", { class: "faint", style: "font-size:12.5px;max-width:320px" }, "Обери свій рівень — кількість повторень підлаштується автоматично."),
    ]);

    body.appendChild(wrap);
    append(sheet.footer, [
      btn(step === EXERCISES.length - 1 ? "Завершити" : "Далі", { block: true, size: "lg", icon: "arrowRight", onClick: next }),
      btn("Пропустити зарядку", { variant: "ghost", block: true, onClick: () => sheet.close() }),
    ]);
  }

  function next() {
    step++;
    render();
  }

  function renderDone() {
    const ex = store.data.settings.exercise;
    const today = todayStr();
    const yesterday = addDaysStr(today, -1);
    const prev = ex.lastDone;
    let streak = ex.streak || 0;
    if (prev !== today) {
      streak = prev === yesterday ? streak + 1 : 1;
    }
    store.data.settings.exercise = Object.assign({}, ex, {
      lastDone: today,
      streak,
      best: Math.max(streak, ex.best || 0),
    });
    if (!store.data.exerciseLog) store.data.exerciseLog = {};
    store.data.exerciseLog[today] = { level: ex.level, at: Date.now() };
    store.commit();

    const wrap = h("div", { class: "ex-wrap" },
      h("div", { class: "ex-art is-done", html: iconMarkup("trophy") }),
      h("div", { class: "ex-name" }, "На сьогодні зарядку завершено!"),
      h("div", { class: "ex-done-text" }, "Повертайтеся завтра, щоб продовжити займатися спортом. Гарного дня!"),
      h("div", { class: "streak-card", style: "width:100%" },
        h("div", { class: "streak-ico", html: iconMarkup("flame") }),
        h("div", {},
          h("div", { class: "streak-num" }, String(streak) + (streak === 1 ? " день" : streak < 5 ? " дні" : " днів")),
          h("div", { class: "streak-label" }, "серія тренувань поспіль"),
        ),
      ),
    );
    body.appendChild(wrap);
    append(sheet.footer, [
      btn("Готово", { block: true, size: "lg", icon: "check", onClick: () => { sheet.close(); toast("Чудова робота! Зарядку зараховано", { icon: "trophy", duration: 3600 }); onFinished && onFinished(); } }),
    ]);
    burstConfetti(sheet.sheet, 30);
  }

  render();
  return sheet;
}

export function exerciseSettingsBlock(ctx) {
  const box = h("div", { class: "" });
  const ex = () => store.data.settings.exercise;

  function render() {
    clear(box);
    const e = ex();
    const timeInput = h("input", { class: "input", type: "time", value: e.time || "09:00", style: "max-width:140px" });
    timeInput.addEventListener("change", () => {
      store.setSetting("exercise.time", timeInput.value || "09:00");
      toast(`Зарядка о ${timeInput.value || "09:00"}`, { icon: "bell", duration: 2400 });
    });
    append(box, [
      toggleRow("Щоранкова зарядка", !!e.enabled, (v) => { store.setSetting("exercise.enabled", v); render(); }, `Щодня о ${e.time}. Три вправи поспіль.`),
      e.enabled ? h("div", { style: "padding:4px 0 12px" },
        field("Час початку", timeInput, "Можна підлаштувати під себе"),
        h("div", { class: "faint", style: "font-size:12.5px" }, e.time + "–" + minutesToTime((minOf(e.time) ?? 540) + (e.duration || 20)) + " · тривалість " + (e.duration || 20) + " хв"),
        h("div", { style: "margin-top:12px;display:flex;gap:10px;flex-wrap:wrap" },
          btn("Почати зарядку зараз", { variant: "soft", icon: "dumbbell", onClick: () => openExercise(ctx) }),
        ),
        h("div", { style: "margin-top:14px" },
          h("div", { class: "field-label" }, "Мій рівень"),
          h("div", { class: "chip-row" }, LEVELS.map((L) => {
            const chip = h("button", { class: `chip${L.id === e.level ? " is-active" : ""}`, type: "button" },
              h("span", { class: "ico", html: iconMarkup(L.icon) }), L.name);
            chip.addEventListener("click", () => { store.setSetting("exercise.level", L.id); render(); });
            return chip;
          })),
        ),
      ) : null,
    ]);
  }

  render();
  return { el: box, update: render };
}
