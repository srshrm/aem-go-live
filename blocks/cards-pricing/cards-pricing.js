const FEATURED_RE = /most popular|recommended|best value/i;
// trailing separator between a feature name and its description ("Name — <em>desc</em>")
const SEPARATOR_RE = /\s*[—–-]\s*$/;
// spelled-out amount glued to the visible price ("15 dollars$15"), left over from SR-only text
// billing qualifiers that accompany a price
const PRICE_CONTEXT_RE = /\bper\b|\/\s*(?:mo|month|yr|year|user|seat)|\btax\b|\bbilled\b|\bmonthly\b|\bannually\b/i;
const SPOKEN_PRICE_RE = /^(.*?\d[\d.,]*\s*(?:dollars?|euros?|pounds?|yen|usd|eur|gbp))\s*([$€£¥].*)$/i;

/**
 * Splits "Feature name — <em>description</em>" list items into a name and a
 * secondary description line, dropping the separator. Items without a
 * trailing emphasised description are left untouched.
 * @param {Element} list
 */
function decorateFeatures(list) {
  [...list.children].forEach((li) => {
    if (li.tagName !== 'LI') return;
    // authors may wrap the item text in a paragraph
    const container = li.children.length === 1 && li.firstElementChild.tagName === 'P'
      ? li.firstElementChild : li;
    const desc = container.lastElementChild;
    if (!desc || desc.tagName !== 'EM' || !desc.textContent.trim()) return;
    // the description must be the trailing content (ignore whitespace after it)
    let next = desc.nextSibling;
    while (next && next.nodeType === Node.TEXT_NODE && !next.textContent.trim()) {
      next = next.nextSibling;
    }
    if (next) return;

    const nameNodes = [];
    let node = container.firstChild;
    while (node && node !== desc) {
      nameNodes.push(node);
      node = node.nextSibling;
    }
    const lastText = [...nameNodes].reverse()
      .find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!lastText || !SEPARATOR_RE.test(lastText.textContent)) return;
    lastText.textContent = lastText.textContent.replace(SEPARATOR_RE, '');

    const name = document.createElement('span');
    name.className = 'cards-pricing-feature-name';
    name.append(...nameNodes);
    name.normalize();
    if (name.firstChild && name.firstChild.nodeType === Node.TEXT_NODE) {
      name.firstChild.textContent = name.firstChild.textContent.trimStart();
    }
    const description = document.createElement('span');
    description.className = 'cards-pricing-feature-description';
    description.append(...desc.childNodes);

    li.classList.add('cards-pricing-feature-has-description');
    li.replaceChildren(name, description);
  });
}

/**
 * Separates a spelled-out amount that was glued onto the visible price during
 * import ("15 dollars$15"): the words stay available to screen readers, only
 * the symbol price is shown.
 * @param {Element} price
 */
function decoratePrice(price) {
  const walker = document.createTreeWalker(price, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach((text) => {
    const match = text.textContent.trim().match(SPOKEN_PRICE_RE);
    if (!match) return;
    const spoken = document.createElement('span');
    spoken.className = 'cards-pricing-visually-hidden';
    spoken.textContent = match[1].trim();
    const visible = document.createElement('span');
    visible.setAttribute('aria-hidden', 'true');
    visible.textContent = match[2].trim();
    text.replaceWith(spoken, visible);
  });
}

function isCta(el) {
  if (el.classList.contains('button-wrapper')) return true;
  const a = el.tagName === 'P' && el.querySelector('a');
  return !!a && el.textContent.trim() === a.textContent.trim();
}

/**
 * Assigns structural role classes to the parts of one pricing card.
 * @param {Element} body
 * @param {Element} card
 */
function decorateCard(body, card) {
  const els = [...body.children];
  const headingIdx = els.findIndex((el) => /^H[1-6]$/.test(el.tagName));
  const listIdx = els.findIndex((el) => el.tagName === 'UL' || el.tagName === 'OL');

  els.forEach((el, idx) => {
    if (isCta(el)) {
      el.classList.add('cards-pricing-cta');
    } else if (headingIdx > -1 && idx < headingIdx) {
      el.classList.add('cards-pricing-eyebrow');
      if (FEATURED_RE.test(el.textContent)) card.classList.add('cards-pricing-featured');
    } else if (idx === headingIdx) {
      el.classList.add('cards-pricing-plan');
    } else if (idx === headingIdx + 1 && /[$€£¥]|\d|free|custom/i.test(el.textContent) && el.textContent.trim().length < 80) {
      el.classList.add('cards-pricing-price');
      decoratePrice(el);
    } else if (listIdx > -1 && idx === listIdx) {
      el.classList.add('cards-pricing-features');
      decorateFeatures(el);
    } else if (listIdx > -1 && idx === listIdx - 1 && el.tagName === 'P') {
      el.classList.add('cards-pricing-list-heading');
    } else {
      el.classList.add('cards-pricing-description');
    }
  });

  // a short billing note right after the price ("per member, per month + tax")
  // sits beside the price rather than reading as the plan description
  const price = body.querySelector(':scope > .cards-pricing-price');
  const context = price && price.nextElementSibling;
  if (context && context.classList.contains('cards-pricing-description')
    && context.textContent.trim().length < 60 && PRICE_CONTEXT_RE.test(context.textContent)) {
    context.classList.replace('cards-pricing-description', 'cards-pricing-price-context');
    // "per member, per month + tax" -> one line per comma-separated part
    const parts = context.textContent.split(',').map((part) => part.trim()).filter(Boolean);
    if (!context.children.length && parts.length > 1) {
      const nodes = [];
      parts.forEach((part, i) => {
        if (i) {
          const sep = document.createElement('span');
          sep.className = 'cards-pricing-visually-hidden';
          sep.textContent = ', ';
          nodes.push(sep);
        }
        const line = document.createElement('span');
        line.className = 'cards-pricing-price-context-line';
        line.textContent = part;
        nodes.push(line);
      });
      context.replaceChildren(...nodes);
    }
    const row = document.createElement('div');
    row.className = 'cards-pricing-price-row';
    price.replaceWith(row);
    row.append(price, context);
  }

  // CTAs always sit at the bottom of the card
  body.querySelectorAll('.cards-pricing-cta').forEach((cta) => body.append(cta));
}

/**
 * cards-pricing: row of plan cards. Each authored row is one plan; cells are
 * merged (an optional extra short cell such as "Most popular" becomes a badge).
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-pricing-card';
    const body = document.createElement('div');
    body.className = 'cards-pricing-card-body';

    const cells = [...row.children];
    cells.forEach((cell) => {
      const short = cell.children.length <= 1 && cell.textContent.trim().length < 30;
      if (cells.length > 1 && short && FEATURED_RE.test(cell.textContent)) {
        const badge = document.createElement('p');
        badge.className = 'cards-pricing-badge';
        badge.textContent = cell.textContent.trim();
        li.classList.add('cards-pricing-featured');
        li.append(badge);
        return;
      }
      body.append(...cell.children);
    });

    if (!body.textContent.trim()) return;
    decorateCard(body, li);
    li.append(body);
    ul.append(li);
  });

  block.classList.add(`cards-pricing-${Math.min(ul.children.length, 4)}-up`);
  block.replaceChildren(ul);
}
