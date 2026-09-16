const S = (inner, extra = "") =>
  `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;

export const ICONS = {
  calendar: S(`<rect x="3" y="4.5" width="18" height="16.5" rx="3.2"/><path d="M8 2.8v3.4M16 2.8v3.4M3 10h18"/><circle cx="8.4" cy="14.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="14.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="14.4" r="1.1" fill="currentColor" stroke="none"/>`),
  clock: S(`<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.4 2"/>`),
  sparkles: S(`<path d="M12 3l1.7 4.6L18.3 9.3l-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7z"/><path d="M18.6 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/><path d="M5 14.4l.6 1.6 1.6.6-1.6.6L5 18.8l-.6-1.6-1.6-.6 1.6-.6z"/>`),
  sliders: S(`<path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-4M20 13V3"/><path d="M1.5 15h5M9.5 8h5M17.5 17h5"/>`),
  book: S(`<path d="M4.5 19.2A2.6 2.6 0 0 1 7.1 16.6H20"/><path d="M7.1 2.8H20v18.4H7.1A2.6 2.6 0 0 1 4.5 18.6V5.4A2.6 2.6 0 0 1 7.1 2.8z"/><path d="M8.5 7.4h7"/>`),
  clipboard: S(`<path d="M15.6 3.6h2A2.4 2.4 0 0 1 20 6v14a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 20V6a2.4 2.4 0 0 1 2.4-2.4h2"/><rect x="8.4" y="1.6" width="7.2" height="4" rx="1.4"/><path d="M8.6 13.4l2.2 2.2 4.6-4.6"/>`),
  checklist: S(`<path d="M4 6.5l1.8 1.8L9 5"/><path d="M4 17.5l1.8 1.8L9 16"/><path d="M12.5 7h8M12.5 18h8"/>`),
  check: S(`<path d="M4.5 12.6l5 5 10-10.4"/>`),
  plus: S(`<path d="M12 5v14M5 12h14"/>`),
  chevronRight: S(`<path d="M9 5l7 7-7 7"/>`),
  chevronLeft: S(`<path d="M15 5l-7 7 7 7"/>`),
  chevronDown: S(`<path d="M5 9l7 7 7-7"/>`),
  chevronUp: S(`<path d="M5 15l7-7 7 7"/>`),
  close: S(`<path d="M18 6L6 18M6 6l12 12"/>`),
  link: S(`<path d="M10.2 13.4a4.6 4.6 0 0 0 6.9.5l2.8-2.8a4.6 4.6 0 0 0-6.5-6.5l-1.6 1.6"/><path d="M13.8 10.6a4.6 4.6 0 0 0-6.9-.5l-2.8 2.8a4.6 4.6 0 0 0 6.5 6.5l1.6-1.6"/>`),
  trash: S(`<path d="M3.5 6.2h17M19 6.2v14a2.2 2.2 0 0 1-2.2 2.2H7.2A2.2 2.2 0 0 1 5 20.2v-14M9 6.2V3.9A1.9 1.9 0 0 1 10.9 2h2.2A1.9 1.9 0 0 1 15 3.9v2.3"/>`),
  edit: S(`<path d="M16.8 3.1a2.5 2.5 0 1 1 3.6 3.6L7.6 19.5 2.6 21l1.5-5z"/>`),
  sun: S(`<circle cx="12" cy="12" r="4.4"/><path d="M12 1.6v2.6M12 19.8v2.6M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M1.6 12h2.6M19.8 12h2.6M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9"/>`),
  moon: S(`<path d="M20.8 13.3A9 9 0 1 1 11 3.4a7.4 7.4 0 0 0 9.8 9.9z"/>`),
  bell: S(`<path d="M18 8.4a6 6 0 1 0-12 0c0 6.6-2.6 8.4-2.6 8.4h17.2S18 15 18 8.4"/><path d="M13.7 20.6a2 2 0 0 1-3.4 0"/>`),
  trophy: S(`<path d="M8 3.5h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 4.8H5.4a1.4 1.4 0 0 0-1.4 1.4c0 2.1 1.5 3.6 4 3.8M16 4.8h2.6a1.4 1.4 0 0 1 1.4 1.4c0 2.1-1.5 3.6-4 3.8"/><path d="M12 12.7v3.6M8.6 20.5h6.8l-.7-4.2H9.3z"/>`),
  dumbbell: S(`<path d="M6.5 6.5v11M3 9v6M17.5 6.5v11M21 9v6M6.5 12h11"/>`),
  user: S(`<path d="M20 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H8.2A4.2 4.2 0 0 0 4 19.2V21"/><circle cx="12" cy="7.4" r="4.1"/>`),
  lock: S(`<rect x="3.6" y="10.4" width="16.8" height="11" rx="2.6"/><path d="M7.4 10.4V7.2a4.6 4.6 0 0 1 9.2 0v3.2"/><circle cx="12" cy="15.9" r="1.3" fill="currentColor" stroke="none"/>`),
  arrowRight: S(`<path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5"/>`),
  arrowLeft: S(`<path d="M19.5 12h-15M11 5.5L4.5 12 11 18.5"/>`),
  globe: S(`<circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4"/><path d="M12 2.8a14 14 0 0 1 3.6 9.2A14 14 0 0 1 12 21.2a14 14 0 0 1-3.6-9.2A14 14 0 0 1 12 2.8z"/>`),
  palette: S(`<path d="M12 21.4a9.4 9.4 0 1 1 9.4-9.4c0 1.9-1.2 2.9-3 2.9h-1.6a1.9 1.9 0 0 0-1 3.4 1.9 1.9 0 0 1-1.4 3.1z"/><circle cx="7.8" cy="11.6" r="1.2" fill="currentColor" stroke="none"/><circle cx="11" cy="7.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.6" cy="9.2" r="1.2" fill="currentColor" stroke="none"/>`),
  flame: S(`<path d="M12 2.8s5.4 4.2 5.4 9a5.4 5.4 0 0 1-10.8 0c0-1.6.7-3 1.7-4.2.3 1.2 1.1 2 2.1 2.2-.4-2.6.3-5.2 1.6-7z"/><path d="M12 21.2a3.1 3.1 0 0 0 3.1-3.1c0-1.7-1.6-2.9-3.1-4.6-1.5 1.7-3.1 2.9-3.1 4.6A3.1 3.1 0 0 0 12 21.2z"/>`),
  briefcase: S(`<rect x="2.8" y="7.2" width="18.4" height="13.4" rx="2.6"/><path d="M8.4 7.2V5.4a2 2 0 0 1 2-2h3.2a2 2 0 0 1 2 2v1.8M2.8 12.6h18.4"/>`),
  home: S(`<path d="M3.6 10.4L12 3.2l8.4 7.2V20a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 20z"/><path d="M9.4 21.6v-7.4h5.2v7.4"/>`),
  ruler: S(`<rect x="2.6" y="8.4" width="18.8" height="7.2" rx="1.8" transform="rotate(-45 12 12)"/><path d="M9.4 6.6l1.6 1.6M12.2 9.4l1.6 1.6M15 12.2l1.6 1.6"/>`),
  refresh: S(`<path d="M20.5 11.5a8.5 8.5 0 1 0-2.2 6"/><path d="M20.8 5.4v6.1h-6.1"/>`),
  send: S(`<path d="M21 3L10.5 13.5M21 3l-7.2 18-3.3-7.5L3 10.2z"/>`),
  stop: S(`<rect x="6.4" y="6.4" width="11.2" height="11.2" rx="2.4"/>`),
  info: S(`<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5.4"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>`),
  filter: S(`<path d="M3.4 5.4h17.2l-6.6 7.8v6.2l-4-2v-4.2z"/>`),
  eye: S(`<path d="M2 12s3.6-6.4 10-6.4S22 12 22 12s-3.6 6.4-10 6.4S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>`),
  eyeOff: S(`<path d="M4 4l16 16"/><path d="M9.6 9.7A2.8 2.8 0 0 0 12 14.8c.8 0 1.5-.3 2-.9"/><path d="M6.4 6.6C3.7 8.3 2 12 2 12s3.6 6.4 10 6.4c1.7 0 3.2-.4 4.4-1.1"/><path d="M19.5 15.4C21.2 13.8 22 12 22 12s-3.6-6.4-10-6.4c-.9 0-1.7.1-2.4.3"/>`),
  layers: S(`<path d="M12 2.6L2.6 7.6 12 12.6l9.4-5z"/><path d="M2.6 12.4L12 17.4l9.4-5M2.6 16.8L12 21.8l9.4-5"/>`),
  gift: S(`<path d="M19.6 12.4V20a1.8 1.8 0 0 1-1.8 1.8H6.2A1.8 1.8 0 0 1 4.4 20v-7.6"/><rect x="2.6" y="7.6" width="18.8" height="4.8" rx="1.4"/><path d="M12 21.8V7.6"/><path d="M12 7.6H7.9a2.4 2.4 0 0 1 0-4.8C11.1 2.8 12 7.6 12 7.6zM12 7.6h4.1a2.4 2.4 0 0 0 0-4.8C12.9 2.8 12 7.6 12 7.6z"/>`),
  frown: S(`<circle cx="12" cy="12" r="9.2"/><path d="M8.4 15.6a4.6 4.6 0 0 1 7.2 0"/><circle cx="9" cy="9.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.6" r="1.1" fill="currentColor" stroke="none"/>`),
  target: S(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>`),
  mapPin: S(`<path d="M12 21.6s7-5.9 7-11.2a7 7 0 1 0-14 0c0 5.3 7 11.2 7 11.2z"/><circle cx="12" cy="10.2" r="2.6"/>`),
  luggage: S(`<rect x="4.4" y="7.6" width="15.2" height="12.4" rx="2.4"/><path d="M9 7.6V5.2a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 5.2v2.4"/><path d="M9.4 11.4v4.8M14.6 11.4v4.8"/>`),
};

export function iconEl(name, cls = "ico") {
  const span = document.createElement("span");
  span.className = cls;
  span.innerHTML = ICONS[name] || ICONS.info;
  return span;
}

export function iconMarkup(name) {
  return ICONS[name] || ICONS.info;
}
