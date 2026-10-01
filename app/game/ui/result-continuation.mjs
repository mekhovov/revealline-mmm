function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Keep outcome actions specific without guessing about an unresolved catalogue
 * successor. Callers pass already-localized content names and the host's
 * authoritative campaign-boundary decision. */
export function resultContinuationLabel(
  t,
  {
    mission = '',
    campaign = '',
    crossesCampaign = false,
    browse = false,
    browseKey = 'interface:browseMissions',
  } = {},
) {
  if (browse) return t(browseKey);
  const missionName = text(mission);
  if (!missionName) return t('interface:nextMission2');
  const campaignName = text(campaign);
  return crossesCampaign && campaignName
    ? t('interface:nextCampaignNamed', { campaign: campaignName })
    : t('interface:nextMissionNamed', { mission: missionName });
}
