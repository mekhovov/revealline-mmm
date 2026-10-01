import {
  boundedJSON,
  canonicalJSON,
  dataIdentity,
  exactKeys,
  required,
  stableId,
} from '../data-json.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { freezeEdition } from './model.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';

export const CAMPAIGN_LOCALIZATION_FORMAT = 'revealline-campaign-localization.v1';
const fieldsFor = {
  campaign: ['name'],
  mission: [
    'name',
    'design.lesson',
    'design.routeDecision',
    'design.counterplay',
    'design.captureConsequence',
    'design.memorableMoment',
    'design.mastery',
  ],
};
const fieldValue = (record, field) =>
  field.split('.').reduce((value, part) => value?.[part], record);

/** Localized display text is separate from canonical gameplay records. Every
 * entry pins a complete selected source record and its exact English field. */
export function validateCampaignLocalization(input, source, descriptor) {
  const value = boundedJSON(input, {
    maxBytes: 1024 * 1024,
    maxNodes: 20000,
    maxArray: 512,
    maxString: 2048,
  });
  exactKeys(
    value,
    ['format', 'revision', 'campaignId', 'campaignRevision', 'records'],
    'Campaign localization',
  );
  const project = compileContentProject(source).source;
  const campaign = project.campaigns.find((item) => item.id === descriptor.id);
  required(
    value.format === CAMPAIGN_LOCALIZATION_FORMAT &&
      typeof value.revision === 'string' &&
      value.revision.length > 0 &&
      value.revision.length <= 80 &&
      campaign &&
      value.campaignId === campaign.id &&
      value.campaignRevision === campaign.revision,
    'Localization must belong to the exact selected campaign.',
  );
  required(
    Array.isArray(value.records) && value.records.length > 0 && value.records.length <= 512,
    'Localization needs a bounded record list.',
  );
  const seen = new Set();
  for (const row of value.records) {
    exactKeys(row, ['kind', 'id', 'identity', 'fields'], 'Localized record');
    const record =
      row.kind === 'campaign'
        ? campaign
        : row.kind === 'mission'
          ? project.missions.find(
              (item) => item.id === row.id && campaign.missionIds.includes(item.id),
            )
          : null;
    const key = `${row.kind}/${row.id}`;
    required(
      stableId(row.id) &&
        record?.id === row.id &&
        dataIdentity(record) === row.identity &&
        !seen.has(key),
      'Localization record differs from the selected source.',
    );
    seen.add(key);
    exactKeys(row.fields, fieldsFor[row.kind], 'Localized fields');
    required(Object.keys(row.fields).length > 0, 'Localized fields cannot be empty.');
    for (const [field, locales] of Object.entries(row.fields)) {
      exactKeys(locales, ['en', 'uk'], 'Localized text');
      required(
        typeof locales.en === 'string' &&
          locales.en === fieldValue(record, field) &&
          typeof locales.uk === 'string' &&
          locales.uk.trim().length > 0 &&
          locales.uk.length <= 2048,
        'Localization requires exact English and bounded Ukrainian text.',
      );
    }
  }
  return freezeEdition(value);
}

export async function campaignLocalizationSha256(value) {
  return hashPresentationBytes(new TextEncoder().encode(canonicalJSON(value)));
}

export async function verifyCampaignLocalization(input, source, descriptor) {
  const value = validateCampaignLocalization(input, source, descriptor);
  required(
    (await campaignLocalizationSha256(value)) === descriptor.localizationSha256,
    'Localization differs from its selected SHA-256 pin.',
  );
  return value;
}

/** Authoring helper used by production and Studio; it does not modify source. */
export function createCampaignLocalization({
  source,
  campaignId,
  revision = '1',
  campaignLocales,
  missionLocales,
}) {
  const project = compileContentProject(source).source;
  const campaign = project.campaigns.find((item) => item.id === campaignId);
  required(campaign, 'Choose an existing campaign for localization.');
  const records = [];
  function append(kind, record, translated) {
    const fields = Object.fromEntries(
      Object.entries(translated).map(([field, uk]) => [
        field,
        { en: fieldValue(record, field), uk },
      ]),
    );
    records.push({ kind, id: record.id, identity: dataIdentity(record), fields });
  }
  append('campaign', campaign, { name: campaignLocales.uk.name });
  for (const mission of project.missions.filter((item) => campaign.missionIds.includes(item.id))) {
    const locales = missionLocales[mission.id];
    required(locales?.uk, 'Every localized mission needs explicit Ukrainian text.');
    append('mission', mission, {
      name: locales.uk.name,
      'design.lesson': locales.uk.brief,
      'design.routeDecision': locales.uk.routeDecision,
      ...Object.fromEntries(
        ['counterplay', 'captureConsequence', 'memorableMoment', 'mastery']
          .filter((field) => locales.uk[field] !== undefined)
          .map((field) => [`design.${field}`, locales.uk[field]]),
      ),
    });
  }
  return validateCampaignLocalization(
    {
      format: CAMPAIGN_LOCALIZATION_FORMAT,
      revision,
      campaignId,
      campaignRevision: campaign.revision,
      records,
    },
    project,
    campaign,
  );
}
