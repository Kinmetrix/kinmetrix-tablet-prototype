(function () {
  const STORAGE_KEY = 'kinmetrix-prototype-v0';
  const DEBUG_OPEN_KEY = 'kinmetrix-prototype-debug-open';

  const CHART_FILES = {
    line: 'assets/charts/line.svg',
    bar: 'assets/charts/bar.svg',
    radial: 'assets/charts/radial.svg',
    'radial-multi': 'assets/charts/radial-multi.svg',
  };

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
    setDebugOpen(open) {
      document.body.classList.toggle('proto-debug-open', open);
      sessionStorage.setItem(DEBUG_OPEN_KEY, open ? '1' : '0');
      const panel = document.getElementById('proto-debug-panel');
      const toggle = document.getElementById('proto-debug-toggle');
      if (panel) panel.hidden = !open;
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    },
    mountDebugChrome() {
      if (document.body.getAttribute('data-enriched') !== 'true') return;
      if (document.getElementById('proto-debug-toggle')) return;

      const frame = document.querySelector('.device-frame');
      if (!frame) return;

      const panel = document.createElement('aside');
      panel.id = 'proto-debug-panel';
      panel.className = 'proto-debug-panel';
      panel.hidden = true;
      panel.setAttribute('aria-label', 'Prototype debug');

      const header = frame.querySelector(':scope > header.screen-header');
      const flowNavs = frame.querySelectorAll(':scope .flow-nav');
      if (header) panel.appendChild(header);
      flowNavs.forEach((nav) => panel.appendChild(nav));

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.id = 'proto-debug-toggle';
      toggle.className = 'proto-debug-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'proto-debug-panel');
      toggle.textContent = 'Debug';

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'proto-debug-panel__close';
      close.textContent = 'Close';
      close.addEventListener('click', () => window.KinPrototype.setDebugOpen(false));

      const panelHead = document.createElement('div');
      panelHead.className = 'proto-debug-panel__head';
      const panelTitle = document.createElement('strong');
      panelTitle.textContent = 'Prototype debug';
      panelHead.appendChild(panelTitle);
      panelHead.appendChild(close);
      panel.insertBefore(panelHead, panel.firstChild);

      frame.appendChild(toggle);
      frame.appendChild(panel);

      toggle.addEventListener('click', () => {
        const open = !document.body.classList.contains('proto-debug-open');
        window.KinPrototype.setDebugOpen(open);
      });

      const qs = new URLSearchParams(window.location.search);
      const open = qs.get('debug') === '1' || sessionStorage.getItem(DEBUG_OPEN_KEY) === '1';
      window.KinPrototype.setDebugOpen(open);
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
  };

  function onReady() {
    window.KinPrototype.mountDebugChrome();
    window.KinPrototype.mountCharts();
    window.KinPrototype.mountAvatars();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
