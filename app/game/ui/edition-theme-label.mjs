/** Current edition chrome can rename a brand without changing receipt-bound themes. */
export function editionThemeLabel(theme, label, provider) {
  const selectedBrand = provider?.selection?.brand;
  const brand =
    (provider?.currentCatalog ?? provider?.catalog)?.brands?.find(
      (item) => item.id === selectedBrand?.id,
    ) ?? selectedBrand;
  if (
    brand?.id !== 'droneaid-nl' ||
    !brand.name ||
    !(brand.themeIds ?? [brand.themeId]).includes(theme?.id)
  )
    return label;
  const previousName = 'DroneAid Netherlands';
  if (theme.name === previousName) return brand.name;
  if (!theme.name?.startsWith(`${previousName} · `) || typeof label !== 'string') return label;
  // The localized campaign suffix belongs to the theme; only its brand prefix
  // comes from current metadata. Custom/imported names retain their own text.
  const separator = label.indexOf(' · ');
  return separator < 0 ? label : `${brand.name}${label.slice(separator)}`;
}
