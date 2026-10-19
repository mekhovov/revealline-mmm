import { t } from '../i18n/index.mjs';
const keys = {
  requested: 'common:export.requested',
  shared: 'common:export.shared',
  cancelled: 'common:export.cancelled',
};
/** Resolve the platform outcome, never inspect or replace its English prose. */
export function platformExportText(result) {
  return keys[result.status] ? t(keys[result.status]) : result.message;
}
