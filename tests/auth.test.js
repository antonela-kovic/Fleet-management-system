// Access-control tests. Every request here is rejected by the middleware or by
// input validation before it reaches the database, so no MongoDB is needed.
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

const tokenFor = (role) => jwt.sign({ id: '64b000000000000000000001', role }, process.env.JWT_SECRET);
const bearer = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` });

describe('authentication', () => {
  test.each([
    ['get', '/api/admin/vehicles'],
    ['get', '/api/employee/reservations'],
    ['get', '/api/profile/image'],
    ['delete', '/api/profile'],
  ])('%s %s without a token returns 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  test('an invalid token returns 401', async () => {
    const res = await request(app).get('/api/admin/vehicles').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
  });

  test('a token signed with another secret returns 401', async () => {
    const forged = jwt.sign({ id: '64b000000000000000000001', role: 'admin' }, 'other-secret');
    const res = await request(app).get('/api/admin/vehicles').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('authorisation', () => {
  test('an employee cannot use admin routes', async () => {
    const res = await request(app).get('/api/admin/reservations').set(bearer('employee'));
    expect(res.status).toBe(403);
  });

  test('an employee cannot delete vehicles', async () => {
    const res = await request(app).delete('/api/admin/vehicles/64b000000000000000000002').set(bearer('employee'));
    expect(res.status).toBe(403);
  });

  test('an admin cannot use employee routes', async () => {
    const res = await request(app).get('/api/employee/reservations').set(bearer('admin'));
    expect(res.status).toBe(403);
  });
});

describe('input validation', () => {
  test('registration rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('registration rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'not-an-email', password: 'long-enough-password' });
    expect(res.status).toBe(400);
  });

  test('a reservation with the end before the start is rejected', async () => {
    const res = await request(app)
      .post('/api/employee/reservations')
      .set(bearer('employee'))
      .send({ vehicleType: 'Van', purpose: 'Site visit', startDate: '2030-05-10', endDate: '2030-05-01' });
    expect(res.status).toBe(400);
  });

  test('assigning a reservation requires a valid status', async () => {
    const res = await request(app)
      .put('/api/admin/reservations/64b000000000000000000003')
      .set(bearer('admin'))
      .send({ status: 'something-else' });
    expect(res.status).toBe(400);
  });

  test('an invalid reservation id is rejected', async () => {
    const res = await request(app).patch('/api/employee/reservations/123/cancel').set(bearer('employee'));
    expect(res.status).toBe(400);
  });
});
