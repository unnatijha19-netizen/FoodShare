
jest.mock('../models/Donation', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const Donation = require('../models/Donation');
const { app } = require('../app');

describe('FoodShare Impact Analytics API', () => {
  const donorToken = jwt.sign(
    { userId: '507f1f77bcf86cd799439011', role: 'donor' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();

    Donation.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    Donation.aggregate.mockResolvedValue([
      { _id: 'kg', totalQuantity: 15 },
    ]);
  });

  test('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/analytics');

    expect(response.statusCode).toBe(401);
  });

  test('returns analytics for an authenticated donor', async () => {
    const response = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.totalDonations).toBe(10);
    expect(response.body.availableDonations).toBe(4);
    expect(response.body.collectedDonations).toBe(3);
    expect(response.body.collectionRate).toBe(30);
    expect(response.body.collectedQuantityByUnit).toEqual([
      { unit: 'kg', quantity: 15 },
    ]);
  });
});
