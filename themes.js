export const PALETTES = [
  {
    id: "teal",
    name: "Болотно-бірюзовий",
    hint: "За замовчуванням",
    light: { c1: "#0b6b60", c2: "#0d9488", c3: "#2dd4bf", accent: "#0d9488", ink: "#ffffff", soft: "rgba(13,148,136,0.10)", ring: "rgba(13,148,136,0.30)", glow: "rgba(13,148,136,0.35)" },
    dark: { c1: "#0a4a44", c2: "#0d6b61", c3: "#128a7c", accent: "#2dd4bf", ink: "#ffffff", soft: "rgba(45,212,191,0.14)", ring: "rgba(45,212,191,0.34)", glow: "rgba(45,212,191,0.30)" },
  },
  {
    id: "violet",
    name: "Фіолетово-синій",
    hint: "Спокій і глибина",
    light: { c1: "#4c1d95", c2: "#6d28d9", c3: "#8b5cf6", accent: "#6d28d9", ink: "#ffffff", soft: "rgba(109,40,217,0.10)", ring: "rgba(109,40,217,0.30)", glow: "rgba(109,40,217,0.35)" },
    dark: { c1: "#3a1a6e", c2: "#56239c", c3: "#7c3aed", accent: "#a78bfa", ink: "#ffffff", soft: "rgba(167,139,250,0.15)", ring: "rgba(167,139,250,0.34)", glow: "rgba(167,139,250,0.30)" },
  },
  {
    id: "ember",
    name: "Червоно-помаранчевий",
    hint: "Енергія",
    light: { c1: "#b91c1c", c2: "#dc2626", c3: "#fb923c", accent: "#dc2626", ink: "#ffffff", soft: "rgba(220,38,38,0.10)", ring: "rgba(220,38,38,0.28)", glow: "rgba(220,38,38,0.32)" },
    dark: { c1: "#7a1c0c", c2: "#a53c09", c3: "#c2530f", accent: "#fb923c", ink: "#ffffff", soft: "rgba(251,146,60,0.15)", ring: "rgba(251,146,60,0.34)", glow: "rgba(251,146,60,0.30)" },
  },
  {
    id: "sunset",
    name: "Жовто-рожевий",
    hint: "Тепло і м'якість",
    light: { c1: "#d97706", c2: "#db2777", c3: "#f9a8d4", accent: "#db2777", ink: "#ffffff", soft: "rgba(219,39,119,0.10)", ring: "rgba(219,39,119,0.28)", glow: "rgba(219,39,119,0.32)" },
    dark: { c1: "#841744", c2: "#ab1f57", c3: "#c43573", accent: "#f472b6", ink: "#ffffff", soft: "rgba(244,114,182,0.15)", ring: "rgba(244,114,182,0.34)", glow: "rgba(244,114,182,0.30)" },
  },
];

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

export function applyTheme(themeId, mode) {
  const palette = getPalette(themeId);
  const c = palette[mode === "dark" ? "dark" : "light"];
  const root = document.documentElement;
  root.setAttribute("data-mode", mode === "dark" ? "dark" : "light");
  root.setAttribute("data-theme", palette.id);
  root.style.setProperty("--c1", c.c1);
  root.style.setProperty("--c2", c.c2);
  root.style.setProperty("--c3", c.c3);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--accent-ink", c.ink);
  root.style.setProperty("--accent-soft", c.soft);
  root.style.setProperty("--accent-ring", c.ring);
  root.style.setProperty("--accent-glow", c.glow);
  root.style.setProperty("--grad", `linear-gradient(135deg, ${c.c1}, ${c.c2} 52%, ${c.c3})`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#070d0c" : c.c2);
}
