import { canonicalJSON, dataIdentity } from '../data-json.mjs';
import { contentText, installContentTranslations } from '../i18n/content.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { applyGameplayTuning, recoverGameplayTuning } from '../gameplay-tuning.mjs';

/** Called only after the selected edition has passed bootstrap admission. All
 * bindings are derived through the ordinary compiler, never by display names. */
export function installEditionLocalization(bootstrap) {
  const rows = Object.values(bootstrap.localizations ?? {}).flatMap((value) => value.records);
  if (!rows.length) return { dispose() {}, briefFor: () => undefined };
  const rowsById = new Map(rows.map((row) => [`${row.kind}/${row.id}`, row]));
  const source = bootstrap.source;
  const missions = new Map(source.missions.map((mission) => [mission.id, mission]));
  const entries = [],
    levels = new Map(),
    briefRecords = new Map();
  const fieldsFor = (row, mapping) =>
    Object.fromEntries(
      Object.entries(mapping).flatMap(([field, sourceField]) => {
        const locales = row?.fields[sourceField];
        return locales ? [[field, { source: locales.en, locales }]] : [];
      }),
    );
  const add = (record, fields) => {
    if (Object.keys(fields).length) entries.push({ record, fields });
  };
  for (const campaign of source.campaigns)
    add(campaign, fieldsFor(rowsById.get(`campaign/${campaign.id}`), { name: 'name' }));
  for (const mission of source.missions) {
    const row = rowsById.get(`mission/${mission.id}`);
    add(
      mission,
      fieldsFor(
        row,
        Object.fromEntries(Object.keys(row?.fields ?? {}).map((field) => [field, field])),
      ),
    );
  }
  const catalog = createContentExecutionCatalog(source, { mode: 'solo' });
  for (const entry of catalog.entries) {
    const campaignRow = rowsById.get(`campaign/${entry.campaignId}`);
    add(entry.campaign, fieldsFor(campaignRow, { title: 'name' }));
    for (const manifest of entry.manifests) {
      const row = rowsById.get(`mission/${manifest.missionId}`);
      if (!row) continue;
      const fields = fieldsFor(row, { name: 'name' });
      add(manifest.level, fields);
      add(
        manifest,
        fieldsFor(
          row,
          Object.fromEntries(
            Object.keys(row.fields)
              .filter((field) => field.startsWith('design.'))
              .map((field) => [field, field]),
          ),
        ),
      );
      levels.set(`${manifest.missionId}/${entry.difficulty}`, {
        level: manifest.level,
        fields,
        mission: missions.get(manifest.missionId),
      });
      briefRecords.set(dataIdentity(manifest.level), missions.get(manifest.missionId));
    }
  }
  for (const mission of catalog.journey().missions)
    add(mission, {
      ...fieldsFor(rowsById.get(`mission/${mission.levelId}`), {
        name: 'name',
        hook: 'design.routeDecision',
      }),
      ...fieldsFor(rowsById.get(`campaign/${mission.campaignId}`), { campaignTitle: 'name' }),
    });
  if (bootstrap.boot?.campaign)
    add(
      bootstrap.boot.campaign,
      fieldsFor(rowsById.get(`campaign/${bootstrap.boot.campaign.id}`), { title: 'name' }),
    );
  const resolve = (record) => {
    const tuning = recoverGameplayTuning(record);
    if (!tuning) return null;
    const known = levels.get(`${record.id}/${tuning.difficulty}`);
    if (!known) return null;
    try {
      // A revision that looks familiar is insufficient. Rebuild and compare the
      // complete level, including custom pressure overrides and original text.
      return canonicalJSON(applyGameplayTuning(known.level, tuning)) === canonicalJSON(record)
        ? known
        : null;
    } catch {
      return null;
    }
  };
  const dispose = installContentTranslations({ entries, resolve });
  return {
    dispose,
    briefFor(level) {
      const mission = briefRecords.get(dataIdentity(level)) ?? resolve(level)?.mission;
      return mission ? contentText(mission, 'design.lesson') : undefined;
    },
  };
}
