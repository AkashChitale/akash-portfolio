// Runs before paint. Storage can be unavailable in private or restricted contexts.
try {
  const preference = localStorage.getItem('akash-theme');
  if (preference === 'light' || preference === 'dark') document.documentElement.dataset.theme = preference;
} catch { /* CSS follows the device preference. */ }
