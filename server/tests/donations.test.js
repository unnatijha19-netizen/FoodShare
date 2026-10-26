
require('dotenv').config();

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../app');

describe('FoodShare Donation API', () => {
  const donorToken = jwt.sign(
    {
      userId: '507f1f77bcf86cd799439011',
      role: 'donor',
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  test('POST /api/donations rejects unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/donations')
      .send({
        foodName: 'Rice',
        quantity: 5,
        unit: 'kg',
        foodType: 'Raw food',
        bestBefore: '2030-12-31',
        location: 'Jaipur',
        phone: '9999999999',
      });

    expect(response.statusCode).toBe(401);
  });

  test('POST /api/donations rejects invalid quantity', async () => {
    const response = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        foodName: 'Rice',
        quantity: -5,
        unit: 'kg',
        foodType: 'Raw food',
        bestBefore: '2030-12-31',
        location: 'Jaipur',
        phone: '9999999999',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      'Quantity must be a positive number.'
    );
  });

  test('POST /api/donations rejects missing required fields', async () => {
    const response = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        foodName: 'Rice',
        quantity: 5,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      'Please fill all required fields.'
    );
  });

  test('POST /api/donations rejects invalid map coordinates', async () => {
    const response = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        foodName: 'Rice',
        quantity: 5,
        unit: 'kg',
        foodType: 'Raw food',
        bestBefore: '2030-12-31',
        location: 'Jaipur',
        latitude: 120,
        longitude: 75,
        phone: '9999999999',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      'Please select a valid map location.'
    );
  });
});
