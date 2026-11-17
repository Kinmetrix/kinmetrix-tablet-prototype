document.getElementById('theme')?.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  const btn = document.querySelector('#theme');
  if (btn) btn.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
});