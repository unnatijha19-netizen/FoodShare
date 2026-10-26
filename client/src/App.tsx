import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import socket from './socket'
import LocationPicker, { type SelectedLocation } from './components/LocationPicker'
import './style.css'

type Donation = {
  id: string
  foodName: string
  quantity: string
  unit: string
  foodType: string
  bestBefore: string
  location: string
  phone: string
  details: string
  donor: string
  latitude: number | null
  longitude: number | null
}

type StoredUser = {
  id?: string
  _id?: string
  name?: string
  email?: string
  role?: string
}

const API_URL = 'http://localhost:5000/api/donations'

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('foodshare-token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getStoredUser(): StoredUser | null {
  try {
    const user = localStorage.getItem('foodshare-user')
    return user ? (JSON.parse(user) as StoredUser) : null
  } catch {
    return null
  }
}

function mapDonation(item: any): Donation {
  return {
    id: String(item._id ?? item.id ?? ''),
    foodName: item.foodName ?? '',
    quantity: String(item.quantity ?? ''),
    unit: item.unit ?? '',
    foodType: item.foodType ?? '',
    bestBefore: item.bestBefore
      ? String(item.bestBefore).slice(0, 10)
      : '',
    location: item.location ?? '',
    phone: item.phone ?? '',
    details: item.details ?? '',
    donor: String(
      item.donor?._id ??
        item.donor ??
        item.user?._id ??
        item.user ??
        ''
    ),
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null,
  }
}

const steps = [
  {
    number: '01',
    title: 'Share your food',
    description: 'List surplus food that is fresh, safe, and ready to share.',
    icon: '🥗',
  },
  {
    number: '02',
    title: 'Connect locally',
    description: 'Help nearby people and community organisations find food.',
    icon: '🤝',
  },
  {
    number: '03',
    title: 'Make an impact',
    description: 'Give good food another chance and reduce food waste.',
    icon: '🌱',
  },
]

function App() {
  const navigate = useNavigate()

  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null)
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser())

  const token = localStorage.getItem('foodshare-token')
  const loggedIn = Boolean(token && user)
  const currentUserId = user?.id || user?._id || ''

  useEffect(() => {
    let active = true

    async function loadDonations() {
      const savedToken = localStorage.getItem('foodshare-token')

      if (!savedToken) {
        if (active) {
          setDonations([])
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })

        if (response.status === 401) {
          if (active) {
            setDonations([])
            setLoading(false)
          }
          return
        }

        if (!response.ok) {
          throw new Error('Could not load donations.')
        }

        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Invalid donations response from server.')
        }

        if (active) {
          setDonations(
            data.map(mapDonation).filter((item: Donation) => item.id !== '')
          )
        }
      } catch (err) {
        console.error('Load donations error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDonations()

    const handleDonationsUpdated = () => {
      void loadDonations()
    }

    socket.on('donations:updated', handleDonationsUpdated)

    return () => {
      active = false
      socket.off('donations:updated', handleDonationsUpdated)
    }
  }, [])

  function requireLogin() {
    if (!localStorage.getItem('foodshare-token')) {
      setError('Donation add ya remove karne ke liye pehle login karo.')
      navigate('/login')
      return false
    }
    return true
  }

  async function handleDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!requireLogin()) return

    if (!selectedLocation) {
      setError('Please select the pickup location on the map.')
      return
    }

    setSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      foodName: String(formData.get('foodName') || '').trim(),
      quantity: Number(formData.get('quantity') || 0),
      unit: String(formData.get('unit') || ''),
      foodType: String(formData.get('foodType') || ''),
      bestBefore: String(formData.get('bestBefore') || ''),
      location: String(formData.get('location') || '').trim(),
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      phone: String(formData.get('phone') || '').trim(),
      details: String(formData.get('details') || '').trim(),
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.status === 401) {
        localStorage.removeItem('foodshare-token')
        localStorage.removeItem('foodshare-user')
        setUser(null)
        throw new Error('Your login has expired. Please login again.')
      }

      if (!response.ok) {
        throw new Error(result.message || 'Donation submit nahi hui.')
      }

      const saved = mapDonation(result)

      if (!saved.id) {
        throw new Error('Backend response mein donation ID nahi mili.')
      }

      setDonations((previous) => [
        saved,
        ...previous.filter((item) => item.id !== saved.id),
      ])

      form.reset()
      setSelectedLocation(null)
      setSuccess('Thank you! Your food donation has been added.')
      socket.emit('donations:updated')
    } catch (err) {
      console.error('Donation submit error:', err)
      setError(err instanceof Error ? err.message : 'Donation submit nahi hui.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteDonation(id: string) {
    if (!requireLogin()) return

    const food = donations.find((item) => item.id === id)
    if (!food) return

    if (food.donor && currentUserId && food.donor !== currentUserId) {
      setError('Tum sirf apni donation listing remove kar sakte ho.')
      return
    }

    if (!window.confirm('Remove this donation listing?')) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      const result = await response.json()

      if (response.status === 401) {
        localStorage.removeItem('foodshare-token')
        localStorage.removeItem('foodshare-user')
        setUser(null)
        throw new Error('Your login has expired. Please login again.')
      }

      if (!response.ok) {
        throw new Error(result.message || 'Delete failed.')
      }

      setDonations((previous) => previous.filter((item) => item.id !== id))
      setSuccess('Donation listing removed successfully.')
      socket.emit('donations:updated')
    } catch (err) {
      console.error('Delete donation error:', err)
      setError(err instanceof Error ? err.message : 'Donation delete nahi hui.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('foodshare-token')
    localStorage.removeItem('foodshare-user')
    setUser(null)
    setDonations([])
    setSuccess('You have been logged out successfully.')
    setError('')
  }

  return (
    <div className="site-wrapper">
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">✳</span>
          <span>food<span className="brand-highlight">share</span></span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#mission">Our Mission</a>
          <a href="#how-it-works">How it works</a>
          <a href="#available-food">Available Food</a>
        </nav>

        <div className="navbar-actions">
          {loggedIn ? (
            <>
              <span className="auth-login">Hi, {user?.name || 'User'}</span>
              <button className="auth-register" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="auth-login" to="/login">Login</Link>
              <Link className="auth-register" to="/register">Register</Link>
            </>
          )}

          <a className="nav-cta" href="#donate-food">
            Donate food <span>↗</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              GOOD FOOD. GREATER GOOD.
            </div>

            <h1>A little food.<br /><span>A lot of hope.</span></h1>

            <p className="hero-description">
              Every meal deserves a purpose. Help us connect surplus food with
              people who need it, one thoughtful share at a time.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#donate-food">
                Donate Food <span>↗</span>
              </a>
              <a className="button button-secondary" href="#mission">
                Discover our mission <span>→</span>
              </a>
            </div>

            <div className="hero-note">
              <span className="avatar-stack">
                <span>🥬</span><span>🍎</span><span>🥕</span>
              </span>
              <p><strong>Small actions,</strong><br />meaningful change.</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="image-frame">
              <img
                src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85"
                alt="A fresh, colourful bowl of nutritious food"
              />
              <div className="image-label">
                <span className="label-icon">♡</span>
                <div>
                  <strong>Share more. Waste less.</strong>
                  <p>Good food belongs on a plate.</p>
                </div>
              </div>
            </div>

            <div className="floating-card">
              <span className="floating-icon">🌿</span>
              <div><strong>Every share matters</strong><p>Be part of the change</p></div>
            </div>
            <div className="decorative-circle" />
          </div>
        </section>

        <section className="mission-strip" id="mission">
          <div>
            <span className="strip-label">OUR PURPOSE</span>
            <h2>A better world starts at the table.</h2>
          </div>
          <p>
            We believe good food should nourish people, not end up in the bin.
            Together, we can build a more caring and sustainable community.
          </p>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">HOW FOODSHARE WORKS</span>
            <h2>Good things happen when we share.</h2>
            <p>Three simple steps. One meaningful difference.</p>
          </div>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <div className="step-top">
                  <span className="step-icon">{step.icon}</span>
                  <span className="step-number">{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="donate-section" id="donate-food">
          <div className="donate-heading">
            <span className="eyebrow">MAKE A DIFFERENCE</span>
            <h2>Donate Food</h2>
            <p>Share your extra food and help someone in your community.</p>
            <div className="donate-tip">
              <span>💡</span>
              <p>
                Please share only safe, properly stored food. Include accurate
                expiry and pickup details.
              </p>
            </div>
          </div>

          <form className="donate-form" onSubmit={handleDonation}>
            <label>
              Food Name
              <input type="text" name="foodName" placeholder="e.g. Fresh vegetable rice" required />
            </label>

            <div className="form-row">
              <label>
                Quantity
                <input type="number" name="quantity" placeholder="e.g. 10" min="1" required />
              </label>
              <label>
                Quantity Unit
                <select name="unit" required defaultValue="">
                  <option value="" disabled>Select unit</option>
                  <option value="plates">Plates</option>
                  <option value="kg">Kilograms</option>
                  <option value="packets">Packets</option>
                  <option value="litres">Litres</option>
                  <option value="servings">Servings</option>
                  <option value="boxes">Boxes</option>
                </select>
              </label>
            </div>

            <label>
              Food Type
              <select name="foodType" required defaultValue="">
                <option value="" disabled>Select food type</option>
                <option value="Freshly prepared">Freshly prepared</option>
                <option value="Packaged food">Packaged food</option>
                <option value="Fruits and vegetables">Fruits and vegetables</option>
                <option value="Bakery items">Bakery items</option>
                <option value="Dairy">Dairy</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Best Before Date
              <input
                type="date"
                name="bestBefore"
                min={new Date().toLocaleDateString('en-CA')}
                required
              />
            </label>

            <label>
              Pickup Location
              <input
                type="text"
                name="location"
                placeholder="Enter your area or pickup address"
                required
              />
            </label>

            <LocationPicker
              onLocationSelect={(location) => {
                setSelectedLocation(location)
                setError('')
              }}
            />

            <label>
              Contact Number
              <input
                type="tel"
                name="phone"
                placeholder="Enter contact number"
                pattern="[0-9+\\-\\s()]{7,20}"
                title="Enter a valid contact number"
                required
              />
            </label>

            <label>
              Additional Details
              <textarea
                name="details"
                placeholder="Storage instructions or other useful details"
                rows={3}
              />
            </label>

            {!loggedIn && (
              <p className="form-error">
                To post a donation, please{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#b42318',
                    textDecoration: 'underline',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-block',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  log in here
                </Link>.
              </p>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}

            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Donation'} <span>↗</span>
            </button>
          </form>
        </section>

        <section className="how-section" id="available-food">
          <div className="section-heading">
            <span className="eyebrow">COMMUNITY FOOD LISTINGS</span>
            <h2>Available Food</h2>
            <p>Discover food shared by our community.</p>
          </div>

          {loading ? (
            <div className="step-card">
              <span className="step-icon">⏳</span><h3>Loading donations...</h3>
            </div>
          ) : donations.length === 0 ? (
            <div className="step-card">
              <span className="step-icon">🍲</span>
              <h3>No donations to display</h3>
              <p>
                {loggedIn
                  ? 'No donations are available for this account yet.'
                  : 'Log in to view donations available to your account, or share food with the community.'}
              </p>
              <a className="button button-primary" href="#donate-food">
                Donate Food <span>↗</span>
              </a>
            </div>
          ) : (
            <div className="steps-grid">
              {donations.map((food) => {
                const isOwner =
                  Boolean(currentUserId) &&
                  Boolean(food.donor) &&
                  food.donor === currentUserId

                return (
                  <article className="step-card" key={food.id}>
                    <div className="step-top">
                      <span className="step-icon">🥗</span>
                      <span className="step-number">AVAILABLE</span>
                    </div>

                    <h3>{food.foodName}</h3>
                    <p><strong>Quantity:</strong> {food.quantity} {food.unit}</p>
                    <p><strong>Food type:</strong> {food.foodType}</p>
                    <p><strong>Best before:</strong> {food.bestBefore}</p>
                    <p><strong>Pickup:</strong> {food.location}</p>

                    {food.latitude !== null && food.longitude !== null && (
                      <a
                        className="button button-secondary"
                        href={`https://www.openstreetmap.org/?mlat=${food.latitude}&mlon=${food.longitude}#map=16/${food.latitude}/${food.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View pickup map
                      </a>
                    )}

                    {food.details && <p><strong>Details:</strong> {food.details}</p>}

                    <a className="button button-secondary" href={`tel:${food.phone}`}>
                      Contact donor
                    </a>

                    {isOwner && (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => deleteDonation(food.id)}
                        style={{ marginTop: '10px' }}
                      >
                        Remove listing
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
        </section>

        <section className="join-section" id="get-started">
          <div>
            <span className="eyebrow">BE THE REASON SOMEONE SMILES</span>
            <h2>Got extra food? Share the goodness.</h2>
            <p>
              Your small step could make a big difference in someone’s day.
              Start with FoodShare today.
            </p>
          </div>
          <a className="button button-light" href="#donate-food">
            Get involved <span>↗</span>
          </a>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="brand">
          <span className="brand-icon">✳</span>
          <span>food<span className="brand-highlight">share</span></span>
        </a>
        <p>Share Food. Reduce Waste. Spread Hope.</p>
        <span>Made with care for a better tomorrow. © 2026 FoodShare</span>
      </footer>
    </div>
  )
}

export default App