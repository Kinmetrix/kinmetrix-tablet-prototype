(function () {
  const STORAGE_KEY = 'kinmetrix-prototype-v0';
  const DEBUG_OPEN_KEY = 'kinmetrix-prototype-debug-open';
  const COMPARE_OPEN_KEY = 'kinmetrix-prototype-compare-ios';

  const CHART_FILES = {
    line: 'assets/charts/line.svg',
    bar: 'assets/charts/bar.svg',
    radial: 'assets/charts/radial.svg',
    'radial-multi': 'assets/charts/radial-multi.svg',
    'radial-body': 'assets/charts/radial-body.svg',
    'force-multi': 'assets/charts/force-multi.svg',
    'historical-multi': 'assets/charts/historical-multi.svg',
  };

  function currentSlug() {
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    return file && file !== 'index' ? file : '';
  }

  window.KinPrototype = {
    loadState() {
      try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      } catch {
        return {};
      }
    },
    saveState(patch) {
      const next = { ...this.loadState(), ...patch };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    },
    mountCharts(root) {
      const scope = root || document;
      scope.querySelectorAll('[data-chart]').forEach((host) => {
        const kind = host.getAttribute('data-chart');
        const file = CHART_FILES[kind];
        if (!file || host.dataset.chartMounted === '1') return;
        const img = document.createElement('img');
        img.className = 'proto-chart__img';
        img.src = file;
        img.alt = host.getAttribute('data-chart-label') || `${kind} chart`;
        img.loading = 'lazy';
        host.dataset.chartMounted = '1';
        host.appendChild(img);
      });
    },
    fitPrototypeStage() {
      if (document.body.classList.contains('proto-capture')) return;
      const stage = document.querySelector('.proto-stage');
      const viewport = document.querySelector('.proto-stage__viewport');
      const fit = document.querySelector('.proto-stage__fit');
      if (!stage || !viewport || !fit) return;
      const gap = 12;
      const compareOpen = document.body.classList.contains('proto-compare-open');
      const paneCount = compareOpen ? 2 : 1;
      const needW = 1180 * paneCount + (compareOpen ? gap : 0);
      const needH = 820;
      const availW = stage.clientWidth;
      const availH = stage.clientHeight;
      if (availW < 1 || availH < 1) return;
      const scale = Math.min(1, availW / needW, availH / needH);
      fit.style.transform = `scale(${scale})`;
      viewport.style.width = `${needW * scale}px`;
      viewport.style.height = `${needH * scale}px`;
    },
    setDebugOpen(open) {
      document.body.classList.toggle('proto-debug-open', open);
      sessionStorage.setItem(DEBUG_OPEN_KEY, open ? '1' : '0');
      const panel = document.getElementById('proto-debug-panel');
      const toggle = document.getElementById('proto-debug-toggle');
      if (panel) panel.hidden = !open;
      if (toggle) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.classList.toggle('is-active', open);
      }
      // Overlay only — do not reflow the tablet canvas.
    },
    setCompareOpen(open) {
      document.body.classList.toggle('proto-compare-open', open);
      sessionStorage.setItem(COMPARE_OPEN_KEY, open ? '1' : '0');
      const panel = document.getElementById('proto-compare');
      const toggle = document.getElementById('proto-compare-toggle');
      if (panel) panel.hidden = !open;
      if (toggle) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.classList.toggle('is-active', open);
      }
      requestAnimationFrame(() => window.KinPrototype.fitPrototypeStage());
    },
    mountDebugChrome() {
      if (document.body.getAttribute('data-enriched') !== 'true') return;
      if (document.getElementById('proto-statusbar')) return;

      const frame = document.querySelector('.device-frame');
      if (!frame) return;

      const slug = currentSlug();
      const route = document.body.getAttribute('data-route') || slug;
      const titleEl = frame.querySelector('.screen-header h1');
      const title = titleEl ? titleEl.textContent.trim() : route;

      const shell = document.createElement('div');
      shell.className = 'proto-shell';

      const status = document.createElement('header');
      status.id = 'proto-statusbar';
      status.className = 'proto-statusbar';
      status.innerHTML = `
        <div class="proto-statusbar__left">
          <a class="proto-statusbar__link" href="index.html">Index</a>
          <span class="proto-statusbar__sep" aria-hidden="true">/</span>
          <span class="proto-statusbar__route" title="${title}">${slug || route}</span>
        </div>
        <div class="proto-statusbar__right">
          <button type="button" id="proto-debug-toggle" class="proto-statusbar__btn" aria-expanded="false" aria-controls="proto-debug-panel">Debug</button>
          <button type="button" id="proto-compare-toggle" class="proto-statusbar__btn" aria-expanded="false" aria-controls="proto-compare">iOS</button>
        </div>
      `;

      const panel = document.createElement('aside');
      panel.id = 'proto-debug-panel';
      panel.className = 'proto-debug-panel';
      panel.hidden = true;
      panel.setAttribute('aria-label', 'Prototype debug');

      const header = frame.querySelector(':scope > header.screen-header');
      const flowNavs = frame.querySelectorAll(':scope .flow-nav');
      if (header) panel.appendChild(header);
      flowNavs.forEach((nav) => panel.appendChild(nav));

      const panelHead = document.createElement('div');
      panelHead.className = 'proto-debug-panel__head';
      const panelTitle = document.createElement('strong');
      panelTitle.textContent = 'Prototype debug';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'proto-debug-panel__close';
      close.textContent = 'Close';
      close.addEventListener('click', () => window.KinPrototype.setDebugOpen(false));
      panelHead.appendChild(panelTitle);
      panelHead.appendChild(close);
      panel.insertBefore(panelHead, panel.firstChild);

      const stage = document.createElement('div');
      stage.className = 'proto-stage';
      const viewport = document.createElement('div');
      viewport.className = 'proto-stage__viewport';
      const fit = document.createElement('div');
      fit.className = 'proto-stage__fit';

      const compare = document.createElement('aside');
      compare.id = 'proto-compare';
      compare.className = 'proto-compare';
      compare.hidden = true;
      compare.setAttribute('aria-label', 'iOS screenshot compare');
      compare.innerHTML = `
        <div class="proto-compare__head">
          <strong>iOS</strong>
          <span class="proto-compare__slug">${slug || '—'}</span>
        </div>
        <div class="proto-compare__body">
          <img class="proto-compare__img" alt="" hidden />
          <p class="proto-compare__missing" hidden>No iOS capture yet for <code></code>. Capture with <code>yarn visual:rn ${slug || '&lt;slug&gt;'}</code>.</p>
        </div>
      `;

      const parent = frame.parentNode;
      parent.insertBefore(shell, frame);
      // Fixed chrome — not in the flex flow that sizes the tablet.
      document.body.appendChild(status);
      document.body.appendChild(panel);
      shell.appendChild(stage);
      stage.appendChild(viewport);
      viewport.appendChild(fit);
      fit.appendChild(frame);
      fit.appendChild(compare);

      const img = compare.querySelector('.proto-compare__img');
      const missing = compare.querySelector('.proto-compare__missing');
      const missingCode = missing.querySelector('code');
      if (slug) {
        missingCode.textContent = slug;
        const src = `visual-compare/rn/${slug}.png`;
        img.alt = `${slug} iOS`;
        img.onload = () => {
          img.hidden = false;
          missing.hidden = true;
          window.KinPrototype.fitPrototypeStage();
        };
        img.onerror = () => {
          img.hidden = true;
          missing.hidden = false;
          window.KinPrototype.fitPrototypeStage();
        };
        img.src = src;
      } else {
        missing.hidden = false;
      }

      const debugToggle = document.getElementById('proto-debug-toggle');
      const compareToggle = document.getElementById('proto-compare-toggle');
      debugToggle.addEventListener('click', () => {
        window.KinPrototype.setDebugOpen(!document.body.classList.contains('proto-debug-open'));
      });
      compareToggle.addEventListener('click', () => {
        window.KinPrototype.setCompareOpen(!document.body.classList.contains('proto-compare-open'));
      });

      window.addEventListener('resize', () => window.KinPrototype.fitPrototypeStage());

      const qs = new URLSearchParams(window.location.search);
      const debugOpen = qs.get('debug') === '1' || sessionStorage.getItem(DEBUG_OPEN_KEY) === '1';
      const compareOpen =
        qs.get('compare') === '1' || sessionStorage.getItem(COMPARE_OPEN_KEY) === '1';
      window.KinPrototype.setDebugOpen(debugOpen);
      window.KinPrototype.setCompareOpen(compareOpen);
      requestAnimationFrame(() => window.KinPrototype.fitPrototypeStage());
    },
    mountAvatars(root) {
      const scope = root || document;
      scope.querySelectorAll('[data-default-avatar]').forEach((el) => {
        if (el.dataset.avatarMounted === '1') return;
        const img = document.createElement('img');
        img.src = 'assets/default-profile.svg';
        img.alt = el.getAttribute('data-default-avatar') || 'Profile';
        img.className = 'proto-avatar__img';
        img.width = Number(el.getAttribute('data-avatar-size')) || 48;
        img.height = Number(el.getAttribute('data-avatar-size')) || 48;
        el.replaceChildren(img);
        el.classList.add('proto-avatar');
        el.dataset.avatarMounted = '1';
      });
    },
    mountIndexGallery() {
      if (document.body.getAttribute('data-index') !== 'true') return;

      const peek = document.getElementById('index-peek');
      const peekLabel = peek?.querySelector('.index-peek__label');
      const peekImg = peek?.querySelector('.index-peek__img');
      const lightbox = document.getElementById('index-lightbox');
      const lbTitle = lightbox?.querySelector('.index-lightbox__title');
      const lbImg = lightbox?.querySelector('.index-lightbox__img');
      const lbTabs = lightbox?.querySelector('.index-lightbox__tabs');
      const lbClose = lightbox?.querySelector('.index-lightbox__close');
      if (!peek || !peekLabel || !peekImg || !lightbox || !lbTitle || !lbImg || !lbTabs || !lbClose) return;

      let activeRow = null;
      let activeKind = 'iOS';

      const hidePeek = () => {
        peek.hidden = true;
      };

      const placePeek = (clientX, clientY) => {
        const pad = 16;
        const rect = peek.getBoundingClientRect();
        let left = clientX + 18;
        let top = clientY + 18;
        if (left + rect.width > window.innerWidth - pad) left = clientX - rect.width - 18;
        if (top + rect.height > window.innerHeight - pad) top = clientY - rect.height - 18;
        peek.style.left = `${Math.max(pad, left)}px`;
        peek.style.top = `${Math.max(pad, top)}px`;
      };

      const showPeek = (btn, clientX, clientY) => {
        if (!lightbox.hidden) return;
        const src = btn.getAttribute('data-preview-src');
        const kind = btn.getAttribute('data-preview-kind') || '';
        const slug = btn.getAttribute('data-preview-slug') || '';
        if (!src) return;
        peek.dataset.kind = kind;
        peekLabel.textContent = `${slug} · ${kind}`;
        peekImg.src = src;
        peek.hidden = false;
        placePeek(clientX, clientY);
      };

      const lbPanel = lightbox.querySelector('.index-lightbox__panel');

      const setLightboxAsset = (src, kind, title, slug) => {
        activeKind = kind;
        if (lbPanel) lbPanel.dataset.kind = kind;
        lbTitle.textContent = `${title} · ${kind}`;
        lbImg.src = src;
        lbImg.alt = `${slug} ${kind}`;
        lbTabs.querySelectorAll('.index-lightbox__tab').forEach((tab) => {
          tab.setAttribute('aria-selected', tab.dataset.kind === kind ? 'true' : 'false');
        });
      };

      const openLightbox = (row, kind, src) => {
        activeRow = row;
        const title = row.getAttribute('data-title') || row.getAttribute('data-slug') || '';
        const slug = row.getAttribute('data-slug') || '';
        const assets = [
          { kind: 'iOS', src: row.getAttribute('data-rn') || '' },
          { kind: 'HTML', src: row.getAttribute('data-html-shot') || '' },
          { kind: 'Pair', src: row.getAttribute('data-pair') || '' },
        ].filter((a) => a.src);

        lbTabs.replaceChildren();
        assets.forEach((asset) => {
          const tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'index-lightbox__tab';
          tab.dataset.kind = asset.kind;
          tab.textContent = asset.kind;
          tab.addEventListener('click', () => setLightboxAsset(asset.src, asset.kind, title, slug));
          lbTabs.appendChild(tab);
        });

        const initial = assets.find((a) => a.kind === kind) || assets[0];
        if (!initial) return;
        hidePeek();
        lightbox.hidden = false;
        setLightboxAsset(initial.src, initial.kind, title, slug);
        lbClose.focus();
      };

      const closeLightbox = () => {
        lightbox.hidden = true;
        activeRow = null;
      };

      document.querySelectorAll('.index-thumb').forEach((btn) => {
        btn.addEventListener('mouseenter', (e) => showPeek(btn, e.clientX, e.clientY));
        btn.addEventListener('mousemove', (e) => {
          if (!peek.hidden) placePeek(e.clientX, e.clientY);
        });
        btn.addEventListener('mouseleave', hidePeek);
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          if (!row) return;
          openLightbox(row, btn.getAttribute('data-preview-kind') || 'iOS', btn.getAttribute('data-preview-src'));
        });
      });

      lbClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
      });
    },
  };

  function onReady() {
    window.KinPrototype.mountDebugChrome();
    window.KinPrototype.mountCharts();
    window.KinPrototype.mountAvatars();
    window.KinPrototype.mountIndexGallery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
