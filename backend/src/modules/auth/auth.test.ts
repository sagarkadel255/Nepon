import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import { User } from '../../models/User';

// Note: mongoose connection is handled by src/test/setup.ts (in-memory Mongo).

beforeAll(async () => {
  await User.deleteMany({});
});

describe('Auth Endpoints', () => {
  let accessToken = '';
  let refreshTokenCookie = '';
  const testUser = {
    email: 'test@example.com',
    // Must satisfy the production policy: ≥12 chars + upper + lower + digit + special.
    password: 'Str0ng!Passw0rd',
    displayName: 'Test User',
    role: 'buyer',
    // The CAPTCHA middleware short-circuits in NODE_ENV=test; any non-empty
    // token is accepted so the route wiring is exercised without network I/O.
    captchaAnswer: 'ABC12',
  };

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();

    const cookies = ([] as string[]).concat(res.header['set-cookie'] || []);
    expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('logs in an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password, captchaAnswer: 'ABC12' })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.accessToken).toBeDefined();

    accessToken = res.body.data.accessToken;
    const cookies = ([] as string[]).concat(res.header['set-cookie'] || []);
    refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) as string;
  });

  it('retrieves profile with a valid access token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('denies access without a token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('rejects a weak password at registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'weak@example.com', password: 'weakpass', captchaAnswer: 'ABC12' })
      .expect(400);
  });

  it('refreshes the access token using the refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie])
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.accessToken).toBeDefined();
  });
});
