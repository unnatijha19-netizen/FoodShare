
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import '../auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        'http://https://foodshare-backend-jymm.onrender.com/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
      }

      setMessage(data.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">FoodShare</Link>
        <p className="auth-eyebrow">ACCOUNT RECOVERY</p>
        <h1>Forgot password?</h1>
        <p className="auth-subtitle">
          Enter your registered email address. If your account exists,
          we will send you a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Login</Link>
        </p>
        <Link to="/" className="auth-home">← Back to homepage</Link>
      </section>
    </main>
  );
}
