export const PUBLIC_SOUNDTRACK_STYLE_IDS = Object.freeze([
  'synth',
  'metal',
  'chiptune',
  'rock',
  'electronic',
  'ambient',
  'fusion',
  'other',
  'ukrainian',
  'fpv',
]);

export const DEFAULT_PUBLIC_SOUNDTRACK_STYLE_IDS = Object.freeze(
  PUBLIC_SOUNDTRACK_STYLE_IDS.filter((style) => !['ukrainian', 'fpv'].includes(style)),
);

const match = (tags, expression) => tags.some((tag) => expression.test(tag));

export function publicSoundtrackStyles(tags = []) {
  const normalized = tags.map((tag) => String(tag).trim().toLocaleLowerCase()).filter(Boolean);
  const styles = [];
  const add = (id, condition) => {
    if (condition) styles.push(id);
  };
  add(
    'synth',
    match(normalized, /(?:^|[-\s])(synth(?:90s|wave|pop)?|retrowave|outrun|dreamwave)(?:$|[-\s])/),
  );
  add('metal', match(normalized, /(?:^|[-\s])metal(?:$|[-\s])/));
  add(
    'electronic',
    match(
      normalized,
      /(?:^|[-\s])(electronic|electro|edm|techno|house|trance|dance|breakbeat)(?:$|[-\s])/,
    ),
  );
  add('chiptune', match(normalized, /(?:^|[-\s])(chiptune|8-bit|fakebit|tracker|fm)(?:$|[-\s])/));
  add('rock', match(normalized, /(?:^|[-\s])(rock|punk)(?:$|[-\s])/));
  add(
    'ambient',
    match(normalized, /(?:^|[-\s])(ambient|atmospheric|atmosphere|chill|chillout)(?:$|[-\s])/),
  );
  add(
    'ukrainian',
    normalized.some((tag) => tag === 'ua' || /ukrain/.test(tag)),
  );
  add('fpv', normalized.includes('фпв'));
  const musicalFamilies = styles.filter((id) => !['ukrainian', 'fpv'].includes(id));
  add('fusion', normalized.includes('fusion') || musicalFamilies.length > 1);
  if (!styles.length) styles.push('other');
  return [...new Set(styles)];
}

export function matchesPublicSoundtrackStyle(track, style) {
  return publicSoundtrackStyles(track?.tags).includes(style);
}

export function localGenresForPublicStyles(styles) {
  const selected = new Set(styles);
  return [
    selected.has('synth') && 'synth90s',
    selected.has('metal') && 'metal',
    selected.has('electronic') && 'electronic',
    selected.has('chiptune') && 'chiptune',
    selected.has('rock') && 'rock',
    selected.has('ambient') && 'ambient',
    selected.has('ukrainian') && 'ukrainian',
    selected.has('other') && 'cinematic',
    selected.has('other') && 'acoustic',
  ].filter(Boolean);
}

export function publicSoundtrackStylesForLocalGenres(genres = []) {
  const selected = new Set(genres);
  if (
    [
      'synth90s',
      'metal',
      'electronic',
      'chiptune',
      'rock',
      'ambient',
      'cinematic',
      'acoustic',
      'ukrainian',
    ].every((genre) => selected.has(genre))
  )
    return [...PUBLIC_SOUNDTRACK_STYLE_IDS];
  return PUBLIC_SOUNDTRACK_STYLE_IDS.filter((style) => {
    if (style === 'synth') return selected.has('synth90s');
    if (style === 'other') return selected.has('cinematic') || selected.has('acoustic');
    return selected.has(style);
  });
}
