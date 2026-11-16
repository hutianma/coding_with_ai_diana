// The bookshelf: all your binders standing on a shelf, covers facing out. Swipe or drag
// it (or use the mouse wheel, the arrows or the ← → keys) to look along it; the one in the middle comes forward. Tap it to
// pull it out and open it. At the end there's a space for a new binder.
import { decorateCover } from './CoverDesign.js';
import { countCards, plural } from './layout.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// binders: in shelf order. cards: { id: card } (for cover windows).
// current: the binder to start at. onOpen(binder): open it. onNew(): make a new binder.
// fadeIn: fade the shelf in.
export function mountShelf(root, { binders, cards, current = null, onOpen, onNew, fadeIn = true }) {
  const view = document.createElement('div');
  view.className = fadeIn ? 'shelf-view' : 'shelf-view shelf-view--still';
  view.innerHTML = `
    <header class="toolbar">
      <span></span>
      <h1 class="toolbar__title shelf-view__title">My binders</h1>
      <span></span>
    </header>
    <div class="shelf">
      <ul class="shelf__track" aria-label="Your binders"></ul>
      <div class="shelf__plank" aria-hidden="true"></div>
    </div>
    <nav class="page-nav" aria-label="Look along the shelf">
      <button class="page-nav__btn" type="button" data-dir="prev" aria-label="Previous binder">‹</button>
      <span class="page-nav__label" aria-live="polite"></span>
      <button class="page-nav__btn" type="button" data-dir="next" aria-label="Next binder">›</button>
    </nav>
  `;
  const track = view.querySelector('.shelf__track');
  const label = view.querySelector('.page-nav__label');
  const prevBtn = view.querySelector('[data-dir="prev"]');
  const nextBtn = view.querySelector('[data-dir="next"]');

  // ---------- The binders, and a space for a new one ----------
  const slots = binders.map((binder) => {
    const li = document.createElement('li');
    li.className = 'shelf__slot';
    const count = plural(countCards(binder), 'card');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shelf__binder';
    btn.setAttribute('aria-label', `Open binder: ${binder.name}, ${count}`);
    decorateCover(btn, binder, cards);
    btn.addEventListener('click', () => choose(li, () => pullOut(btn, () => onOpen(binder))));
    const name = document.createElement('p');
    name.className = 'shelf__name';
    name.textContent = binder.name; // plain text, never HTML
    const small = document.createElement('p');
    small.className = 'shelf__count';
    small.textContent = count;
    li.append(btn, name, small);
    return li;
  });
  const newSlot = document.createElement('li');
  newSlot.className = 'shelf__slot';
  newSlot.innerHTML = `
    <button type="button" class="shelf__new"><span aria-hidden="true">＋</span>New binder</button>
    <p class="shelf__name">&nbsp;</p><p class="shelf__count">&nbsp;</p>`;
  newSlot.querySelector('button').addEventListener('click', () => choose(newSlot, onNew));
  slots.push(newSlot);
  track.append(...slots);

  // ---------- Which one is in the middle ----------
  let centered = Math.max(0, binders.indexOf(current));
  let frame = 0;

  // The binders grow as they come to the middle, and shrink and fade away from it
  function measure() {
    frame = 0;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    slots.forEach((slot, i) => {
      const center = slot.offsetLeft + slot.offsetWidth / 2;
      const d = (center - mid) / slot.offsetWidth;
      if (Math.abs(d) < bestDistance) {
        best = i;
        bestDistance = Math.abs(d);
      }
      const near = Math.min(1, Math.abs(d));
      slot.style.setProperty('--near', (1 - near).toFixed(3));
    });
    return best;
  }
  // Swiping: whichever binder is nearest the middle is the middle one. (Not while gliding
  // to a binder that was chosen: that one is the middle one already.)
  let glideTo = null; // where a glide is going (scrollLeft), or null
  let glideTimer = 0;
  track.addEventListener('scroll', () => {
    frame ||= requestAnimationFrame(() => {
      const best = measure();
      if (glideTo !== null && Math.abs(track.scrollLeft - glideTo) > 2) return;
      glideTo = null;
      if (best !== centered) {
        centered = best;
        updateNav();
      }
    });
  }, { passive: true });
  // A finger or wheel takes over from a glide
  for (const type of ['pointerdown', 'wheel', 'touchstart']) {
    track.addEventListener(type, () => { glideTo = null; }, { passive: true });
  }

  // ---------- Sliding with a mouse ----------
  // Fingers and trackpads slide the shelf already. A mouse can drag it too (it settles on
  // the nearest binder when you let go), and the mouse wheel steps along it. A drag
  // doesn't count as a tap on a binder.
  let mouseDrag = null;
  let justDragged = false;
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    mouseDrag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
    justDragged = false;
  });
  track.addEventListener('pointermove', (event) => {
    if (!mouseDrag || event.pointerId !== mouseDrag.id) return;
    const dx = event.clientX - mouseDrag.x;
    if (!mouseDrag.moved) {
      if (Math.abs(dx) < 5) return; // still a click
      mouseDrag.moved = true;
      track.classList.add('is-dragging'); // no snapping while it follows the mouse
      try { track.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    }
    track.scrollLeft = mouseDrag.left - dx;
  });
  const endMouseDrag = (event) => {
    if (!mouseDrag || event.pointerId !== mouseDrag.id) return;
    justDragged = mouseDrag.moved;
    mouseDrag = null;
    if (!justDragged) return;
    track.classList.remove('is-dragging');
    scrollToSlot(measure()); // settle on the nearest binder
  };
  track.addEventListener('pointerup', endMouseDrag);
  track.addEventListener('pointercancel', endMouseDrag);
  track.addEventListener('click', (event) => {
    if (!justDragged) return;
    justDragged = false;
    event.stopPropagation();
    event.preventDefault();
  }, true);

  // An up/down mouse wheel steps one binder at a time (sideways scrolling works by itself)
  let wheelSum = 0;
  let wheelPause = 0;
  track.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    if (wheelPause) return;
    wheelSum += event.deltaY;
    if (Math.abs(wheelSum) < 40) return;
    scrollToSlot(centered + Math.sign(wheelSum));
    wheelSum = 0;
    wheelPause = setTimeout(() => { wheelPause = 0; }, 350);
  }, { passive: false });

  function updateNav() {
    label.textContent = centered < binders.length ? `${centered + 1} of ${binders.length}` : 'New binder';
    prevBtn.disabled = centered === 0;
    nextBtn.disabled = centered === slots.length - 1;
    slots.forEach((slot, i) => slot.classList.toggle('is-centered', i === centered));
  }

  // Bring a binder to the middle. It counts as the middle one straight away (so a second
  // tap opens it, even before the scrolling has finished).
  function scrollToSlot(i, smooth = true) {
    centered = Math.max(0, Math.min(slots.length - 1, i));
    const slot = slots[centered];
    const left = slot.offsetLeft + slot.offsetWidth / 2 - track.clientWidth / 2;
    const glide = smooth && !reducedMotion.matches;
    if (glide) {
      glideTo = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, left));
      clearTimeout(glideTimer);
      glideTimer = setTimeout(() => { glideTo = null; }, 1000); // in case it never quite arrives
    }
    track.scrollTo({ left, behavior: glide ? 'smooth' : 'auto' });
    updateNav();
    if (!glide) measure();
  }

  // Tapping one that isn't in the middle brings it to the middle; tapping the middle one uses it
  function choose(slot, use) {
    const i = slots.indexOf(slot);
    if (i !== centered) {
      scrollToSlot(i);
      return;
    }
    use();
  }

  // Pull the binder off the shelf (it lifts towards you), then open it
  let opening = false;
  function pullOut(btn, open) {
    if (opening) return;
    opening = true;
    if (reducedMotion.matches) {
      open();
      return;
    }
    view.classList.add('is-opening');
    btn.classList.add('is-pulled');
    let opened = false;
    const done = () => {
      if (opened || !view.isConnected) return;
      opened = true;
      open();
    };
    btn.animate([
      { transform: 'none' },
      { transform: 'translateY(-4%) scale(1.06)', offset: 0.45 },
      { transform: 'translateY(-2%) scale(1.25)', opacity: 0 },
    ], { duration: 420, easing: 'cubic-bezier(.3, .7, .3, 1)', fill: 'forwards' }).finished.then(done, done);
    setTimeout(done, 600); // open even if the animation never finishes (e.g. a background tab)
  }

  prevBtn.addEventListener('click', () => scrollToSlot(centered - 1));
  nextBtn.addEventListener('click', () => scrollToSlot(centered + 1));
  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const i = centered + (event.key === 'ArrowRight' ? 1 : -1);
    if (i < 0 || i >= slots.length) return;
    scrollToSlot(i);
    slots[i].querySelector('button').focus({ preventScroll: true });
  });

  root.replaceChildren(view);
  scrollToSlot(centered, false);
  // A new screen size (e.g. turning the phone): sizes change, so put the middle one back
  let lastWidth = track.clientWidth;
  const resized = new ResizeObserver(() => {
    if (track.clientWidth === lastWidth) return;
    lastWidth = track.clientWidth;
    scrollToSlot(centered, false);
  });
  resized.observe(track);

  return {
    destroy() {
      cancelAnimationFrame(frame);
      clearTimeout(glideTimer);
      clearTimeout(wheelPause);
      resized.disconnect();
      view.remove();
    },
  };
}
