
const request = require('supertest');
const { app } = require('../app');

describe('FoodShare Backend Health Check', () => {
  test('GET / should return backend running message', async () => {
    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      'FoodShare backend is running!'
    );
  });
});
