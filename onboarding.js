import { h, append, btn } from "../ui.js";
import { iconMarkup } from "../icons.js";

const SLIDES = [
  {
    ico: "calendar",
    title: "Розумний календар",
    text: "Твій тиждень одним поглядом і кожен день — по годинах. Бачиш, що було, що триває зараз і що буде далі.",
  },
  {
    ico: "sparkles",
    title: "ШІ-помічник поруч",
    text: "Запитай «що в розкладі на завтра?» або просто напиши «додай тренування у четвер о 18:00» — і воно з'явиться в календарі.",
  },
  {
    ico: "clipboard",
    title: "Щоденник завдань",
    text: "Домашні завдання на завтра й післязавтра. Позначив виконане — і воно зникає зі списку. Нічого не загубиться.",
  },
  {
    ico: "dumbbell",
    title: "Ранкова зарядка",
    text: "Щоранку — нагадування й коротке тренування на 20 хвилин. Три рівні складності, для будь-якої підготовки.",
  },
  {
    ico: "palette",
    title: "Налаштуй під себе",
    text: "Обери колір і світлу чи темну тему. Усі дані зберігаються на твоєму пристрої й нікуди не зникають.",
  },
];

export function renderOnboarding({ onFinish }) {
  const wrap = h("div", { class: "onboard" });
  const slidesWrap = h("div", { class: "onboard-slides" });
  const nodes = SLIDES.map((s, i) => {
    const art = h("div", { class: "onboard-art" },
      h("div", { class: "onboard-art-ring r1" }),
      h("div", { class: "onboard-art-ring r2" }),
      h("div", { class: "onboard-art-core", html: iconMarkup(s.ico) }),
      h("div", { class: "onboard-art-dot", style: "top:14px;right:20px" }),
      h("div", { class: "onboard-art-dot", style: "bottom:26px;left:8px;width:11px;height:11px" }),
      h("div", { class: "onboard-art-dot", style: "bottom:8px;right:52px;width:8px;height:8px" }),
    );
    const slide = h("div", { class: "onboard-slide", dataset: { index: i } },
      art,
      h("h2", {}, s.title),
      h("p", {}, s.text),
    );
    slidesWrap.appendChild(slide);
    return slide;
  });

  const dots = h("div", { class: "dots" }, SLIDES.map(() => h("span", { class: "dot" })));
  const cta = h("div", { class: "onboard-cta" });
  const bottom = h("div", { class: "onboard-bottom" }, dots, cta);

  let index = 0;
  let locked = false;

  function paint(dir) {
    nodes.forEach((node, i) => {
      node.classList.remove("enter-left", "enter-right", "is-active");
      if (i === index) node.classList.add("is-active");
      else if (i < index) node.classList.add(dir >= 0 ? "enter-left" : "enter-right");
      else node.classList.add(dir >= 0 ? "enter-right" : "enter-left");
    });
    dots.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("is-active", i === index));
    append(clearEl(cta), [
      index < SLIDES.length - 1
        ? buildNext()
        : h("div", { class: "stack" },
            btn("Увійти", { icon: "lock", block: true, size: "lg", onClick: () => onFinish("login") }),
            btn("Зареєструватися", { variant: "ghost", block: true, size: "lg", onClick: () => onFinish("register") }),
          ),
    ]);
    if (index === SLIDES.length - 1) {
      append(cta, h("div", { class: "faint center", style: "font-size:12.5px;margin-top:2px" }, "Дані зберігаються лише на цьому пристрої"));
    }
  }

  function buildNext() {
    return btn("Далі", { icon: "arrowRight", block: true, size: "lg", onClick: next });
  }

  function next() {
    if (locked || index >= SLIDES.length - 1) return;
    locked = true;
    index++;
    paint(1);
    setTimeout(() => { locked = false; }, 420);
  }

  const skip = h("button", { class: "onboard-skip", onclick: () => { index = SLIDES.length - 1; paint(1); } }, "Пропустити");

  let startX = null;
  wrap.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  wrap.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 55) return;
    if (dx < 0 && index < SLIDES.length - 1) next();
    else if (dx > 0 && index > 0) { index--; paint(-1); }
  });

  append(wrap, [skip, slidesWrap, bottom]);
  paint(1);
  return wrap;
}

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}
