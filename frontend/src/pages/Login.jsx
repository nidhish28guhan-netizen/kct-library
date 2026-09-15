import React, { useState } from 'react';
import { useAuth } from '../auth';
import { ErrorBanner } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setId] = useState('');
  const [password, setPw] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(identifier, password);
      nav('/');
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="wordmark">CLMS</div>
        <div className="wordmark-rule" />
        <p className="subtitle">College Library Management System<br />24CSI015 · Software Engineering with Agile Practices</p>
        <h2>Sign in</h2>
        <ErrorBanner error={error} />
        <label className="field">
          <span className="field-label">Username or roll number</span>
          <input type="text" value={identifier} onChange={(e) => setId(e.target.value)}
            placeholder="e.g. librarian1 or CSE2201" autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" value={password} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        </label>
        <button className="btn" style={{ width: '100%' }} disabled={busy || !identifier}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
        <p className="login-foot">Access is controlled by your assigned role.</p>
      </form>
    </div>
  );
}
