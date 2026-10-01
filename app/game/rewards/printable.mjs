import { LEARNING_PROFILE_IDS, LEARNING_PROFILE_LABELS } from './learning-profiles.mjs';
import { validateCompletionReward } from './model.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { inspectRewardMediaBytes } from './media-format.mjs';
import { createRewardQrImage } from './qr.mjs';
import { rewardPresentationItems } from './audio-groups.mjs';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const link = (label, url) =>
  `<a href="${escape(url)}" rel="noopener noreferrer">${escape(label)}</a>`;
const copy = {
  en: {
    missing:
      'This exact media revision is unavailable. The discovery and its sources remain below.',
    note: 'A shareable discovery from RevealLine. Open links only when you choose. Use your browser’s Print action to print or save a PDF.',
    code: 'This is a public, shareable code, not a unique or single-use entitlement.',
    terms: 'Issuer terms',
    until: 'Valid until',
    preview: 'Author preview — this document does not record a player win.',
  },
  uk: {
    missing: 'Ця точна версія медіа недоступна. Відкриття та його джерела залишаються нижче.',
    note: 'Відкриття з RevealLine, яким можна поділитися. Відкривайте посилання лише за власним вибором. Скористайтеся друком у браузері, щоб надрукувати документ або зберегти PDF.',
    code: 'Це загальнодоступний код для поширення, а не унікальне чи одноразове право.',
    terms: 'Умови емітента',
    until: 'Дійсний до',
    preview: 'Авторський перегляд — цей документ не підтверджує перемогу гравця.',
  },
};

function dataURL(bytes, mimeType) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** A static, offline document. It is a view of authored knowledge, never evidence
 * of completion. The caller supplies only selected, exact-revision media. */
export async function createPrintableReward(
  input,
  {
    locale = 'en',
    getImage = async () => null,
    getTranscript = async () => null,
    signal,
    preview = false,
    crypto = globalThis.crypto,
  } = {},
) {
  const definition = validateCompletionReward(input);
  if (!Object.hasOwn(copy, locale)) throw new TypeError('Unsupported printable discovery locale.');
  const labels = copy[locale],
    local = (value) => value.locales[locale];
  const missingAssetIds = [],
    sections = [];
  let totalBytes = 0;
  async function portableImage(asset, alt, markers = []) {
    try {
      const media = await getImage(asset, { signal });
      signal?.throwIfAborted();
      if (!(media?.bytes instanceof Uint8Array) || media.bytes.length > 4 * 1024 * 1024)
        throw new TypeError('Printable image exceeds the existing still-image budget.');
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', media.bytes)),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('');
      if (hash !== asset.sha256) throw new TypeError('Printable image revision mismatch.');
      const url = dataURL(media.bytes, media.mimeType);
      if (!inspectImageDataUrl(url).valid)
        throw new TypeError('Unsupported printable image bytes.');
      if (totalBytes + media.bytes.length > 32 * 1024 * 1024)
        throw new TypeError('Printable images exceed the edition asset budget.');
      totalBytes += media.bytes.length;
      const image = `<img src="${url}" alt="${escape(alt)}">`;
      const positioned = markers.length
        ? `<div class="diagram-frame">${image}${markers.map((point) => `<span class="diagram-marker" aria-hidden="true" style="left:${point.x * 100}%;top:${point.y * 100}%">${point.ordinal}</span>`).join('')}</div>`
        : image;
      return `<figure>${positioned}<figcaption>${escape(alt)}</figcaption></figure>`;
    } catch {
      signal?.throwIfAborted();
      missingAssetIds.push(asset.assetId);
      return `<p class="unavailable">${escape(labels.missing)}</p>`;
    }
  }
  const ordered = rewardPresentationItems(definition).flatMap((item) =>
    item.kind === 'audio-group'
      ? item.payloads.map((payload, index) => ({ payload, group: index === 0 ? item.group : null }))
      : [{ payload: item.payload }],
  );
  for (const { payload, group } of ordered) {
    signal?.throwIfAborted();
    const text = local(payload);
    const parts = [`<h2>${escape(text.title)}</h2>`];
    if (group) parts.unshift(`<h2>${escape(local(group).title)}</h2>`);
    if (payload.type === 'knowledge') {
      parts.push(...text.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`));
      if (payload.profiles)
        for (const profile of LEARNING_PROFILE_IDS) {
          const variant = payload.profiles[profile][locale];
          parts.push(
            `<h3>${escape(LEARNING_PROFILE_LABELS[locale][profile])}: ${escape(variant.title)}</h3>`,
            ...variant.paragraphs.map((p) => `<p>${escape(p)}</p>`),
          );
        }
      if (text.sources?.length)
        parts.push(
          `<ul>${text.sources.map((source) => `<li>${link(source.title, source.url)}</li>`).join('')}</ul>`,
        );
    } else if (payload.type === 'image') {
      parts.push(await portableImage(payload.asset, text.alt));
    } else if (payload.type === 'exploration') {
      parts.push(`<p>${escape(text.intro)}</p>`);
      if (payload.recipe.diagram) {
        const diagram = payload.recipe.diagram;
        parts.push(
          await portableImage(
            diagram.asset,
            local(diagram).alt,
            diagram.hotspots.map((point) => ({
              ...point,
              ordinal: payload.recipe.cards.findIndex((card) => card.id === point.cardId) + 1,
            })),
          ),
        );
        parts.push(`<p>${escape(local(diagram).caption)}</p>`);
        parts.push(
          `<ol>${payload.recipe.cards.map((card) => `<li>${escape(local(card).title)}</li>`).join('')}</ol>`,
        );
      }
      for (const card of payload.recipe.cards) {
        const cardText = local(card);
        parts.push(
          `<article><h3>${escape(cardText.title)}</h3><p>${escape(cardText.body)}</p><p>${escape(cardText.sourceNote)}</p>`,
        );
        if (card.asset) parts.push(await portableImage(card.asset, cardText.alt));
        for (const sourceId of card.sourceIds) {
          const source = payload.recipe.sources.find((item) => item.id === sourceId);
          parts.push(`<p>${link(source.title, source.url)}</p>`);
        }
        parts.push('</article>');
      }
      for (const prediction of payload.recipe.predictions) {
        parts.push(`<article><h3>${escape(local(prediction).prompt)}</h3>`);
        for (const choice of prediction.choices)
          parts.push(
            `<p><strong>${escape(local(choice).label)}</strong> — ${escape(local(choice).feedback)}</p>`,
          );
        parts.push(`<p>${escape(local(prediction).explanation)}</p></article>`);
      }
    } else if (payload.type === 'audio' || payload.type === 'video') {
      if (payload.type === 'video') parts.push(await portableImage(payload.poster, text.title));
      const reference = payload.transcript[locale];
      try {
        const bytes = await getTranscript(reference, { signal });
        signal?.throwIfAborted();
        if (!(bytes instanceof Uint8Array)) throw new TypeError('Transcript is unavailable.');
        const transcript = inspectRewardMediaBytes(
          { path: 'transcript.txt', bytes: bytes.length },
          'transcript',
          bytes,
        ).text;
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join('');
        if (hash !== reference.sha256) throw new TypeError('Transcript revision mismatch.');
        parts.push(`<div class="transcript">${escape(transcript)}</div>`);
      } catch {
        signal?.throwIfAborted();
        missingAssetIds.push(reference.assetId);
        parts.push(
          `<p class="unavailable">${escape(locale === 'uk' ? 'Точний текстовий супровід недоступний. Відкриття збережено.' : 'The exact transcript is unavailable. Your discovery is preserved.')}</p>`,
        );
      }
    } else if (payload.type === 'cosmetic') {
      parts.push(
        `<p>${escape(locale === 'uk' ? 'Оформлення персонажа. Воно не змінює зіткнення, здібності чи рахунок.' : 'A character appearance. It does not change collision, abilities or scoring.')}</p>`,
      );
      parts.push(
        `<p><code>${escape(payload.recipeId)} · ${escape(payload.recipeRevision)}</code></p>`,
      );
    } else if (payload.type === 'url') {
      parts.push(
        `<p>${link(text.title, payload.url)}</p><p class="address">${escape(payload.url)}</p>`,
      );
      if (payload.qr) {
        const qr = await createRewardQrImage(payload);
        signal?.throwIfAborted();
        parts.push(
          `<figure><img style="width:20rem;max-width:100%" src="${qr.src}" alt="${escape(`QR: ${payload.url}`)}"></figure>`,
        );
      }
    } else if (payload.type === 'public-code') {
      parts.push(
        `<p>${escape(payload.issuer)}</p><p><code>${escape(payload.code)}</code></p><p>${escape(text.terms)}</p>`,
      );
      if (payload.expiresOn)
        parts.push(`<p>${escape(labels.until)} ${escape(payload.expiresOn)}</p>`);
      if (payload.termsUrl) parts.push(`<p>${link(labels.terms, payload.termsUrl)}</p>`);
      parts.push(`<p>${escape(labels.code)}</p>`);
    } else {
      // Future rich-media adapters retain a useful printed title without trying
      // to execute a media player or an unadmitted recipe in the document.
      parts.push(`<p class="unavailable">${escape(labels.missing)}</p>`);
    }
    sections.push(`<section>${parts.join('')}</section>`);
  }
  signal?.throwIfAborted();
  return {
    missingAssetIds,
    html: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(local(definition).title)}</title><style>body{max-width:62rem;margin:auto;padding:clamp(1rem,4vw,3rem);font:18px/1.6 system-ui,sans-serif;color:#18263b;background:#fff}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.15}h2{line-height:1.3}section{margin:2rem 0;padding-top:1rem;border-top:1px solid #ccd5de}img{max-width:100%;max-height:70vh;object-fit:contain}figure{margin:1rem 0}.diagram-frame{position:relative}.diagram-frame img{display:block;width:100%;height:auto;max-height:none}.diagram-marker{position:absolute;transform:translate(-50%,-50%);background:#fff;color:#18263b;border:2px solid #18263b;border-radius:50%;font:bold .8rem/1.4 system-ui;padding:.1rem .4rem}.transcript{white-space:pre-wrap;overflow-wrap:anywhere}figcaption,footer,.address{font-size:.85rem;color:#42546b;overflow-wrap:anywhere}a{color:#145bb0}code{font-size:1.3em;overflow-wrap:anywhere}.unavailable{padding:1rem;border:1px solid #8d99a7}@media print{body{font-size:11pt;padding:0}h1{font-size:25pt}h2,figure{break-inside:avoid}img{max-height:18cm}a{color:inherit}a::after{content:' (' attr(href) ')';font-size:8pt;overflow-wrap:anywhere}}</style></head><body><header><h1>${escape(local(definition).title)}</h1><p>${escape(labels.note)}</p>${preview ? `<p>${escape(labels.preview)}</p>` : ''}</header><main>${sections.join('')}</main><footer>${escape(definition.id)} · ${escape(definition.revision)}</footer></body></html>`,
  };
}
