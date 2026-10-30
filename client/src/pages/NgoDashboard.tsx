
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import socket from '../socket'
import '../style.css'

type Donation = {
  _id?: string
  id?: string
  foodName: string
  quantity: number | string
  unit: string
  foodType: string
  bestBefore: string
  location: string
  details?: string
  status?: string
  requestedAt?: string | null
  latitude?: number | null
  longitude?: number | null
  distanceKm?: number | null
}

type Coordinates = {
  latitude: number
  longitude: number
}

type MapPoint = [number, number]

const API_URL = 'http://https://foodshare-backend-jymm.onrender.com/api/donations'

function FitMapBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, {
        padding: [35, 35],
        maxZoom: 12,
      })
    }
  }, [map, points])

  return null
}

export default function NgoDashboard() {
  const navigate = useNavigate()

  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [requestingId, setRequestingId] = useState('')
  const [ngoLocation, setNgoLocation] =
    useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] =
    useState('Getting your location...')

  const user = JSON.parse(
    localStorage.getItem('foodshare-user') || '{}'
  )
  const token = localStorage.getItem('foodshare-token')

  useEffect(() => {
    if (!token || user.role !== 'ngo') {
      navigate('/login', { replace: true })
      return
    }

    if (!navigator.geolocation) {
      setLocationMessage(
        'Location is not supported. Showing listings without distance.'
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNgoLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMessage('Your location is ready.')
      },
      () => {
        setLocationMessage(
          'Location permission unavailable. You can still browse donations.'
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [navigate, token, user.role])

  useEffect(() => {
    if (!token || user.role !== 'ngo') return

    let isActive = true

    async function loadDonations() {
      try {
        const url = new URL(API_URL)

        if (ngoLocation) {
          url.searchParams.set(
            'latitude',
            String(ngoLocation.latitude)
          )
          url.searchParams.set(
            'longitude',
            String(ngoLocation.longitude)
          )
        }

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Donations load nahi ho paayi.'
          )
        }

        if (isActive) {
          setDonations(
            Array.isArray(data) ? data : data.donations || []
          )
          setError('')
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong.'
          )
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }

    const handleDonationsUpdated = () => {
      void loadDonations()
    }

    void loadDonations()
    socket.on('donations:updated', handleDonationsUpdated)

    return () => {
      isActive = false
      socket.off('donations:updated', handleDonationsUpdated)
    }
  }, [token, user.role, ngoLocation])

  async function refreshDonations() {
    if (!token) return

    const url = new URL(API_URL)

    if (ngoLocation) {
      url.searchParams.set(
        'latitude',
        String(ngoLocation.latitude)
      )
      url.searchParams.set(
        'longitude',
        String(ngoLocation.longitude)
      )
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Could not refresh donations.')
    }

    setDonations(
      Array.isArray(data) ? data : data.donations || []
    )
  }

  async function requestPickup(id?: string) {
    if (!id || !token) {
      setError('Donation ID ya login token nahi mila.')
      return
    }

    setError('')
    setMessage('')
    setRequestingId(id)

    try {
      const response = await fetch(
        `${API_URL}/${id}/request-pickup`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Pickup request failed.'
        )
      }

      setMessage('Pickup request successful!')
      await refreshDonations()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setRequestingId('')
    }
  }

  function logout() {
    localStorage.removeItem('foodshare-token')
    localStorage.removeItem('foodshare-user')
    navigate('/login', { replace: true })
  }

  const availableDonations = donations.filter((donation) => {
    const expiry = new Date(donation.bestBefore).getTime()

    return (
      (!donation.status || donation.status === 'available') &&
      Number.isFinite(expiry) &&
      expiry >= Date.now()
    )
  })

  const myRequests = donations.filter((donation) =>
    ['requested', 'accepted', 'collected'].includes(
      donation.status || ''
    )
  )

  const mappedDonations = availableDonations.filter(
    (donation) =>
      typeof donation.latitude === 'number' &&
      Number.isFinite(donation.latitude) &&
      typeof donation.longitude === 'number' &&
      Number.isFinite(donation.longitude) &&
      Math.abs(donation.latitude) <= 90 &&
      Math.abs(donation.longitude) <= 180
  )

  const mapPoints = useMemo<MapPoint[]>(() => {
    const points: MapPoint[] = []

    if (ngoLocation) {
      points.push([
        ngoLocation.latitude,
        ngoLocation.longitude,
      ])
    }

    mappedDonations.forEach((donation) => {
      points.push([
        donation.latitude as number,
        donation.longitude as number,
      ])
    })

    return points
  }, [ngoLocation, mappedDonations])

  const mapCenter: MapPoint = ngoLocation
    ? [ngoLocation.latitude, ngoLocation.longitude]
    : mappedDonations.length > 0
      ? [
          mappedDonations[0].latitude as number,
          mappedDonations[0].longitude as number,
        ]
      : [20.5937, 78.9629]

  function mapLink(donation: Donation) {
    if (
      typeof donation.latitude !== 'number' ||
      typeof donation.longitude !== 'number'
    ) {
      return null
    }

    const lat = donation.latitude
    const lng = donation.longitude

    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7f1',
        padding: '32px 20px',
        color: '#26382c',
      }}
    >
      <header
        style={{
          maxWidth: 1100,
          margin: '0 auto 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#315c40',
            textDecoration: 'none',
          }}
        >
          FoodShare
        </Link>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Link to="/" style={{ color: '#315c40' }}>
            Home
          </Link>

          <button onClick={logout} style={buttonStyle}>
            Logout
          </button>
        </nav>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p
          style={{
            color: '#618269',
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          NGO SPACE
        </p>

        <h1
          style={{
            fontSize: 'clamp(30px, 5vw, 44px)',
            marginBottom: 8,
          }}
        >
          Welcome, NGO!
        </h1>

        <p style={{ color: '#637067', marginBottom: 12 }}>
          Discover available food and track your pickup requests.
        </p>

        <p style={noticeStyle} role="status">
          📍 {locationMessage}
        </p>

        <div style={statsGrid}>
          <div style={cardStyle}>
            <p>Available food listings</p>
            <h2 style={statStyle}>
              {availableDonations.length}
            </h2>
          </div>

          <div style={cardStyle}>
            <p>My pickup requests</p>
            <h2 style={statStyle}>{myRequests.length}</h2>
          </div>
        </div>

        {message && (
          <p style={noticeStyle} role="status">
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              color: '#b42318',
              background: '#fdecec',
              padding: 12,
              borderRadius: 8,
            }}
          >
            {error}
          </p>
        )}

        <h2 style={{ margin: '28px 0 18px' }}>
          FoodShare Donation Map
        </h2>

        <div
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              height: 350,
              width: '100%',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <MapContainer
              center={mapCenter}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitMapBounds points={mapPoints} />

              {ngoLocation && (
                <CircleMarker
                  center={[
                    ngoLocation.latitude,
                    ngoLocation.longitude,
                  ]}
                  radius={9}
                  pathOptions={{
                    color: '#27628b',
                    fillColor: '#4385b5',
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>Your current NGO location</Popup>
                </CircleMarker>
              )}

              {mappedDonations.map((donation, index) => (
                <CircleMarker
                  key={donation._id || donation.id || index}
                  center={[
                    donation.latitude as number,
                    donation.longitude as number,
                  ]}
                  radius={8}
                  pathOptions={{
                    color: '#315c40',
                    fillColor: '#5c9b68',
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>
                    <strong>{donation.foodName}</strong>
                    <br />
                    Quantity: {donation.quantity} {donation.unit}
                    <br />
                    Location: {donation.location}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <p style={{ color: '#637067', padding: '8px 4px 0' }}>
            Blue marker: your NGO location. Green markers: available
            donations with saved coordinates.
          </p>

          {mappedDonations.length === 0 && (
            <p style={{ color: '#637067', padding: '0 4px 8px' }}>
              No available donation coordinates found. Add valid
              latitude and longitude to see donation markers.
            </p>
          )}
        </div>

        {loading ? (
          <p>Loading donations...</p>
        ) : (
          <>
            <h2 style={{ marginBottom: 18 }}>
              Available food donations
            </h2>

            {availableDonations.length === 0 && (
              <div style={{ ...cardStyle, marginBottom: 32 }}>
                <h3>No available donations right now</h3>
                <p>Check again later for food shared by donors.</p>
              </div>
            )}

            <div style={listGrid}>
              {availableDonations.map((donation, index) => {
                const id = donation._id || donation.id
                const locationUrl = mapLink(donation)

                return (
                  <article key={id || index} style={cardStyle}>
                    <p style={{ color: '#618269', fontWeight: 700 }}>
                      AVAILABLE
                    </p>

                    <h3>{donation.foodName}</h3>
                    <p>Quantity: {donation.quantity} {donation.unit}</p>
                    <p>Food type: {donation.foodType}</p>
                    <p>Pickup location: {donation.location}</p>

                    {typeof donation.distanceKm === 'number' && (
                      <p style={{ color: '#315c40', fontWeight: 700 }}>
                        📍 {donation.distanceKm} km away
                      </p>
                    )}

                    {locationUrl && (
                      <p>
                        <a
                          href={locationUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#315c40', fontWeight: 700 }}
                        >
                          View pickup map ↗
                        </a>
                      </p>
                    )}

                    <p>
                      Best before:{' '}
                      {donation.bestBefore
                        ? new Date(donation.bestBefore).toLocaleDateString()
                        : 'Not specified'}
                    </p>

                    {donation.details && <p>{donation.details}</p>}

                    <button
                      onClick={() => void requestPickup(id)}
                      disabled={!id || requestingId === id}
                      style={{
                        ...buttonStyle,
                        width: '100%',
                        marginTop: 8,
                        opacity: requestingId === id ? 0.7 : 1,
                      }}
                    >
                      {requestingId === id
                        ? 'Requesting...'
                        : 'Request Pickup'}
                    </button>
                  </article>
                )
              })}
            </div>

            <h2 style={{ margin: '12px 0 18px' }}>
              My Pickup Requests
            </h2>

            {myRequests.length === 0 ? (
              <div style={cardStyle}>
                <h3>No pickup requests yet</h3>
                <p>
                  Food you request will appear here with its collection status.
                </p>
              </div>
            ) : (
              <div style={listGrid}>
                {myRequests.map((donation, index) => {
                  const status = donation.status
                  const collected = status === 'collected'
                  const accepted = status === 'accepted'
                  const locationUrl = mapLink(donation)

                  return (
                    <article
                      key={donation._id || donation.id || index}
                      style={{
                        ...cardStyle,
                        borderTop: `4px solid ${
                          collected
                            ? '#315c40'
                            : accepted
                              ? '#4385b5'
                              : '#d69a32'
                        }`,
                      }}
                    >
                      <p style={{ fontWeight: 700 }}>
                        {collected
                          ? 'COLLECTED'
                          : accepted
                            ? 'PICKUP ACCEPTED'
                            : 'PICKUP REQUESTED'}
                      </p>

                      <h3>{donation.foodName}</h3>
                      <p>Quantity: {donation.quantity} {donation.unit}</p>
                      <p>Food type: {donation.foodType}</p>
                      <p>Pickup location: {donation.location}</p>

                      {locationUrl && (
                        <p>
                          <a
                            href={locationUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#315c40', fontWeight: 700 }}
                          >
                            View pickup map ↗
                          </a>
                        </p>
                      )}

                      {donation.requestedAt && (
                        <p>
                          Requested on:{' '}
                          {new Date(donation.requestedAt).toLocaleString()}
                        </p>
                      )}

                      <p style={{ color: '#637067' }}>
                        {collected
                          ? '✓ The donor has marked this donation as collected.'
                          : accepted
                            ? 'The donor accepted your pickup request.'
                            : 'Your pickup request is awaiting donor approval.'}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

const buttonStyle: React.CSSProperties = {
  background: '#315c40',
  color: 'white',
  padding: '10px 18px',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
}

const noticeStyle: React.CSSProperties = {
  color: '#315c40',
  background: '#e6f4e8',
  padding: 12,
  borderRadius: 8,
  marginBottom: 24,
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: 22,
  borderRadius: 16,
}

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 32,
}

const statStyle: React.CSSProperties = {
  fontSize: 32,
  margin: 0,
}

const listGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 18,
  marginBottom: 40,
}
