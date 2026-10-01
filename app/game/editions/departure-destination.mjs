/** Validate the exact requested destination without borrowing default-edition downloads. */
export function editionDepartureDestinationAllowed(provider, ticket, destination, baseURL) {
  try {
    let expected;
    if (ticket.destinationEditionId != null) {
      if (
        ticket.kind !== 'catalogue' ||
        ticket.presentationId !== undefined ||
        !(provider.currentCatalog ?? provider.catalog).editions.some(
          (edition) =>
            edition.id === ticket.destinationEditionId &&
            edition.brandId === provider.selection.brand.id,
        )
      )
        return false;
      expected = provider.href({ edition: ticket.destinationEditionId, presentation: null });
    } else if (ticket.presentationId !== undefined) {
      if (
        ticket.kind !== 'catalogue' ||
        (ticket.presentationId !== null &&
          !provider.presentationHistory.some((item) => item.id === ticket.presentationId))
      )
        return false;
      expected = provider.href({ presentation: ticket.presentationId });
    } else {
      expected = provider.href();
    }
    const target = new URL(destination, baseURL);
    const owned = new URL(expected, baseURL);
    return (
      target.origin === owned.origin &&
      !target.username &&
      !target.password &&
      target.href === owned.href
    );
  } catch {
    return false;
  }
}
