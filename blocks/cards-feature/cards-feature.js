import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Inline (data:/blob:) and SVG icons cannot go through the media pipeline:
 * createOptimizedPicture would rebuild them as `null<payload>?width=…`.
 * @param {string} src
 */
function isOptimizable(src) {
  return !!src && !/^(data|blob):/i.test(src) && !/\.svg(\?|#|$)/i.test(src);
}

/**
 * Reads the viewBox width/height of an inline SVG data URI so the glyph
 * renders at its native size (source draws each icon at viewBox px).
 * @param {string} src
 * @returns {{w: number, h: number}|null}
 */
function svgSize(src) {
  const m = /^data:image\/svg\+xml(;base64)?,(.*)$/i.exec(src);
  if (!m) return null;
  try {
    const svg = m[1] ? atob(m[2]) : decodeURIComponent(m[2]);
    const vb = /viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
    return vb ? { w: Number(vb[1]), h: Number(vb[2]) } : null;
  } catch (e) {
    return null;
  }
}

/**
 * SVG icons in an <img> can't be recoloured by CSS; expose them as a mask
 * so the glyph is painted with the brand accent colour instead.
 * @param {Element} ul
 */
function decorateGlyphs(ul) {
  ul.querySelectorAll('.cards-feature-icon img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!/^data:image\/svg\+xml/i.test(src) && !/\.svg(\?|#|$)/i.test(src)) return;
    const holder = img.closest('picture') || img.parentElement;
    holder.classList.add('cards-feature-glyph');
    holder.style.setProperty('--cards-feature-glyph', `url("${src.replace(/"/g, '%22')}")`);
    const size = svgSize(src);
    if (size) {
      holder.style.setProperty('--cards-feature-glyph-w', `${size.w}px`);
      holder.style.setProperty('--cards-feature-glyph-h', `${size.h}px`);
    }
  });
}

/**
 * cards-feature: row of borderless feature touts (optional icon, title, text).
 * Each authored row is one item; cells may be [icon | text] or a single cell.
 * Column count on desktop follows the item count (max 4).
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-feature-item';
    const cells = [...row.children];
    cells.forEach((cell) => {
      const onlyVisual = cell.querySelector('picture, img, .icon')
        && !cell.textContent.trim();
      cell.className = onlyVisual ? 'cards-feature-icon' : 'cards-feature-body';
      li.append(cell);
    });
    if (li.textContent.trim() || li.querySelector('picture, img, .icon')) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    if (!isOptimizable(img.getAttribute('src'))) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]));
  });
  decorateGlyphs(ul);

  const count = Math.min(Math.max(ul.children.length, 1), 4);
  block.classList.add(`cards-feature-cols-${count}`);
  block.replaceChildren(ul);
}
