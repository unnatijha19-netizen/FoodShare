
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('foodshare-token', data.token);
      localStorage.setItem('foodshare-user', JSON.stringify(data.user));

      if (data.user.role === 'donor') {
  navigate('/donor-dashboard');
} else if (data.user.role === 'ngo') {
  navigate('/ngo-dashboard');
} else {
  setError('Invalid user role. Please contact support.');
}
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Server se connect nahi ho paaya.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">FoodShare</Link>

        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>Login to your account</h1>

        <p className="auth-subtitle">
          Sign in to continue sharing food and helping your community.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="forgot-password-row">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {error && (
            <p className="auth-error" role="alert">{error}</p>
          )}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>

        <Link to="/" className="auth-home">← Back to homepage</Link>
      </section>
    </main>
  );
}