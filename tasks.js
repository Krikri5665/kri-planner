import { h, append, clear, btn, toast, confirmDialog } from "../ui.js";
import { iconMarkup } from "../icons.js";
import { store } from "../store.js";
import { todayStr, addDaysStr, diffDays, fmtDateLong, fmtDateShort, relativeDayLabel, dateToStr, WEEKDAYS_LONG, weekdayIdx, normalizeUrl, prettyUrl, plural } from "../util.js";

export function renderTasks(ctx) {
  const page = h("div", { class: "page page-tasks" });

  function build() {
    clear(page);
    const today = todayStr();
    const tomorrow = addDaysStr(today, 1);
    const after = addDaysStr(today, 2);

    const titleEl = h("h1", { class: "page-title" }, "Завдання");
    append(page, [
      h("div", { class: "page-head" },
        h("div", { class: "page-kicker" }, "Щоденник · план"),
        titleEl,
        h("div", { class: "page-sub" }, `${WEEKDAYS_LONG[weekdayIdx(today)]}, ${fmtDateLong(today)}`),
      ),
    ]);

    const nowTasks = store.tasksFor(today);
    const tTasks = store.tasksFor(tomorrow);
    const aTasks = store.tasksFor(after);
    const tLessons = store.dayItems(tomorrow).filter((i) => i.source === "lesson");

    if (!nowTasks.length && !tTasks.length && !aTasks.length) {
      const box = h("div", { class: "empty-state" },
        h("span", { class: "ico", html: iconMarkup("clipboard") }),
        h("h4", {}, "На найближчі дні пусто"),
        h("p", {}, "Загляньте в «Редагування», щоб додати заняття в розклад і нові завдання."),
        btn("Перейти в редагування", { icon: "plus", onClick: () => ctx.navigate("diary", "edit") }),
      );
      page.appendChild(box);
      if (tLessons.length) page.appendChild(lessonsCard(tTomorrowLessonsLabel(), tLessons));
      const doneEarly = doneSection();
      if (doneEarly) page.appendChild(doneEarly);
      maybeAnimateTitle();
      return;
    }

    page.appendChild(sectionLabel("На сьогодні", fmtDateLong(today), nowTasks.length));
    if (nowTasks.length) {
      for (const task of nowTasks) page.appendChild(taskCard(task, today));
    } else {
      page.appendChild(h("div", { class: "faint", style: "font-size:13.5px;padding:2px 4px 6px" }, "На сьогодні завдань немає."));
    }

    page.appendChild(sectionLabel("На завтра", fmtDateLong(tomorrow), tTasks.length));
    if (tLessons.length) page.appendChild(lessonsCard("Розклад на завтра", tLessons));
    if (tTasks.length) {
      for (const task of tTasks) page.appendChild(taskCard(task, tomorrow));
    } else {
      page.appendChild(h("div", { class: "faint", style: "font-size:13.5px;padding:2px 4px 6px" }, "Завдань на завтра немає."));
    }

    page.appendChild(sectionLabel("На післязавтра", fmtDateLong(after), aTasks.length));
    if (aTasks.length) {
      for (const task of aTasks) page.appendChild(taskCard(task, after));
    } else {
      page.appendChild(h("div", { class: "faint", style: "font-size:13.5px;padding:2px 4px 6px" }, "На післязавтра завдань ще немає."));
    }

    const doneBox = doneSection();
    if (doneBox) page.appendChild(doneBox);

    maybeAnimateTitle();
  }

  function doneSection() {
    const done = store.data.tasks
      .filter((t) => t.done)
      .sort((a, b) => String(b.due).localeCompare(String(a.due)) || (b.doneAt || 0) - (a.doneAt || 0));
    if (!done.length || !store.data.settings.diary.showDone) return null;
    const listBox = h("div", { hidden: true });
    for (const task of done) listBox.appendChild(taskCard(task, task.due, true));

    const toggle = h("button", { class: "ds-toggle", type: "button", title: "Показати виконані" },
      h("span", { class: "ico", html: iconMarkup("check"), style: "width:18px;height:18px;color:var(--accent)" }),
      "Виконані",
      h("span", { class: "pill" }, String(done.length)),
      h("span", { class: "ico ds-caret", html: iconMarkup("chevronDown"), style: "width:17px;height:17px" }),
    );
    toggle.addEventListener("click", () => {
      listBox.hidden = !listBox.hidden;
      toggle.classList.toggle("is-open", !listBox.hidden);
    });

    const clearBtn = h("button", {
      class: "icon-btn ds-clear", type: "button", title: "Очистити виконані", html: iconMarkup("trash"),
      onclick: clearDone,
    });

    return h("div", {},
      h("div", { class: "day-section-title ds-done-head" }, toggle, clearBtn),
      listBox,
    );
  }

  async function clearDone() {
    const allDone = store.data.tasks.filter((t) => t.done);
    if (!allDone.length) return;
    const word = plural(allDone.length, "виконане завдання", "виконані завдання", "виконаних завдань");
    const ok = await confirmDialog({
      title: "Очистити виконані?",
      message: `Видалити ${allDone.length} ${word}? Скасувати це не вийде.`,
      confirmText: "Очистити",
      danger: true,
    });
    if (!ok) return;
    const removed = store.clearDoneTasks();
    toast(`Прибрано: ${removed}`, { icon: "check", duration: 2400 });
  }

  function tTomorrowLessonsLabel() {
    return "Розклад на завтра";
  }

  function maybeAnimateTitle() {
    if (ctx.consumeTitleAnim) ctx.consumeTitleAnim();
  }

  function sectionLabel(label, dateText, count) {
    return h("div", { class: "day-section-title" },
      label,
      h("span", { class: "faint", style: "font-size:12.5px;font-weight:600" }, dateText),
      count ? h("span", { class: "pill" }, `${count} ${plural(count, "завдання", "завдання", "завдань")}`) : null,
    );
  }

  function lessonsCard(label, lessons) {
    return h("div", { class: "card", style: "margin-bottom:14px;padding:13px 14px" },
      h("div", { class: "faint", style: "font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px" }, label),
      h("div", { class: "chip-row" }, lessons.map((l) => h("span", { class: "chip", style: "cursor:default" },
        l.start ? h("span", { style: "color:var(--accent);font-variant-numeric:tabular-nums" }, l.start) : null,
        l.title,
      ))),
    );
  }

  function doneWhenLabel(task) {
    const day = task.doneAt ? dateToStr(new Date(task.doneAt)) : task.due;
    if (!day) return "";
    const delta = diffDays(todayStr(), day);
    if (delta > 0) return fmtDateShort(day);
    return relativeDayLabel(day) || fmtDateShort(day);
  }

  function taskCard(task, dateStr, isDone) {
    const card = h("div", { class: `task${task.done ? " is-done" : ""}` });
    const check = h("button", {
      class: `check-btn${task.done ? " is-done" : ""}`,
      title: task.done ? "Повернути в роботу" : "Позначити виконаним",
      html: iconMarkup("check"),
    });
    check.addEventListener("click", () => {
      if (!task.done) {
        card.classList.add("is-removing");
        setTimeout(() => { store.toggleTask(task.id); toast("Виконано! Так тримати", { icon: "check", duration: 2400 }); }, 320);
      } else {
        store.toggleTask(task.id);
      }
    });

    append(card, [
      h("div", { class: "task-main" },
        task.subject ? h("div", { class: "task-subject" }, h("span", { class: "ico", html: iconMarkup("book"), style: "width:13px;height:13px" }), task.subject) : null,
        h("div", { class: "task-title" }, task.title),
        task.desc ? h("div", { class: "task-desc" }, task.desc) : null,
        isDone ? h("div", { class: "task-when" }, "Виконано · " + doneWhenLabel(task)) : null,
        h("div", { class: "task-foot" },
          task.link ? h("a", { class: "task-link", href: normalizeUrl(task.link), target: "_blank", rel: "noopener noreferrer" },
            h("span", { class: "ico", html: iconMarkup("link") }), prettyUrl(task.link)) : null,
          h("button", { class: "icon-btn", style: "width:30px;height:30px", title: "Редагувати", html: iconMarkup("edit"), onclick: () => ctx.openTaskForm(task) }),
          h("button", {
            class: "icon-btn", style: "width:30px;height:30px", title: "Видалити", html: iconMarkup("trash"),
            onclick: async () => {
              if (await confirmDialog({ title: "Видалити завдання?", message: `«${task.title}»`, confirmText: "Видалити", danger: true })) store.removeTask(task.id);
            },
          }),
        ),
      ),
      check,
    ]);
    return card;
  }

  build();
  return { el: page, update: build };
}
