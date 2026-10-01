import { DISCOVERY_EXHIBIT_LAYOUTS } from '../content-design/discovery-schema.mjs';

/** A read-only arrangement of existing promises and receipts. A locked card
 * exposes its teaser only; no payload reference enters the exhibit projection. */
export function projectRewardExhibits({ campaigns, definitions, receipts, progress }) {
  const earned = new Map(receipts.map((receipt) => [receipt.definition.id, receipt]));
  const counts = new Map(progress.map((item) => [item.rewardId, item]));
  return campaigns.flatMap((campaign) => {
    const selected = definitions.filter((definition) => definition.campaignId === campaign.id);
    if (!selected.length) return [];
    const order = new Map(campaign.missionIds.map((id, index) => [id, index]));
    const rows = selected
      .map((definition) => {
        const receipt = earned.get(definition.id);
        const exact = receipt?.definition ?? definition;
        return {
          id: definition.id,
          scope: exact.scope,
          locales: exact.locales,
          receipt: receipt ?? null,
          teaserImage: exact.teaserImage ?? null,
          image: receipt?.definition.payloads.find((payload) => payload.type === 'image') ?? null,
          progress: counts.get(definition.id) ?? null,
          order: order.get(exact.scope.id) ?? campaign.missionIds.length,
        };
      })
      .sort((a, b) => a.order - b.order);
    return [
      {
        campaign,
        layout: DISCOVERY_EXHIBIT_LAYOUTS.includes(campaign.discovery?.exhibitLayout)
          ? campaign.discovery.exhibitLayout
          : 'route',
        collected: rows.filter((row) => row.receipt).length,
        total: rows.length,
        rows,
      },
    ];
  });
}
