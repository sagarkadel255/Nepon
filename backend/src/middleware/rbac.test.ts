import request from 'supertest';
import app from '../server';
import { User } from '../models/User';
import { generateAccessToken } from '../modules/auth/auth.service';

// Note: mongoose connection is handled by src/test/setup.ts (in-memory Mongo).

beforeAll(async () => {
  await User.deleteMany({});
});

describe('RBAC — /api/admin/* access control', () => {
  let buyerToken = '';
  let adminToken = '';

  beforeAll(async () => {
    // A regular buyer registers via the public endpoint.
    const buyer = await request(app).post('/api/auth/register').send({
      email: 'buyer@example.com',
      password: 'Str0ng!Passw0rd',
      displayName: 'Buyer User',
      role: 'buyer',
      captchaAnswer: 'ABC12',
    });
    buyerToken = buyer.body.data.accessToken;

    // Admins cannot self-register (schema forces role=buyer). We provision the
    // admin directly in the test DB — the same way an operator would in
    // production — then mint a token for it. MFA is enabled because admin routes
    // now require it (requireMfaForAdmin).
    const admin = await User.create({
      email: 'admin@example.com',
      passwordHash: 'unused-in-this-test',
      displayName: 'Admin User',
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      authProviders: ['password'],
      mfaEnabled: true,
    });
    adminToken = generateAccessToken(admin);
  });

  it('allows an admin to reach /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('denies an admin without MFA enabled', async () => {
    const noMfaAdmin = await User.create({
      email: 'admin-nomfa@example.com',
      passwordHash: 'unused-in-this-test',
      displayName: 'No-MFA Admin',
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      authProviders: ['password'],
      mfaEnabled: false,
    });
    const token = generateAccessToken(noMfaAdmin);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.message).toMatch(/multi-factor/i);
  });

  it('denies a buyer access to /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(403);

    expect(res.body.message).toMatch(/Insufficient permissions/i);
  });

  it('denies unauthenticated access to /api/admin/users', async () => {
    await request(app).get('/api/admin/users').expect(401);
  });
});
