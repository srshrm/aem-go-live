import { createOptimizedPicture } from '../../scripts/aem.js';

const VIDEO_RE = /\.(mp4|webm)(\?|#|$)/i;

/**
 * Builds a muted looping background video. Autoplay is skipped for users
 * who prefer reduced motion (the poster image stays visible instead).
 * @param {string} src
 * @param {string} [poster]
 */
function buildVideo(src, poster) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'none';
  if (poster) video.poster = poster;
  const source = document.createElement('source');
  source.src = src;
  source.type = src.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4';
  video.append(source);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    video.autoplay = true;
    video.setAttribute('autoplay', '');
  }
  return video;
}

/**
 * hero-stat: full-width stat banner. Background poster image (+ optional
 * video link) and foreground headline with CTA or source attribution.
 * @param {Element} block
 */
export default function decorate(block) {
  const background = document.createElement('div');
  background.className = 'hero-stat-background';
  const content = document.createElement('div');
  content.className = 'hero-stat-content';
  let videoSrc;

  [...block.children].forEach((row) => {
    const cells = row.children.length ? [...row.children] : [row];
    cells.forEach((cell) => {
      // background video link(s)
      cell.querySelectorAll('a[href]').forEach((a) => {
        if (!VIDEO_RE.test(a.href)) return;
        videoSrc = videoSrc || a.href;
        const p = a.closest('p');
        if (p && p.textContent.trim() === a.textContent.trim()) p.remove();
        else a.remove();
      });
      cell.querySelectorAll('picture').forEach((picture) => {
        const parent = picture.parentElement;
        background.append(picture);
        if (parent && parent !== cell && !parent.textContent.trim() && !parent.children.length) {
          parent.remove();
        }
      });
      [...cell.children].forEach((el) => {
        if (!el.textContent.trim()) return;
        if (el.tagName === 'P' && /^\s*[-–—]/.test(el.textContent)) {
          el.classList.add('hero-stat-attribution');
        }
        content.append(el);
      });
    });
  });

  let posterSrc;
  background.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '750' },
    ]);
    posterSrc = posterSrc || optimized.querySelector('img').src;
    img.closest('picture').replaceWith(optimized);
  });

  if (videoSrc) background.append(buildVideo(videoSrc, posterSrc));

  const children = [];
  if (background.children.length) children.push(background);
  else block.classList.add('hero-stat-no-media');
  children.push(content);
  block.replaceChildren(...children);
}
