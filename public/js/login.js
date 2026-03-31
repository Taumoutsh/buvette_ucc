const API = '';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Erreur de connexion';
      errorEl.hidden = false;
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/';
  } catch {
    errorEl.textContent = 'Erreur réseau';
    errorEl.hidden = false;
  }
});

// Redirect if already logged in
(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch(`${API}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) window.location.href = '/';
    } catch {}
  }
})();
