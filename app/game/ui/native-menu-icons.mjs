// One pixel-grid icon family. Labels remain real text owned by localization.
const paths = Object.freeze({
  more: 'M1 6h3v3H1zm5 0h3v3H6zm5 0h3v3h-3z',
  pause: 'M3 2h4v12H3zM9 2h4v12H9z',
  play: 'M4 2h2v2h2v2h2v2h2v2h-2v2H8v2H6v2H4z',
  missions: 'M1 2h4v2h2v2h2V4h2V2h4v12h-4v-2H9v-2H7v2H5v2H1zM3 4v8h2V6zm8 2v6h2V4z',
  settings: 'M6 0h4v3h3V6h3v4h-3v3h-3v3H6v-3H3v-3H0V6h3V3h3zm0 5v1H5v4h1v1h4v-1h1V6h-1V5z',
  sound: 'M1 6h3V4h2V2h2v12H6v-2H4v-2H1zm10-2h2v2h2v4h-2v2h-2v-2h2V6h-2z',
  mute: 'M1 6h3V4h2V2h2v12H6v-2H4v-2H1zm9-1h2v2h2V5h2v2h-2v2h2v2h-2V9h-2v2h-2V9h2V7h-2z',
  solo: 'M6 1h4v2h2v4h-2v2H6V7H4V3h2zM4 10h8v2h2v3H2v-3h2z',
  versus:
    'M1 1h2v2h2v2h2v2h2V5h2V3h2V1h2v4h-2v2h-2v2H9v2h2v2h2v2h-2v-2H9v-2H7v2H5v2H3v-2h2v-2h2V9H5V7H3V5H1z',
  team: 'M2 1h4v4H2zm8 0h4v4h-4zM0 7h8v5H6v3H2v-3H0zm8 0h8v5h-2v3h-4v-3H8z',
  simulator:
    'M1 1h4v2H3v2H1zm10 0h4v4h-2V3h-2zM1 11h2v2h2v2H1zm12 0h2v4h-4v-2h2zM6 5h4v1h2v4h-2v1H6v-1H4V6h2zm1 2v2h2V7z',
  overflight:
    'M1 1h4v2H3v2H1zm10 0h4v4h-2V3h-2zM1 11h2v2h2v2H1zm12 0h2v4h-4v-2h2zM4 4h2v2h4V4h2v2h-2v4h2v2h-2v-2H6v2H4v-2h2V6H4z',
  snake: 'M2 1h10v2H4v2h8v2H4v2h8v2H4v2h8v-2h3v4H2v-6h8V7H2zM12 1h3v4h-3z',
  restart: 'M2 2h2v2h8v2h2v6h-2v2H4v-2H2v-2h2v2h8V6H4v2H2V6H0V4h2z',
  skip: 'M1 2h2v2h2v2h2v2H5v2H3v2H1zm7 0h2v2h2v2h2v2h-2v2h-2v2H8zM14 2h2v12h-2z',
  random: 'M1 3h4l6 8h2V9h2v6h-6v-2h2L4 5H1zm8-2h6v6h-2V5h-2L8 9 6 7l5-4H9zM1 11h3l2-3 2 2-3 3H1z',
  home: 'M7 1h2v2h2v2h2v2h2v2h-2v6H9v-4H7v4H3V9H1V7h2V5h2V3h2z',
  next: 'M2 2h2v2h2v2h2v2H6v2H4v2H2zm9 0h3v12h-3z',
  link: 'M1 5h2V3h6v2H3v6h4v2H1zm6-2h8v8h-2v2H7v-2h6V5H9v4H5V7h2z',
  info: 'M6 1h4v3H6zm-2 5h6v7h2v2H4v-2h2V8H4z',
  controls: 'M3 3h10v2h2v8h-4v-2H5v2H1V5h2zm1 3v2H2v2h2v2h2v-2h2V8H6V6zm7 1v2h2V7z',
  display: 'M1 1h14v11H9v2h3v2H4v-2h3v-2H1zm2 2v7h10V3z',
  fullscreen: 'M1 1h6v2H3v4H1zm8 0h6v6h-2V3H9zM1 9h2v4h4v2H1zm12 0h2v6H9v-2h4z',
  accessibility: 'M6 0h4v4H6zM1 5h14v2h-5v3h2v5h-2v-4H6v4H4v-5h2V7H1z',
  collection: 'M1 1h11v2H3v10H1zm4 4h10v10H5zm2 2v6h6V7z',
  content: 'M1 3h5V1h4v2h5v12H1zm2 2v8h10V5zM7 6h2v3h2v2H5V9h2z',
  help: 'M4 1h8v2h2v4h-2v2h-2v2H6V7h4V3H6v2H2V3h2zM6 13h4v3H6z',
  back: 'M6 2h2v2H6v2H4v1h11v2H4v1h2v2h2v2H6v-2H4v-2H2V8H0V6h2V4h2V2z',
});

export function menuIconStyle(name) {
  const path = paths[name] ?? paths.help;
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="white" d="${path}"/></svg>`)}")`;
}

export function setMenuIcon(element, name) {
  if (!element) return;
  element.dataset.menuIcon = name;
  element.style.setProperty('--native-menu-icon', menuIconStyle(name));
}
