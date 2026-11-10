(function () {
  const STORAGE_KEY = 'kinmetrix-prototype-v0';

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
  };
})();
