export async function ensureVersusEntryPackage(
  entry,
  {
    options,
    packageConsent,
    creatorOwnerFor,
    candidateJourney,
    authoredRouteId,
    shippedMaps,
    downloads,
    reader,
    isOfficialPack,
  },
) {
  if (!packageConsent) return;
  const creatorOwner = creatorOwnerFor(entry);
  if (creatorOwner) {
    await downloads.ensure('runtime:versus', options);
    options?.signal?.throwIfAborted();
    if (creatorOwnerFor(entry) !== creatorOwner)
      throw new Error('Creator mission ownership changed during package preparation.');
    return;
  }
  if (candidateJourney?.owns(entry))
    await downloads.ensureMission(
      { routeId: authoredRouteId, missionId: entry.level.id, mode: 'versus' },
      options,
    );
  else if (shippedMaps.includes(entry))
    await downloads.ensure(
      'destination:versus:' +
        (entry.sourcePackId ? 'chapter:' + entry.sourcePackId : 'classic:base'),
      options,
    );
  else {
    // The reader brands the accepted row and returns its exact installed pack.
    // A user import with a matching pack ID never acquires official ownership.
    const owner = reader.presentationOwner(entry);
    if (isOfficialPack(owner.pack)) await downloads.ensureClassic(owner.pack.id, options);
  }
}
