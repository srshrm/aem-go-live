import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Inline (data:/blob:) and SVG sources cannot go through the media pipeline:
 * createOptimizedPicture would rebuild them as `null<payload>?width=…`.
 * @param {string} src
 */
function isOptimizable(src) {
  return !!src && !/^(data|blob):/i.test(src) && !/\.svg(\?|#|$)/i.test(src);
}

/**
 * Logos are authored as `width="100%"` SVGs, so they have no intrinsic size.
 * Read the viewBox of inline SVG data URIs to recover each logo's natural size.
 * @param {string} src
 * @returns {{ width: number, height: number } | null}
 */
function svgSize(src) {
  const match = /^data:image\/svg\+xml(;base64)?,(.*)$/is.exec(src || '');
  if (!match) return null;
  let svg;
  try {
    svg = match[1] ? atob(match[2]) : decodeURIComponent(match[2]);
  } catch (e) {
    return null;
  }
  const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg);
  if (!viewBox) return null;
  const [, , width, height] = viewBox[1].trim().split(/[\s,]+/).map(Number);
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * cards-logos: customer logo strip rendered as an infinite horizontal marquee.
 * Each authored row holds one logo image (optionally wrapped in a link).
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-logos-list';

  [...block.children].forEach((row) => {
    const picture = row.querySelector('picture');
    const img = row.querySelector('img');
    if (!picture && !img) return;
    const li = document.createElement('li');
    li.className = 'cards-logos-item';
    const size = img && svgSize(img.getAttribute('src'));
    if (size) {
      li.classList.add('cards-logos-sized');
      li.style.setProperty('--logo-width', `${size.width}px`);
      li.style.setProperty('--logo-height', `${size.height}px`);
      img.width = size.width;
      img.height = size.height;
    }
    const link = row.querySelector('a[href]');
    let visual = picture || img;
    if (img && isOptimizable(img.getAttribute('src'))) {
      visual = createOptimizedPicture(img.src, img.alt, false, [{ width: '300' }]);
    }
    if (link && !link.contains(visual)) {
      link.textContent = '';
      link.append(visual);
      li.append(link);
    } else {
      li.append(link || visual);
    }
    ul.append(li);
  });

  const track = document.createElement('div');
  track.className = 'cards-logos-track';
  track.append(ul);

  // duplicate the list once so the marquee loops seamlessly
  if (ul.children.length > 1) {
    const clone = ul.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
    track.append(clone);
    block.classList.add('cards-logos-animated');
  }

  block.replaceChildren(track);
}
