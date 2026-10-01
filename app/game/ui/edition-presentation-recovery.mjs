/** Open the current owner of the retained-artwork selector without replacing it. */
export function focusEditionPresentationRecovery({ document: doc, shell }) {
  const collection = doc.getElementById('collection-dialog');
  if (collection?.open) collection.close();
  shell?.openHome();
  const choice = doc.getElementById('edition-presentation-select');
  const owner = choice?.closest('dialog');
  if (!choice || !owner || !doc.contains(choice)) return false;
  const current = () =>
    doc.getElementById('edition-presentation-select') === choice &&
    doc.contains(choice) &&
    choice.closest('dialog') === owner &&
    owner.open;

  if (owner.id === 'settings-dialog') {
    doc.getElementById('shell-options')?.click();
    if (!current()) return false;
    doc.getElementById('settings-tab-data')?.click();
  } else if (owner.id === 'shell-workshop-dialog') {
    shell?.openWorkshop();
  } else if (owner.id !== 'shell-home') {
    return false;
  }
  const available = () =>
    current() && !choice.disabled && !choice.closest('[hidden],[inert],[aria-hidden="true"]');
  // Opening a parent or selecting its category can trigger a newer screen.
  if (!available() || !owner.contains(doc.activeElement)) return false;
  const details = choice.closest('details');
  if (details) details.open = true;
  if (!available() || !owner.contains(doc.activeElement)) return false;
  choice.focus({ preventScroll: true });
  if (!available() || doc.activeElement !== choice) return false;
  choice.scrollIntoView({ block: 'center' });
  return true;
}
