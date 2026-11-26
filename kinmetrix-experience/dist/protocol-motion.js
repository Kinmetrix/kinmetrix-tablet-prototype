/* Spring thumb sync for assessment protocol segmented controls. */
(function () {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const segIndex = new Map();
  const running = new Set();
  let raf = 0;
  let lastTime = 0;

  function loop(t) {
    const dt = lastTime ? Math.min(0.064, (t - lastTime) / 1000) : 1 / 60;
    lastTime = t;
    for (const s of running) s.step(dt);
    if (running.size) raf = requestAnimationFrame(loop);
    else {
      raf = 0;
      lastTime = 0;
    }
  }

  class Spring {
    constructor(value, onUpdate, {damping = 1, response = 0.35, precision = 0.001} = {}) {
      Object.assign(this, {value, target: value, velocity: 0, onUpdate, damping, response, precision});
      onUpdate(value);
    }
    to(target, opts = {}) {
      this.target = target;
      if (opts.velocity !== undefined) this.velocity = opts.velocity;
      if (opts.damping !== undefined) this.damping = opts.damping;
      if (opts.response !== undefined) this.response = opts.response;
      if (reduceMotion.matches) return this.set(target);
      running.add(this);
      if (!raf) raf = requestAnimationFrame(loop);
    }
    set(value) {
      this.value = this.target = value;
      this.velocity = 0;
      running.delete(this);
      this.onUpdate(value);
    }
    step(dt) {
      const k = (2 * Math.PI / this.response) ** 2;
      const c = (4 * Math.PI * this.damping) / this.response;
      const n = Math.ceil(dt * 240);
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        this.velocity += (-k * (this.value - this.target) - c * this.velocity) * h;
        this.value += this.velocity * h;
      }
      if (Math.abs(this.value - this.target) < this.precision && Math.abs(this.velocity) < this.precision * 10) {
        this.value = this.target;
        this.velocity = 0;
        running.delete(this);
      }
      this.onUpdate(this.value);
    }
  }

  function segKey(el) {
    return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.className;
  }

  function activeIndex(el) {
    const buttons = [...el.querySelectorAll(':scope > button')];
    return Math.max(0, buttons.findIndex((b) => b.classList.contains('active')));
  }

  function bindSeg(el) {
    const thumb = el.querySelector(':scope > .seg-thumb');
    const buttons = [...el.querySelectorAll(':scope > button')];
    if (!thumb || !buttons.length) return;
    el.style.setProperty('--n', String(buttons.length));
    const key = segKey(el);
    const index = activeIndex(el);
    const from = segIndex.has(key) ? segIndex.get(key) : index;
    segIndex.set(key, index);
    const spring = new Spring(from, (v) => {
      thumb.style.transform = `translateX(${v * 100}%)`;
    });
    spring.to(index);
  }

  function initAssessmentProtocolMotion() {
    const root = document.querySelector('.assessment-protocol-form');
    if (!root) return;
    root.querySelectorAll('.seg').forEach(bindSeg);
  }

  window.initAssessmentProtocolMotion = initAssessmentProtocolMotion;

  let hookTimer = 0;
  function scheduleInit() {
    clearTimeout(hookTimer);
    hookTimer = setTimeout(initAssessmentProtocolMotion, 0);
  }

  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(scheduleInit).observe(app, {childList: true, subtree: true});
    scheduleInit();
  }
})();