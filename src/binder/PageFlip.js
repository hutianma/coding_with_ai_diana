// The 3D page-turning engine.
//
// A binder is a stack of "leaves" (sheets). Each leaf has a front face and a
// back face and turns around the spine, like a real binder sheet.
// `current` = how many leaves have been turned to the left side.
//
// Computer (two-page) mode: every leaf holds two pages, front and back.
// Phone (single) mode: every leaf holds one page; turned leaves move off-screen.

import { clamp } from './paging.js';

const FLIP_MS = 650;
const DRAG_START_PX = 8; // move this far before a press becomes a drag
const SWIPE_SPEED = 0.45; // px per ms; a flick this fast turns the page even if it's not past halfway
const FLICK_WINDOW_MS = 100; // only the last moments before release count towards a flick
const CLICK_AFTER_DRAG_MS = 500; // the click a browser fires after a drag arrives within this time
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export class PageFlip {
  constructor(container, { leafCount, maxCurrent = leafCount, renderFace, single = false, start = 0, coverColor, onChange }) {
    this.leafCount = leafCount;
    this.maxCurrent = maxCurrent;
    this.renderFace = renderFace; // (leafIndex, 'front' | 'back') => Element
    this.single = single;
    this.onChange = onChange;
    this.current = clamp(start, 0, maxCurrent);
    this.running = null; // the flip animation in progress, if any

    this.el = document.createElement('div');
    this.el.className = `book${single ? ' book--single' : ''}`;
    this.el.style.setProperty('--cover-color', coverColor);

    // Inside of the front and back covers, seen when no page covers them
    this.el.append(makeDiv('book__base book__base--left'), makeDiv('book__base book__base--right'));

    this.leaves = [];
    for (let i = 0; i < leafCount; i++) {
      const leaf = makeDiv('leaf');
      leaf.innerHTML = `
        <div class="leaf__face leaf__face--front"><div class="leaf__shade"></div></div>
        <div class="leaf__face leaf__face--back"><div class="leaf__shade"></div></div>
      `;
      const front = leaf.querySelector('.leaf__face--front');
      const back = leaf.querySelector('.leaf__face--back');
      this.leaves.push({
        el: leaf,
        front,
        back,
        frontShade: front.querySelector('.leaf__shade'),
        backShade: back.querySelector('.leaf__shade'),
        filled: false,
      });
      this.el.append(leaf);
    }

    // Stacking order: resting leaves < shadows < turning leaf < spine
    this.zShadow = 2 * leafCount + 19;
    this.zTurning = 2 * leafCount + 20;

    // Shadows that fall on the pages underneath a turning leaf
    this.shadowLeft = makeDiv('book__shadow book__shadow--left');
    this.shadowRight = makeDiv('book__shadow book__shadow--right');
    this.shadowLeft.style.zIndex = this.shadowRight.style.zIndex = this.zShadow;
    this.el.append(this.shadowLeft, this.shadowRight);

    const spine = makeDiv('spine');
    spine.setAttribute('aria-hidden', 'true');
    spine.style.zIndex = 2 * leafCount + 30;
    spine.innerHTML = '<span class="ring"></span>'.repeat(3);
    this.el.append(spine);

    container.append(this.el);
    this.update();

    this.gesture = null; // the drag in progress, if any
    this.el.addEventListener('pointerdown', this.onPointerDown);
    // After a drag, swallow the click that browsers fire on release (so a drag never "taps" a card)
    this.el.addEventListener('click', this.onClickCapture, true);
  }

  get canNext() { return this.current < this.maxCurrent; }
  get canPrev() { return this.current > 0; }

  next() { if (this.canNext) this.flip(this.current, +1); }
  prev() { if (this.canPrev) this.flip(this.current - 1, -1); }

  flip(leafIndex, direction) {
    if (this.gesture?.dir) return; // a finger is already turning a page

    // Pressing quickly: finish the previous flip at once, then start the new one
    this.finishRunning();
    this.commit(direction);

    if (reducedMotion.matches) {
      // Reduce Motion: no 3D turn, just a quick fade
      this.update();
      this.fade();
      return;
    }

    const leaf = this.beginTurn(leafIndex);
    const from = direction > 0 ? 0 : 1;
    this.animate(leaf, from, 1 - from, FLIP_MS, easeInOut);
  }

  // Move to the next/previous position and build the pages that will be uncovered
  commit(direction) {
    this.current += direction;
    this.onChange?.(this.current);
    this.fillFaces();
  }

  // Lift one leaf above the others so it can turn
  beginTurn(leafIndex) {
    const leaf = this.leaves[leafIndex];
    leaf.el.hidden = false;
    leaf.el.style.zIndex = this.zTurning;
    leaf.el.style.visibility = 'visible';
    leaf.el.style.willChange = 'transform'; // only the turning leaf gets its own GPU layer
    return leaf;
  }

  // Turn a leaf from one progress value to another, then settle everything
  animate(leaf, from, to, ms, ease) {
    const startTime = performance.now();
    const step = (now) => {
      const t = ms > 0 ? Math.min((now - startTime) / ms, 1) : 1;
      this.setProgress(leaf, from + (to - from) * ease(t));
      if (t < 1) {
        this.running.frame = requestAnimationFrame(step);
      } else {
        this.running = null;
        this.update();
      }
    };
    this.running = { frame: requestAnimationFrame(step) };
  }

  fade() {
    this.el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }

  // ---------- Dragging with a finger or mouse ----------
  //
  // Computer: grab the right page to turn forward, the left page to turn back.
  // Phone: drag left to turn forward, right to turn back.
  // The page follows the finger; on release it finishes turning if it's past
  // halfway or you flicked it, otherwise it springs back.

  onPointerDown = (event) => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.gesture) {
      if (this.gesture.dir) return; // already turning a page
      this.endGesture(); // a press whose release we never saw (e.g. mouse let go outside the window)
    }

    const rect = this.el.getBoundingClientRect();
    this.gesture = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      onLeftHalf: event.clientX < rect.left + rect.width / 2,
      pageWidth: this.single ? rect.width : rect.width / 2,
      dir: 0, // +1 forward, -1 back, 0 = not dragging yet
      samples: [],
    };
    addEventListener('pointermove', this.onPointerMove, { passive: false });
    addEventListener('pointerup', this.onPointerUp);
    addEventListener('pointercancel', this.onPointerCancel);
  };

  onPointerMove = (event) => {
    const g = this.gesture;
    if (!g || event.pointerId !== g.id) return;
    const dx = event.clientX - g.x0;
    const dy = event.clientY - g.y0;

    if (!g.dir) {
      if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return;
      // Mostly up/down: not a page turn
      if (Math.abs(dy) > Math.abs(dx)) return this.endGesture();

      const dir = this.single ? (dx < 0 ? 1 : -1) : (g.onLeftHalf ? -1 : 1);
      // On a computer, moving the "wrong" way (e.g. right page dragged right) isn't a page turn
      if (Math.sign(dx) !== -dir) return this.endGesture();
      if (dir > 0 ? !this.canNext : !this.canPrev) return this.endGesture();

      g.dir = dir;
      this.finishRunning();
      if (!reducedMotion.matches) {
        g.leaf = this.beginTurn(dir > 0 ? this.current : this.current - 1);
      }
      this.el.classList.add('is-dragging');
      try { this.el.setPointerCapture(g.id); } catch { /* pointer already gone */ }
    }

    event.preventDefault();
    g.dx = dx;
    g.samples.push({ x: event.clientX, t: event.timeStamp });
    while (g.samples.length > 2 && event.timeStamp - g.samples[0].t > FLICK_WINDOW_MS) g.samples.shift();

    if (g.leaf) this.setProgress(g.leaf, this.dragProgress(g));
  };

  // 0 = flat on the right, 1 = flat on the left. Dragging one page width turns the page fully on
  // a phone; on a computer the finger has further to travel (right page → left page).
  dragProgress(g) {
    const distance = this.single ? g.pageWidth : g.pageWidth * 1.5;
    const turned = clamp((-g.dir * g.dx) / distance, 0, 1);
    return g.dir > 0 ? turned : 1 - turned;
  }

  onPointerUp = (event) => {
    const g = this.gesture;
    if (!g || event.pointerId !== g.id) return;
    this.endGesture();
    if (!g.dir) return; // it was a tap, not a drag
    this.dragEndedAt = event.timeStamp;

    const speed = flickSpeed(g, event.timeStamp);
    const distance = -g.dir * g.dx; // how far the finger moved in the turning direction

    if (!g.leaf) {
      // Reduce Motion: a simple swipe, no 3D
      if (distance > 50 || (distance > 0 && speed > SWIPE_SPEED)) {
        this.commit(g.dir);
        this.update();
        this.fade();
      }
      return;
    }

    const progress = this.dragProgress(g);
    const amountTurned = g.dir > 0 ? progress : 1 - progress;
    const finish = speed > SWIPE_SPEED || (amountTurned >= 0.5 && speed > -SWIPE_SPEED);

    if (finish) {
      this.commit(g.dir);
      const target = g.dir > 0 ? 1 : 0;
      this.animate(g.leaf, progress, target, settleTime(1 - amountTurned), easeOut);
    } else {
      this.springBack(g);
    }
  };

  // The browser took over the touch (e.g. to scroll): put the page back
  onPointerCancel = (event) => {
    const g = this.gesture;
    if (!g || event.pointerId !== g.id) return;
    this.endGesture();
    if (g.leaf) this.springBack(g);
  };

  springBack(g) {
    const progress = this.dragProgress(g);
    const amountTurned = g.dir > 0 ? progress : 1 - progress;
    this.animate(g.leaf, progress, g.dir > 0 ? 0 : 1, settleTime(amountTurned), easeOut);
  }

  onClickCapture = (event) => {
    if (this.dragEndedAt === undefined) return;
    const sinceDrag = event.timeStamp - this.dragEndedAt;
    this.dragEndedAt = undefined;
    if (sinceDrag >= 0 && sinceDrag < CLICK_AFTER_DRAG_MS) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  endGesture() {
    removeEventListener('pointermove', this.onPointerMove);
    removeEventListener('pointerup', this.onPointerUp);
    removeEventListener('pointercancel', this.onPointerCancel);
    this.el.classList.remove('is-dragging');
    this.gesture = null;
  }

  finishRunning() {
    if (!this.running) return;
    cancelAnimationFrame(this.running.frame);
    this.running = null;
    this.update();
  }

  // progress 0 = flat on the right, 1 = flat on the left
  setProgress(leaf, progress) {
    leaf.el.style.transform = `rotateY(${-180 * progress}deg)`;

    // The page darkens near the spine as it lifts, and catches a shine on the way over
    leaf.frontShade.style.opacity = progress < 0.5 ? progress * 1.2 : 0;
    leaf.backShade.style.opacity = progress > 0.5 ? (1 - progress) * 1.2 : 0;

    // Shadow on the page being uncovered (right side early, left side late)
    const lift = Math.sin(Math.PI * progress);
    this.shadowRight.style.opacity = lift * (1 - progress);
    this.shadowLeft.style.opacity = this.single ? 0 : lift * progress;
  }

  // Leaves current-2 … current+1 can be seen during a flip in either direction
  isNear(i) {
    return i >= this.current - 2 && i <= this.current + 1;
  }

  // Put every leaf in its resting place, stacked in the right order
  update() {
    this.fillFaces();
    this.leaves.forEach((leaf, i) => {
      const turned = i < this.current;
      // Far-away leaves are fully covered, so skip drawing them (keeps big binders fast)
      leaf.el.hidden = !this.isNear(i);
      leaf.el.style.transform = turned ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      leaf.el.style.willChange = '';
      // Right side: lower leaves on top. Left side: higher leaves on top.
      leaf.el.style.zIndex = turned ? 10 + i : 10 + this.leafCount - i;
      // On phones, turned leaves are off-screen to the left, so hide them
      leaf.el.style.visibility = this.single && turned ? 'hidden' : 'visible';
      leaf.frontShade.style.opacity = 0;
      leaf.backShade.style.opacity = 0;

      // Only the faces you can actually see are readable by VoiceOver / keyboard
      const frontShown = i === this.current;
      const backShown = !this.single && i === this.current - 1;
      setInert(leaf.front, !frontShown);
      setInert(leaf.back, !backShown);
    });
    this.shadowLeft.style.opacity = this.shadowRight.style.opacity = 0;
  }

  // Only build page content near the current position, so big binders stay fast
  fillFaces() {
    this.leaves.forEach((leaf, i) => {
      const near = this.isNear(i);
      if (near && !leaf.filled) {
        leaf.front.prepend(this.renderFace(i, 'front'));
        leaf.back.prepend(this.renderFace(i, 'back'));
        leaf.filled = true;
      } else if (!near && leaf.filled) {
        leaf.front.querySelector('.page')?.remove();
        leaf.back.querySelector('.page')?.remove();
        leaf.filled = false;
      }
    });
  }

  destroy() {
    this.endGesture();
    this.finishRunning();
    this.el.remove();
  }
}

function setInert(el, hidden) {
  el.inert = hidden;
  el.toggleAttribute('aria-hidden', hidden);
}

function makeDiv(className) {
  const el = document.createElement('div');
  el.className = className;
  return el;
}

// How fast the finger was moving in the turning direction just before release (px per ms).
// Holding still before letting go counts as zero, so a stop-then-release isn't a flick.
function flickSpeed(g, releaseTime) {
  const first = g.samples[0];
  const last = g.samples[g.samples.length - 1];
  if (!first || releaseTime - last.t > FLICK_WINDOW_MS) return 0;
  const dt = last.t - first.t;
  return dt > 0 ? (-g.dir * (last.x - first.x)) / dt : 0;
}

// Shorter animation when there's less of the turn left to do
function settleTime(fraction) {
  return Math.max(140, FLIP_MS * 0.8 * fraction);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
