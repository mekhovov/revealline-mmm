// Product limits, not a promise of browser storage availability. Company builds
// include the shared player, branded media and their generated offline metadata.
// Ordinary game core and optional-package policies are separate and unchanged.
export const COMPANY_PACKAGE_BUDGET = Object.freeze({
  maxFiles: 2000,
  maxBytes: 80 * 1024 * 1024,
});

// Branded artwork is also an optional pack in the ordinary game. Raising the
// complete Company runtime allowance must not enlarge that media-only boundary.
export const COMPANY_PRESENTATION_MAX_BYTES = 64 * 1024 * 1024;

export function companyPackageWithinBudget(files, bytes) {
  return (
    Number.isSafeInteger(files) &&
    files > 0 &&
    files <= COMPANY_PACKAGE_BUDGET.maxFiles &&
    Number.isSafeInteger(bytes) &&
    bytes >= 0 &&
    bytes <= COMPANY_PACKAGE_BUDGET.maxBytes
  );
}

export function assertCompanyPackageBudget(files, bytes, label = 'Company edition') {
  if (!companyPackageWithinBudget(files, bytes))
    throw Object.assign(
      new TypeError(
        `${label} exceeds ${COMPANY_PACKAGE_BUDGET.maxFiles} files or ${COMPANY_PACKAGE_BUDGET.maxBytes / 1024 / 1024} MiB (${files} files / ${bytes} bytes).`,
      ),
      { outputFiles: files, outputBytes: bytes },
    );
}
