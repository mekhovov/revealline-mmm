import { installBrandedIsolation } from '../branded-isolation.mjs';
export function mountEditionNavigation({provider, document: doc}) {
  for (const link of doc.querySelectorAll('a[href]')) {
    const target = new URL(link.getAttribute('href'), provider.href());
    const base = new URL(provider.href());
    if (target.origin === base.origin && ['index.html', 'company.html', ''].some((entry) => target.pathname === new URL('./', base).pathname + entry))
      link.href = provider.href() + target.hash;
  }
  installBrandedIsolation(doc, doc.defaultView ?? globalThis.window);
}
