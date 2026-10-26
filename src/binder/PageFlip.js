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
  }

  get canNext() { return this.current < this.maxCurrent; }
  get canPrev() { return this.current > 0; }

  next() { if (this.canNext) this.flip(this.current, +1); }
  prev() { if (this.canPrev) this.flip(this.current - 1, -1); }

  flip(leafIndex, direction) {
    // Pressing quickly: finish the previous flip at once, then start the new one
    this.finishRunning();

    this.current += direction;
    this.onChange?.(this.current);

    if (reducedMotion.matches) {
      // Reduce Motion: no 3D turn, just a quick fade
      this.update();
      this.el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      return;
    }

    // Build the pages that the turn will uncover, but keep everything else where it was
    this.fillFaces();

    const leaf = this.leaves[leafIndex];
    const from = direction > 0 ? 0 : 1;
    const to = 1 - from;

    leaf.el.hidden = false;
    leaf.el.style.zIndex = this.zTurning;
    leaf.el.style.visibility = 'visible';
    leaf.el.style.willChange = 'transform'; // only the turning leaf gets its own GPU layer

    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / FLIP_MS, 1);
      this.setProgress(leaf, from + (to - from) * easeInOut(t));
      if (t < 1) {
        this.running.frame = requestAnimationFrame(step);
      } else {
        this.running = null;
        this.update();
      }
    };
    this.running = { frame: requestAnimationFrame(step) };
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

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
