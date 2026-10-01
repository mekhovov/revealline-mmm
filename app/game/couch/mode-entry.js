// Native Back must work while the large mode module is still preparing or fails.
// These finite routes match authored-mode-routes.mjs; bootstrap tests cover both.
(() => {
  const doc = document,
    mode = doc.currentScript?.dataset.mode;
  const params = new URL(doc.baseURI).searchParams;
  const set = (id, href) => doc.getElementById(id)?.setAttribute('href', href);
  if (!['versus', 'team'].includes(mode)) return;
  const authoredRoutes = [
    "coupa-all",
    'opening',
    'authored',
    'whole-originals',
    'whole-originals-v2',
    'whole-originals-v3',
    'whole-originals-v4',
    'whole-spatial-v1',
    'whole-spatial-v2',
    'whole-spatial-v3',
    'whole-spatial-v4',
    'whole-spatial-v5',
    'whole-spatial-v6',
    'whole-spatial-v7',
    'whole-spatial-v8',
    'whole-spatial-v9',
    'whole-spatial-v10',
    'whole-spatial-v11',
    'whole-spatial-v12',
    'whole-spatial-v13',
    'whole-spatial-v14',
    'whole-spatial-v15',
    'whole-spatial-v16',
    'whole-spatial-v17',
    'whole-spatial-v18',
    'whole-spatial-v19',
    'whole-spatial-v20',
    'whole-spatial-v21',
    'whole-spatial-v22',
    'whole-spatial-v23',
    'whole-spatial-v24',
    'whole-spatial-v25',
    'whole-spatial-v26',
    'whole-spatial-v27',
    'whole-spatial-v28',
    'whole-spatial-v29',
    'whole-spatial-v30',
    'whole-spatial-v31',
    'whole-spatial-v32',
    'whole-spatial-v33',
    'whole-ornament-v1',
    'whole-ornament-v2',
  ];
  const teamRoutes = [
    "coupa-all",
    'team-greybox',
    'team-originals',
    'team-pressure-originals-1',
    'team-spatial-originals-1',
    'team-trail-impact-originals-1',
    'team-specialist-originals-1',
    'team-complete-specialist-originals-1',
    'team-timed-originals',
    'team-window-spatial-1',
    'team-depot-spatial-1',
  ];
  const origins = params.getAll('return');
  const teamLinks = (solo, versus) => {
    const fromSolo = origins.length === 1 && origins[0] === 'solo';
    set('coop-home', solo);
    set('coop-solo', solo);
    set('coop-versus', versus);
    set('coop-race', fromSolo ? solo : versus);
    const back = doc.getElementById('coop-race');
    if (back) back.textContent = fromSolo ? 'Back to Solo' : 'Race mode ↗';
  };
  // The ready host gives a validated authored origin priority over pack hints.
  const returns = params.getAll('journey-return');
  if (
    mode === 'team' &&
    returns.length === 1 &&
    authoredRoutes.includes(returns[0]) &&
    origins.length === 1 &&
    ['solo', 'versus'].includes(origins[0]) &&
    ![
      'journey',
      'practice',
      'return-token',
      'return-token-v2',
      'mode-return',
      'mode-return-v2',
    ].some((key) => params.has(key))
  ) {
    teamLinks(`../?journey=${returns[0]}`, `./?journey=${returns[0]}`);
    return;
  }
  const journey = params.getAll('journey');
  const legacyLaunch = journey.length
    ? mode === 'team'
      ? journey.length !== 1 || !teamRoutes.includes(journey[0])
      : !authoredRoutes.includes(journey[0])
    : [
        'pack',
        'campaign',
        'level',
        'play',
        'practice',
        'course',
        'lesson',
        'workshop',
        'return-token',
        'return-token-v2',
        'mode-return',
        'mode-return-v2',
      ].some((key) => params.has(key));
  if (legacyLaunch) {
    if (mode === 'versus') set('boot-return', '../?journey=legacy');
    if (mode === 'team') teamLinks('../?journey=legacy', './?journey=legacy');
    return;
  }
  if (mode === 'versus' && journey.length && authoredRoutes.includes(journey[0]))
    set('boot-return', `../?journey=${journey[0]}`);
})();
