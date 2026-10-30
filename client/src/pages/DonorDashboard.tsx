
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import socket from '../socket';
import '../style.css';

type Donation = {
  _id?: string;
  id?: string;
  foodName: string;
  quantity: number | string;
  unit: string;
  foodType: string;
  bestBefore: string;
  location: string;
  status?: string;
  requestedAt?: string | null;
  requestedBy?: {
    name?: string;
    organizationName?: string;
    email?: string;
  } | string | null;
};

type Analytics = {
  totalDonations: number;
  availableDonations: number;
  pendingRequests: number;
  acceptedPickups: number;
  collectedDonations: number;
  collectionRate: number;
};

const API_URL = 'http://https://foodshare-backend-jymm.onrender.com/api/donations';
const ANALYTICS_URL = 'http://https://foodshare-backend-jymm.onrender.com/api/analytics';

export default function DonorDashboard() {
  const navigate = useNavigate();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingId, setProcessingId] = useState('');

  const token = localStorage.getItem('foodshare-token');
  const user = JSON.parse(
    localStorage.getItem('foodshare-user') || '{}'
  );

  const loadDonations = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Donations load nahi ho paayi.');
      }

      setDonations(Array.isArray(data) ? data : data.donations || []);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;

    setAnalyticsLoading(true);

    try {
      const response = await fetch(ANALYTICS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Analytics load nahi hui.');
      }

      setAnalytics(data);
      setAnalyticsError('');
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : 'Analytics load nahi hui.'
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || user.role !== 'donor') {
      navigate('/login', { replace: true });
      return;
    }

    void loadDonations();
    void loadAnalytics();

    function handleDonationsUpdated() {
      void loadDonations();
      void loadAnalytics();
    }

    socket.on('donations:updated', handleDonationsUpdated);

    return () => {
      socket.off('donations:updated', handleDonationsUpdated);
    };
  }, [navigate, token, user.role, loadDonations, loadAnalytics]);

  function logout() {
    localStorage.removeItem('foodshare-token');
    localStorage.removeItem('foodshare-user');
    navigate('/login', { replace: true });
  }

  async function updatePickupStatus(
    donation: Donation,
    action: 'accept-pickup' | 'reject-pickup' | 'mark-collected'
  ) {
    const donationId = donation._id || donation.id;

    if (!donationId || !token) {
      setError('Donation ID ya login token nahi mila.');
      return;
    }

    const confirmationMessages = {
      'accept-pickup': 'Do you want to accept this pickup request?',
      'reject-pickup': 'Do you want to reject this pickup request?',
      'mark-collected': 'Confirm that this donation has been collected?',
    };

    if (!window.confirm(confirmationMessages[action])) return;

    setProcessingId(donationId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/${donationId}/${action}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Donation status update nahi hua.');
      }

      const newStatus =
        action === 'accept-pickup'
          ? 'accepted'
          : action === 'reject-pickup'
            ? 'available'
            : 'collected';

      setDonations((previous) =>
        previous.map((item) =>
          (item._id || item.id) === donationId
            ? {
                ...item,
                status: newStatus,
                ...(action === 'reject-pickup'
                  ? { requestedBy: null, requestedAt: null }
                  : {}),
              }
            : item
        )
      );

      const messages = {
        'accept-pickup': 'Pickup request accepted successfully!',
        'reject-pickup':
          'Pickup request rejected. Donation is available again.',
        'mark-collected': 'Donation successfully marked as collected!',
      };

      setSuccess(messages[action]);

      await Promise.all([loadDonations(), loadAnalytics()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setProcessingId('');
    }
  }

  const activeCount = donations.filter(
    (donation) =>
      !donation.status || donation.status === 'available'
  ).length;

  const requestedCount = donations.filter(
    (donation) =>
      donation.status === 'requested' || donation.status === 'accepted'
  ).length;

  function getStatusLabel(status?: string) {
    if (status === 'requested') return 'Pickup Requested';
    if (status === 'accepted') return 'Pickup Accepted';
    if (status === 'rejected') return 'Pickup Rejected';
    if (status === 'collected') return 'Collected';
    return 'Available';
  }

  const analyticsCards = [
    {
      label: 'Total donations',
      value: analytics?.totalDonations ?? donations.length,
    },
    {
      label: 'Available donations',
      value: analytics?.availableDonations ?? activeCount,
    },
    {
      label: 'Pending requests',
      value: analytics?.pendingRequests ?? requestedCount,
    },
    {
      label: 'Accepted pickups',
      value: analytics?.acceptedPickups ?? 0,
    },
    {
      label: 'Collected donations',
      value: analytics?.collectedDonations ?? 0,
    },
    {
      label: 'Collection rate',
      value: `${analytics?.collectionRate ?? 0}%`,
    },
  ];

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

          <Link to="/#donate" style={{ color: '#315c40' }}>
            Donate Food
          </Link>

          <button
            onClick={logout}
            style={{
              background: '#315c40',
              color: 'white',
              padding: '10px 18px',
              border: 0,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ color: '#618269', fontWeight: 700, letterSpacing: 2 }}>
          DONOR SPACE
        </p>

        <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', marginBottom: 8 }}>
          Welcome, Donor!
        </h1>

        <p style={{ color: '#637067', marginBottom: 28 }}>
          Manage your food donations and help good food reach people who need it.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {analyticsCards.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'white',
                padding: 22,
                borderRadius: 16,
                boxShadow: '0 3px 12px rgba(38, 56, 44, 0.05)',
              }}
            >
              <p style={{ color: '#637067', marginTop: 0 }}>
                {item.label}
              </p>

              <h2 style={{ fontSize: 32, margin: 0, color: '#315c40' }}>
                {analyticsLoading && !analytics ? '...' : item.value}
              </h2>
            </div>
          ))}
        </div>

        {analyticsError && (
          <p
            role="alert"
            style={{
              background: '#fff7e6',
              color: '#8a5200',
              padding: 14,
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            Analytics load nahi hui: {analyticsError}
            <button
              onClick={() => void loadAnalytics()}
              style={{
                marginLeft: 12,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <h2>My food donations</h2>

          <Link
            to="/#donate"
            style={{
              background: '#315c40',
              color: 'white',
              padding: '12px 18px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            + Donate food
          </Link>
        </div>

        {success && (
          <p
            role="status"
            style={{
              background: '#e6f4e8',
              color: '#245c32',
              padding: 14,
              borderRadius: 8,
            }}
          >
            {success}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              background: '#fdecec',
              color: '#9b2424',
              padding: 14,
              borderRadius: 8,
            }}
          >
            {error}
          </p>
        )}

        {loading && <p>Loading donations...</p>}

        {!loading && !error && donations.length === 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 28 }}>
            <h3>No donations yet</h3>
            <p>Your food donations will appear here.</p>
            <Link to="/#donate" style={{ color: '#315c40' }}>
              Create your first donation
            </Link>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 18,
          }}
        >
          {donations.map((donation, index) => {
            const status = donation.status || 'available';
            const isRequested = status === 'requested';
            const isAccepted = status === 'accepted';
            const isCollected = status === 'collected';
            const isAvailable = status === 'available';
            const donationId = donation._id || donation.id;
            const isProcessing = processingId === donationId;

            const ngo =
              donation.requestedBy &&
              typeof donation.requestedBy === 'object'
                ? donation.requestedBy
                : null;

            const statusColor =
              isRequested
                ? '#a15c00'
                : isAccepted || isCollected
                  ? '#315c40'
                  : '#618269';

            return (
              <article
                key={donationId || index}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <p style={{ color: statusColor, fontWeight: 700 }}>
                  {getStatusLabel(status).toUpperCase()}
                </p>

                <h3>{donation.foodName}</h3>
                <p>
                  Quantity: {donation.quantity} {donation.unit}
                </p>
                <p>Type: {donation.foodType}</p>
                <p>Location: {donation.location}</p>
                <p>
                  Best before:{' '}
                  {donation.bestBefore
                    ? new Date(donation.bestBefore).toLocaleDateString()
                    : 'Not specified'}
                </p>

                {(isRequested || isAccepted) && (
                  <div
                    style={{
                      background: '#fff7e6',
                      padding: 14,
                      borderRadius: 10,
                      marginTop: 14,
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>
                      {isAccepted
                        ? 'Pickup request accepted'
                        : 'Pickup request received'}
                    </h4>

                    {ngo ? (
                      <>
                        <p>
                          NGO: {ngo.organizationName || ngo.name || 'Organization'}
                        </p>
                        {ngo.email && <p>Email: {ngo.email}</p>}
                      </>
                    ) : (
                      <p>An NGO has requested this donation.</p>
                    )}

                    {donation.requestedAt && (
                      <p>
                        Requested on:{' '}
                        {new Date(donation.requestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {isRequested && (
                  <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() =>
                        void updatePickupStatus(donation, 'accept-pickup')
                      }
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        background: '#315c40',
                        color: 'white',
                        padding: '12px 16px',
                        border: 0,
                        borderRadius: 8,
                        cursor: isProcessing ? 'wait' : 'pointer',
                      }}
                    >
                      {isProcessing ? 'Updating...' : 'Accept Pickup'}
                    </button>

                    <button
                      onClick={() =>
                        void updatePickupStatus(donation, 'reject-pickup')
                      }
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        background: 'white',
                        color: '#9b2424',
                        padding: '12px 16px',
                        border: '1px solid #d9a3a3',
                        borderRadius: 8,
                        cursor: isProcessing ? 'wait' : 'pointer',
                      }}
                    >
                      {isProcessing ? 'Updating...' : 'Reject Pickup'}
                    </button>
                  </div>
                )}

                {isAccepted && (
                  <button
                    onClick={() =>
                      void updatePickupStatus(donation, 'mark-collected')
                    }
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      marginTop: 16,
                      background: '#315c40',
                      color: 'white',
                      padding: '12px 16px',
                      border: 0,
                      borderRadius: 8,
                      cursor: isProcessing ? 'wait' : 'pointer',
                    }}
                  >
                    {isProcessing ? 'Updating...' : 'Mark as Collected'}
                  </button>
                )}

                {isCollected && (
                  <p
                    style={{
                      color: '#315c40',
                      fontWeight: 600,
                      marginTop: 14,
                    }}
                  >
                    ✓ This donation has been collected.
                  </p>
                )}

                {isAvailable && (
                  <p style={{ color: '#618269', marginTop: 14 }}>
                    This donation is available for pickup.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
