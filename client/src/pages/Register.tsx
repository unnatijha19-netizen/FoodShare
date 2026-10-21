
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'donor' | 'ngo'>('donor');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password kam se kam 8 characters ka hona chahiye.');
      return;
    }

    if (role === 'ngo' && !organizationName.trim()) {
      setError('NGO ka naam enter karo.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone,
          organizationName: role === 'ngo' ? organizationName : '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      navigate('/login', {
        state: { message: 'Account created successfully. Please log in.' },
      });
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
        <p className="auth-eyebrow">JOIN OUR COMMUNITY</p>
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Join us to rescue surplus food and support your community.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label htmlFor="role">I want to register as</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'donor' | 'ngo')}
          >
            <option value="donor">Food Donor</option>
            <option value="ngo">NGO / Organization</option>
          </select>

          {role === 'ngo' && (
            <>
              <label htmlFor="organization">Organization name</label>
              <input
                id="organization"
                type="text"
                placeholder="Enter NGO name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="phone">Phone number (optional)</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        <Link to="/" className="auth-home">← Back to homepage</Link>
      </section>
    </main>
  );
}
