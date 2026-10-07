import { createOptimizedPicture } from '../../scripts/aem.js';

let carouselId = 0;

function setActive(block, index) {
  const slides = [...block.querySelectorAll('.carousel-showcase-slide')];
  const labels = [...block.querySelectorAll('.carousel-showcase-label')];
  block.dataset.activeSlide = index;
  slides.forEach((slide, idx) => {
    slide.setAttribute('aria-hidden', idx !== index);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (idx === index) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });
  labels.forEach((label, idx) => {
    label.classList.toggle('carousel-showcase-label-active', idx === index);
    label.setAttribute('aria-selected', idx === index);
    label.setAttribute('tabindex', idx === index ? '0' : '-1');
  });
  // source carousel does not loop: dim prev on first slide, next on last
  const prev = block.querySelector('.carousel-showcase-prev');
  const next = block.querySelector('.carousel-showcase-next');
  if (prev) prev.setAttribute('aria-disabled', index === 0);
  if (next) next.setAttribute('aria-disabled', index === slides.length - 1);
}

function showSlide(block, index) {
  const slides = block.querySelectorAll('.carousel-showcase-slide');
  if (!slides.length) return;
  const target = ((index % slides.length) + slides.length) % slides.length;
  const track = block.querySelector('.carousel-showcase-slides');
  track.scrollTo({ top: 0, left: slides[target].offsetLeft, behavior: 'smooth' });
  setActive(block, target);
}

function bindEvents(block) {
  const current = () => parseInt(block.dataset.activeSlide || '0', 10);
  const step = (delta) => (e) => {
    if (e.currentTarget.getAttribute('aria-disabled') === 'true') return;
    showSlide(block, current() + delta);
  };
  block.querySelector('.carousel-showcase-prev').addEventListener('click', step(-1));
  block.querySelector('.carousel-showcase-next').addEventListener('click', step(1));

  const labels = [...block.querySelectorAll('.carousel-showcase-label')];
  labels.forEach((label, idx) => {
    label.addEventListener('click', () => showSlide(block, idx));
    label.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + labels.length) % labels.length;
      showSlide(block, next);
      labels[next].focus();
    });
  });

  // keep state in sync with touch/trackpad scrolling
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(block, parseInt(entry.target.dataset.slideIndex, 10));
    });
  }, { root: block.querySelector('.carousel-showcase-slides'), threshold: 0.6 });
  block.querySelectorAll('.carousel-showcase-slide').forEach((slide) => observer.observe(slide));
}

/**
 * carousel-showcase: large screenshot slider with side prev/next arrows and
 * the slides' title + description rendered below as selectable tout labels.
 * Each authored row is one slide: [image | title + description].
 * @param {Element} block
 */
export default function decorate(block) {
  carouselId += 1;
  const id = `carousel-showcase-${carouselId}`;
  block.id = id;
  // ignore empty authored rows so slide indexes stay contiguous
  const rows = [...block.children].filter((r) => r.textContent.trim() || r.querySelector('picture'));

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const stage = document.createElement('div');
  stage.className = 'carousel-showcase-stage';
  const track = document.createElement('ul');
  track.className = 'carousel-showcase-slides';
  const labels = document.createElement('div');
  labels.className = 'carousel-showcase-labels';
  labels.setAttribute('role', 'tablist');

  rows.forEach((row, idx) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-showcase-slide';
    slide.dataset.slideIndex = idx;
    slide.id = `${id}-slide-${idx}`;
    slide.setAttribute('role', 'tabpanel');

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'carousel-showcase-label';
    label.setAttribute('role', 'tab');
    label.setAttribute('aria-controls', slide.id);
    label.id = `${id}-label-${idx}`;
    slide.setAttribute('aria-labelledby', label.id);

    [...row.children].forEach((cell) => {
      cell.querySelectorAll('picture').forEach((picture) => {
        const img = picture.querySelector('img');
        const media = document.createElement('div');
        media.className = 'carousel-showcase-slide-image';
        media.append(createOptimizedPicture(img.src, img.alt, idx === 0, [
          { media: '(min-width: 900px)', width: '1600' },
          { width: '750' },
        ]));
        slide.append(media);
        const parent = picture.parentElement;
        picture.remove();
        if (parent && parent !== cell && !parent.textContent.trim() && !parent.children.length) {
          parent.remove();
        }
      });
      [...cell.children].forEach((el) => {
        if (!el.textContent.trim()) return;
        // headings inside a button are invalid; keep the text, drop the heading tag
        if (/^H[1-6]$/.test(el.tagName)) {
          const title = document.createElement('span');
          title.className = 'carousel-showcase-label-title';
          title.innerHTML = el.innerHTML;
          label.append(title);
        } else {
          const text = document.createElement('span');
          text.className = 'carousel-showcase-label-text';
          text.textContent = el.textContent.trim();
          label.append(text);
        }
      });
    });

    if (!slide.children.length && !label.children.length) return;
    track.append(slide);
    if (!label.children.length) label.textContent = `Show slide ${idx + 1}`;
    labels.append(label);
  });

  stage.append(track);
  const children = [stage];

  if (track.children.length > 1) {
    const nav = document.createElement('div');
    nav.className = 'carousel-showcase-navigation';
    nav.innerHTML = `
      <button type="button" class="carousel-showcase-prev" aria-label="Previous slide"></button>
      <button type="button" class="carousel-showcase-next" aria-label="Next slide"></button>
    `;
    stage.append(nav);
    children.push(labels);
  } else {
    block.classList.add('carousel-showcase-single');
    if (labels.textContent.trim()) children.push(labels);
  }

  block.replaceChildren(...children);
  setActive(block, 0);
  if (track.children.length > 1) bindEvents(block);
}
