import { h, append, clear, openSheet, btn, field, textInput, textarea, selectInput, toast, confirmDialog } from "./ui.js";
import { iconMarkup } from "./icons.js";
import { store } from "./store.js";
import { todayStr, WEEKDAYS_SHORT, WEEKDAYS_LONG, normalizeUrl, fmtDateLong, fmtDateMedium, minOf, minutesToTime, roomLabel, diffDays, plural } from "./util.js";

const REPEAT_MODES = [
  { value: "once", label: "Одноразова" },
  { value: "daily", label: "Щодня" },
  { value: "weekly", label: "Щотижня" },
  { value: "monthly", label: "Щомісяця" },
  { value: "yearly", label: "Щороку" },
  { value: "everyN", label: "Кожні N" },
];

function kindToMode(kind) {
  if (kind === "once" || !kind) return "once";
  if (kind === "daily" || kind === "weekly" || kind === "monthly" || kind === "yearly") return kind;
  return "everyN";
}

export function openEventForm(ctx, existing, presetMode, preset) {
  const isEdit = !!existing;
  const ev = existing || {};
  const seed = preset || {};
  let mode = isEdit ? kindToMode(ev.kind) : (presetMode || "once");
  let selectedDays = (ev.days || []).slice();

  const sheet = openSheet({
    title: isEdit ? "Редагувати подію" : "Нова подія",
    subtitle: isEdit ? ev.title : (seed.date ? fmtDateLong(seed.date) : undefined),
    icon: "calendar",
    size: "lg",
  });
  const body = sheet.body;

  const titleInput = textInput({ placeholder: "Наприклад: Тренування", value: ev.title || "", maxlength: 120 });
  const dateInput = h("input", { class: "input", type: "date", value: ev.date || seed.date || todayStr() });
  const allDayToggle = h("input", { type: "checkbox", class: "switch-input" });
  let allDay = isEdit ? (!!ev.allDay || !ev.start) : false;
  allDayToggle.checked = allDay;
  const startInput = h("input", { class: "input", type: "time", value: ev.start || seed.start || "" });
  const endInput = h("input", { class: "input", type: "time", value: ev.end || seed.end || "" });
  const descInput = textarea({ placeholder: "Опис (необов'язково)", value: ev.desc || "", rows: 3, maxlength: 500 });
  const linkInput = textInput({ placeholder: "https://посилання (необов'язково)", value: ev.link || "" });
  const untilInput = h("input", { class: "input", type: "date", value: ev.until || "" });
  const intervalInput = h("input", { class: "input", type: "number", min: 1, max: 99, value: String(ev.interval || 1) });
  const unitSelect = selectInput([
    { value: "day", label: "днів" },
    { value: "week", label: "тижнів" },
    { value: "month", label: "місяців" },
  ], ev.unit || "day");

  const timeRow = h("div", { class: "input-row" }, field("Початок", startInput), field("Кінець", endInput));
  const repeatBox = h("div", {});
  const daysBox = h("div", { class: "chip-row", style: "flex-wrap:wrap" });

  function renderDays() {
    clear(daysBox);
    for (let i = 0; i < 7; i++) {
      const dow = i + 1;
      const chip = h("button", { class: `chip${selectedDays.includes(dow) ? " is-active" : ""}`, type: "button" }, WEEKDAYS_SHORT[i]);
      chip.addEventListener("click", () => {
        if (selectedDays.includes(dow)) selectedDays = selectedDays.filter((d) => d !== dow);
        else selectedDays = selectedDays.concat(dow).sort();
        renderDays();
      });
      daysBox.appendChild(chip);
    }
  }

  function renderRepeat() {
    clear(repeatBox);
    if (mode === "once") return;
    if (mode === "yearly") {
      repeatBox.appendChild(h("div", { class: "gradient-note", style: "padding:13px 15px" },
        h("div", { class: "gn-text", style: "margin:0" }, "Повторюється щороку в цей самий день — чудово для свят і днів народження.")));
      return;
    }
    if (mode === "weekly") {
      if (!selectedDays.length) {
        const dow = ((new Date(dateInput.value || todayStr()).getDay() + 6) % 7) + 1;
        selectedDays = [dow];
      }
      renderDays();
      repeatBox.appendChild(field("Дні тижня", daysBox));
      repeatBox.appendChild(field("Кожні N тижнів", intervalInput, "1 — щотижня. 2 — раз на два тижні."));
    } else if (mode === "everyN") {
      repeatBox.appendChild(h("div", { class: "input-row" },
        field("Кожні", intervalInput),
        field("Одиниця", unitSelect),
      ));
    }
    repeatBox.appendChild(field("Повторювати до (необов'язково)", untilInput));
  }

  function renderAll() {
    clear(body);
    const modeRow = h("div", { class: "chip-row", style: "margin-bottom:16px" });
    for (const m of REPEAT_MODES) {
      const chip = h("button", { class: `chip${mode === m.value ? " is-active" : ""}`, type: "button" }, m.label);
      chip.addEventListener("click", () => { mode = m.value; renderAll(); });
      modeRow.appendChild(chip);
    }

    append(body, [
      field("Назва", titleInput),
      field("Дата", dateInput),
      h("div", { class: "switch-row", style: "margin:-6px 0 8px" },
        h("span", { class: "switch-text" },
          h("span", { class: "switch-label" }, "Весь день"),
          h("span", { class: "switch-hint" }, "Без часу — буде в Календарі"),
        ),
        h("span", { class: "switch" }, allDayToggle, h("span", { class: "switch-knob" })),
      ),
      allDay ? null : timeRow,
      field("Опис", descInput),
      field("Посилання", linkInput),
      h("div", { class: "divider" }),
      h("div", { class: "field-label", style: "margin-bottom:8px" }, "Повторення"),
      modeRow,
      repeatBox,
    ]);
    renderRepeat();
  }

  allDayToggle.addEventListener("change", () => {
    allDay = allDayToggle.checked;
    renderAll();
  });
  startInput.addEventListener("change", () => {
    if (startInput.value && !endInput.value) {
      const m = minOf(startInput.value);
      if (m != null) endInput.value = minutesToTime(m + 60);
    }
  });

  const saveBtn = btn(isEdit ? "Зберегти зміни" : "Додати подію", { block: true, size: "lg", icon: "check" });
  saveBtn.addEventListener("click", () => {
    const title = titleInput.value.trim();
    if (!title) { toast("Введіть назву події", { icon: "info", tone: "plain", duration: 2400 }); titleInput.focus(); return; }
    const date = dateInput.value || todayStr();
    const payload = {
      title,
      date,
      allDay,
      start: allDay ? "" : startInput.value,
      end: allDay ? "" : endInput.value,
      desc: descInput.value.trim(),
      link: linkInput.value.trim() ? normalizeUrl(linkInput.value) : "",
      kind: mode,
      days: mode === "weekly" ? selectedDays.slice() : [],
      interval: (mode === "weekly" || mode === "everyN") ? Math.max(1, Number(intervalInput.value) || 1) : 1,
      unit: mode === "everyN" ? unitSelect.value : "day",
      until: (mode === "once" || mode === "yearly") ? null : (untilInput.value || null),
    };
    if (isEdit) {
      store.updateEvent(ev.id, payload);
      toast("Подію оновлено", { icon: "check" });
    } else {
      store.addEvent(payload);
      toast(`Додано: «${title}»`, { icon: "check" });
    }
    sheet.close();
  });

  append(sheet.footer, [saveBtn, btn("Скасувати", { variant: "ghost", block: true, onClick: () => sheet.close() })]);
  renderAll();
  return sheet;
}

/* ---------- подорож ---------- */

export function openTripForm(ctx, existing) {
  const isEdit = !!existing;
  const t = existing || {};
  const sheet = openSheet({
    title: isEdit ? "Редагувати подорож" : "Нова подорож",
    subtitle: isEdit ? t.title : "Обери день виїзду та день повернення",
    icon: "luggage",
    size: "md",
  });

  const titleInput = textInput({ placeholder: "Куди? Наприклад: Прага", value: t.title || "", maxlength: 90 });
  const fromInput = h("input", { class: "input", type: "date", value: t.from || todayStr() });
  const toInput = h("input", { class: "input", type: "date", value: t.to || t.from || todayStr() });
  const descInput = textarea({ placeholder: "Деталі (необов'язково)", value: t.desc || "", rows: 3, maxlength: 500 });
  const linkInput = textInput({ placeholder: "https://посилання (необов'язково)", value: t.link || "" });

  const info = h("div", { class: "trip-info" });

  function renderInfo() {
    clear(info);
    const from = fromInput.value || todayStr();
    const to = toInput.value || from;
    const days = diffDays(from, to) + 1;
    const one = from === to;
    append(info, [
      h("div", { class: "trip-info-row" },
        h("span", { class: "trip-info-label" }, "Виїзд"),
        h("span", { class: "trip-info-value" }, fmtDateLong(from)),
      ),
      h("div", { class: "trip-info-row" },
        h("span", { class: "trip-info-label" }, "Повернення"),
        h("span", { class: "trip-info-value" }, fmtDateLong(to)),
      ),
      h("div", { class: "trip-info-row" },
        h("span", { class: "trip-info-label" }, "Тривалість"),
        h("span", { class: "trip-info-value" }, `${Math.max(1, days)} ${plural(Math.max(1, days), "день", "дні", "днів")}`),
      ),
      h("div", { class: "trip-info-hint" }, one
        ? "Нагадаємо за день до виїзду, а в день подорожі напишемо «Сьогодні подорож»."
        : "Нагадаємо за день до виїзду, у день виїзду, за день до повернення та в день повернення."),
    ]);
  }

  fromInput.addEventListener("change", () => {
    if (!toInput.value || toInput.value < fromInput.value) toInput.value = fromInput.value;
    renderInfo();
  });
  toInput.addEventListener("change", () => {
    if (fromInput.value && toInput.value < fromInput.value) fromInput.value = toInput.value;
    renderInfo();
  });

  append(sheet.body, [
    field("Назва", titleInput),
    h("div", { class: "input-row" }, field("Коли їду", fromInput), field("Коли повертаюсь", toInput)),
    info,
    field("Опис", descInput),
    field("Посилання", linkInput),
  ]);
  renderInfo();

  const save = btn(isEdit ? "Зберегти зміни" : "Додати подорож", { block: true, size: "lg", icon: "check" });
  save.addEventListener("click", () => {
    const title = titleInput.value.trim();
    if (!title) { toast("Введіть назву подорожі", { icon: "info", duration: 2400 }); titleInput.focus(); return; }
    const from = fromInput.value || todayStr();
    const to = toInput.value || from;
    const payload = {
      title,
      from: from <= to ? from : to,
      to: from <= to ? to : from,
      desc: descInput.value.trim(),
      link: linkInput.value.trim() ? normalizeUrl(linkInput.value) : "",
    };
    if (isEdit) {
      store.updateTrip(t.id, payload);
      toast("Подорож оновлено", { icon: "check" });
    } else {
      store.addTrip(payload);
      toast(`Додано подорож: «${title}»`, { icon: "check" });
    }
    sheet.close();
  });

  append(sheet.footer, [save, btn("Скасувати", { variant: "ghost", block: true, onClick: () => sheet.close() })]);
  setTimeout(() => titleInput.focus(), 320);
  return sheet;
}

/* ---------- тижневий розклад ---------- */

export function openTimetableEditor(ctx, startDow = 1) {
  const sheet = openSheet({ title: "Розклад занять", subtitle: "Повторюється щотижня", icon: "book", size: "lg" });
  let dow = startDow;
  const listBox = h("div", {});
  const dayChips = h("div", { class: "chip-row" });
  const formBox = h("div", {});

  function renderDayChips() {
    clear(dayChips);
    for (let i = 1; i <= 7; i++) {
      const chip = h("button", { class: `chip${i === dow ? " is-active" : ""}`, type: "button" }, WEEKDAYS_SHORT[i - 1]);
      chip.addEventListener("click", () => { dow = i; renderAll(); });
      dayChips.appendChild(chip);
    }
  }

  function renderList() {
    clear(listBox);
    const lessons = store.timetableFor(dow);
    if (!lessons.length) {
      listBox.appendChild(h("div", { class: "empty-state", style: "padding:22px 16px" },
        h("p", { style: "margin:0" }, `На ${WEEKDAYS_LONG[dow - 1].toLowerCase()} занять ще немає.`),
      ));
      return;
    }
    lessons.forEach((l, i) => {
      const row = h("div", { class: "lesson-row" },
        h("div", { class: "lesson-no" }, String(i + 1)),
        h("div", { class: "grow" },
          h("div", { style: "font-weight:700;font-size:14.5px" }, l.subject || "Заняття"),
          h("div", { class: "faint", style: "font-size:12px;margin-top:2px" },
            `${l.start || ""}${l.end ? "–" + l.end : ""}${l.room ? " · " + roomLabel(l.room) : ""}${l.teacher ? " · " + l.teacher : ""}`),
        ),
        h("button", { class: "icon-btn", title: "Редагувати", html: iconMarkup("edit") , onclick: () => openLessonForm(l) }),
        h("button", {
          class: "icon-btn", title: "Видалити", html: iconMarkup("trash"),
          onclick: async () => {
            if (await confirmDialog({ title: "Видалити заняття?", message: `${l.subject}`, confirmText: "Видалити", danger: true })) {
              store.removeLesson(dow, l.id);
              renderAll();
            }
          },
        }),
      );
      listBox.appendChild(row);
    });
  }

  function openLessonForm(existing) {
    const l = existing || {};
    const form = openSheet({ title: existing ? "Редагувати заняття" : "Нове заняття", subtitle: WEEKDAYS_LONG[dow - 1], icon: "book" });
    const start = h("input", { class: "input", type: "time", value: l.start || "" });
    const end = h("input", { class: "input", type: "time", value: l.end || "" });
    const subject = textInput({ placeholder: "Наприклад: математика, нарада, зміна", value: l.subject || "" });
    const room = textInput({ placeholder: "Місце (необов'язково)", value: l.room || "" });
    const teacher = textInput({ placeholder: "Керівник / викладач (необов'язково)", value: l.teacher || "" });
    const note = textInput({ placeholder: "Нотатка (необов'язково)", value: l.note || "" });
    const link = textInput({ placeholder: "Посилання (необов'язково)", value: l.link || "" });
    start.addEventListener("change", () => {
      if (start.value && !end.value) {
        const m = minOf(start.value);
        if (m != null) end.value = minutesToTime(m + 45);
      }
    });
    append(form.body, [
      h("div", { class: "input-row" }, field("Початок", start), field("Кінець", end)),
      field("Назва", subject),
      h("div", { class: "input-row" }, field("Місце", room), field("Керівник / викладач", teacher)),
      field("Нотатка", note),
      field("Посилання", link),
    ]);
    const save = btn(existing ? "Зберегти" : "Додати заняття", { block: true, size: "lg", icon: "check" });
    save.addEventListener("click", () => {
      if (!subject.value.trim()) { toast("Введіть назву заняття", { icon: "info", duration: 2200 }); subject.focus(); return; }
      const payload = {
        start: start.value,
        end: end.value,
        subject: subject.value.trim(),
        room: room.value.trim(),
        teacher: teacher.value.trim(),
        note: note.value.trim(),
        link: link.value.trim() ? normalizeUrl(link.value) : "",
      };
      if (existing) store.updateLesson(dow, existing.id, payload);
      else store.addLesson(dow, payload);
      form.close();
      renderAll();
    });
    append(form.footer, [save, btn("Скасувати", { variant: "ghost", block: true, onClick: () => form.close() })]);
    setTimeout(() => subject.focus(), 300);
  }

  const addBtn = btn("Додати заняття", { variant: "soft", block: true, icon: "plus" });

  function renderAll() {
    clear(formBox);
    renderDayChips();
    renderList();
    append(formBox, [
      dayChips,
      h("div", { style: "margin-top:14px" }, listBox),
      h("div", { style: "margin-top:12px" }, addBtn),
      h("div", { class: "faint", style: "font-size:12.5px;margin-top:12px;line-height:1.45" },
        "Розклад повторюється щотижня й автоматично з'являється в Графіку дня — це події з часом."),
    ]);
  }

  addBtn.addEventListener("click", () => openLessonForm(null));
  renderAll();
  append(sheet.body, [formBox]);
  append(sheet.footer, [btn("Готово", { block: true, size: "lg", onClick: () => sheet.close() })]);
  return sheet;
}

/* ---------- завдання (щоденник) ---------- */

export function openTaskForm(ctx, existing, preset) {
  const isEdit = !!existing;
  const t = existing || {};
  const subjects = store.subjects();
  const sheet = openSheet({
    title: isEdit ? "Редагувати завдання" : "Нове завдання",
    icon: "clipboard",
    size: "lg",
  });

  const subjectSelect = selectInput(
    [{ value: "", label: "— без теми —" }].concat(subjects.map((s) => ({ value: s, label: s }))),
    t.subject || (preset && preset.subject) || "",
  );
  const customSubject = textInput({ placeholder: "Або введіть свою тему", value: subjects.includes(t.subject) ? "" : (t.subject || "") });
  const titleInput = textInput({ placeholder: "Наприклад: підготувати звіт", value: t.title || "" });
  const descInput = textarea({ placeholder: "Деталі (необов'язково)", value: t.desc || "", rows: 3 });
  const dueInput = h("input", { class: "input", type: "date", value: t.due || (preset && preset.due) || todayStr() });
  const linkInput = textInput({ placeholder: "https://посилання (необов'язково)", value: t.link || "" });

  const nextLessonBox = h("div", { class: "next-lesson-box" });
  let useNextLesson = false;

  function nextLessonDate(subject) {
    if (!subject) return null;
    const lessons = store.lessonsForSubject(subject);
    if (!lessons.length) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dow = ((d.getDay() + 6) % 7) + 1;
      const forDay = lessons.filter((l) => l.dow === dow);
      if (!forDay.length) continue;
      if (i === 0 && !forDay.some((l) => (minOf(l.end || l.start) ?? 0) > nowMin)) continue;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return null;
  }

  function lessonDateLabel(dateStr) {
    const year = Number(dateStr.slice(0, 4));
    return year === new Date().getFullYear() ? fmtDateMedium(dateStr) : fmtDateLong(dateStr);
  }

  function currentSubject() {
    const custom = customSubject.value.trim();
    return custom || subjectSelect.value || "";
  }

  function renderNextLesson() {
    clear(nextLessonBox);
    const subject = currentSubject();
    if (!subject) return;
    const lessons = store.lessonsForSubject(subject);
    const next = lessons.length ? nextLessonDate(subject) : null;
    if (!next) {
      if (store.subjects().length) {
        nextLessonBox.appendChild(h("div", { class: "hint-line" },
          `У розкладі немає занять із темою «${subject}». Додайте їх у «Редагувати графік» — і тут з'явиться кнопка «Найближче заняття».`,
        ));
      }
      return;
    }
    const active = useNextLesson || dueInput.value === next;
    const btnEl = h("button", { class: `next-lesson-chip${active ? " is-active" : ""}`, type: "button" },
      h("span", { class: "nl-ico" }, h("span", { class: "ico", html: iconMarkup("calendar") })),
      h("span", { class: "nl-text" },
        h("span", { class: "nl-title" }, "Найближче заняття"),
        h("span", { class: "nl-date" }, lessonDateLabel(next)),
      ),
      h("span", { class: active ? "next-check" : "next-check is-hint", html: iconMarkup(active ? "check" : "plus") }),
    );
    btnEl.addEventListener("click", () => {
      useNextLesson = true;
      dueInput.value = next;
      renderNextLesson();
    });
    nextLessonBox.appendChild(btnEl);
  }

  subjectSelect.addEventListener("change", () => {
    customSubject.value = "";
    useNextLesson = false;
    const subj = currentSubject();
    const nxt = subj ? nextLessonDate(subj) : null;
    if (nxt && !isEdit && store.data.settings.diary.defaultNextLesson) dueInput.value = nxt;
    renderNextLesson();
  });
  customSubject.addEventListener("input", () => { useNextLesson = false; renderNextLesson(); });
  dueInput.addEventListener("input", renderNextLesson);

  append(sheet.body, [
    field("Тема", subjectSelect, subjects.length ? null : "Спочатку додайте розклад — тоді теми з'являться тут."),
    field("Своя тема", customSubject),
    field("Завдання", titleInput),
    field("Опис", descInput),
    field("На яку дату", dueInput),
    nextLessonBox,
    field("Посилання", linkInput),
  ]);
  renderNextLesson();

  const save = btn(isEdit ? "Зберегти" : "Додати завдання", { block: true, size: "lg", icon: "check" });
  save.addEventListener("click", () => {
    const title = titleInput.value.trim();
    if (!title) { toast("Введіть назву завдання", { icon: "info", duration: 2200 }); titleInput.focus(); return; }
    const payload = {
      subject: currentSubject(),
      title,
      desc: descInput.value.trim(),
      due: dueInput.value || todayStr(),
      link: linkInput.value.trim() ? normalizeUrl(linkInput.value) : "",
    };
    if (isEdit) { store.updateTask(t.id, payload); toast("Завдання оновлено", { icon: "check" }); }
    else { store.addTask(payload); toast(`Додано: «${title}»`, { icon: "check" }); }
    sheet.close();
  });
  append(sheet.footer, [save, btn("Скасувати", { variant: "ghost", block: true, onClick: () => sheet.close() })]);
  setTimeout(() => titleInput.focus(), 320);
  return sheet;
}
