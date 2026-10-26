// The 3D page-turning engine.
//
// A binder is a stack of "leaves" (sheets). Each leaf has a front face and a
// back face and turns around the spine, like a real binder sheet.
// `current` = how many leaves have been turned to the left side.
//
// Computer (two-page) mode: every leaf holds two pages, front and back.
// Phone (single) mode: every leaf holds one page; turned leaves move off-screen.

const FLIP_MS = 650;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export class PageFlip {
  constructor(container, { leafCount, renderFace, single = false, start = 0, coverColor, onChange }) {
    this.leafCount = leafCount;
    this.renderFace = renderFace; // (leafIndex, 'front' | 'back') => Element
    this.single = single;
    this.onChange = onChange;
    // Phones stop at the last page; computers can turn the last leaf to show the back cover
    this.maxCurrent = single ? leafCount - 1 : leafCount;
    this.current = clamp(start, 0, this.maxCurrent);
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
      this.leaves.push({
        el: leaf,
        front: leaf.querySelector('.leaf__face--front'),
        back: leaf.querySelector('.leaf__face--back'),
        filled: false,
      });
      this.el.append(leaf);
    }

    // Shadows that fall on the pages underneath a turning leaf
    this.shadowLeft = makeDiv('book__shadow book__shadow--left');
    this.shadowRight = makeDiv('book__shadow book__shadow--right');
    this.el.append(this.shadowLeft, this.shadowRight);

    const spine = makeDiv('spine');
    spine.setAttribute('aria-hidden', 'true');
    spine.innerHTML = '<span class="ring"></span>'.repeat(3);
    this.el.append(spine);

    container.append(this.el);
    this.fillVisibleFaces();
    this.layout();
  }

  get canNext() { return this.current < this.maxCurrent; }
  get canPrev() { return this.current > 0; }

  next() { if (this.canNext) this.flip(this.current, +1); }
  prev() { if (this.canPrev) this.flip(this.current - 1, -1); }

  flip(leafIndex, direction) {
    // Pressing quickly: finish the previous flip at once, then start the new one
    this.finishRunning();

    this.current += direction;
    this.fillVisibleFaces();
    this.onChange?.(this.current);

    if (reducedMotion.matches) {
      // Reduce Motion: no 3D turn, just a quick fade
      this.layout();
      this.el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      return;
    }

    const leaf = this.leaves[leafIndex];
    const from = direction > 0 ? 0 : 1;
    const to = 1 - from;

    // The turning leaf goes on top of everything except the spine
    leaf.el.style.zIndex = 2 * this.leafCount + 20;
    leaf.el.style.visibility = 'visible';
    this.shadowLeft.style.zIndex = this.shadowRight.style.zIndex = 2 * this.leafCount + 19;

    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / FLIP_MS, 1);
      this.setProgress(leaf, from + (to - from) * easeInOut(t));
      if (t < 1) {
        this.running.frame = requestAnimationFrame(step);
      } else {
        this.running = null;
        this.layout();
      }
    };
    this.running = { frame: requestAnimationFrame(step) };
  }

  finishRunning() {
    if (!this.running) return;
    cancelAnimationFrame(this.running.frame);
    this.running = null;
    this.layout();
  }

  // progress 0 = flat on the right, 1 = flat on the left
  setProgress(leaf, progress) {
    leaf.el.style.transform = `rotateY(${-180 * progress}deg)`;

    // The page darkens near the spine as it lifts, and catches a shine on the way over
    const lift = Math.sin(Math.PI * progress);
    leaf.front.querySelector('.leaf__shade').style.opacity = progress < 0.5 ? progress * 1.2 : 0;
    leaf.back.querySelector('.leaf__shade').style.opacity = progress > 0.5 ? (1 - progress) * 1.2 : 0;

    // Shadow on the page being uncovered (right side early, left side late)
    this.shadowRight.style.opacity = lift * (1 - progress);
    this.shadowLeft.style.opacity = this.single ? 0 : lift * progress;
  }

  // Put every leaf in its resting place and stack them in the right order
  layout() {
    this.leaves.forEach((leaf, i) => {
      const turned = i < this.current;
      leaf.el.style.transform = turned ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      // Right side: lower leaves on top. Left side: higher leaves on top.
      leaf.el.style.zIndex = turned ? 10 + i : 10 + this.leafCount - i;
      // On phones, turned leaves are off-screen to the left, so hide them
      leaf.el.style.visibility = this.single && turned ? 'hidden' : 'visible';
      leaf.front.querySelector('.leaf__shade').style.opacity = 0;
      leaf.back.querySelector('.leaf__shade').style.opacity = 0;
    });
    this.shadowLeft.style.opacity = this.shadowRight.style.opacity = 0;
  }

  // Only build page content near the current position, so big binders stay fast.
  // Leaves current-2 … current+1 can be seen during a flip in either direction.
  fillVisibleFaces() {
    this.leaves.forEach((leaf, i) => {
      const near = i >= this.current - 2 && i <= this.current + 1;
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

function makeDiv(className) {
  const el = document.createElement('div');
  el.className = className;
  return el;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
