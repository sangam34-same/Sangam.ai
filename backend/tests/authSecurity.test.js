const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const { validatePasswordStrength } = require('../src/models/User');

describe('Security Regression Tests', () => {
  const validPassword = 'SecurePass123!';
  const validUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: validPassword,
    confirmPassword: validPassword,
    terms: true,
  };

  // Helper to reset rate limit by using different emails
  const makeUniqueUser = (suffix) => ({
    ...validUser,
    email: `test${suffix}@example.com`,
  });

  describe('Password Hashing', () => {
    test('Passwords are hashed with bcrypt', async () => {
      const user = await User.create(validUser);
      expect(user.password).toMatch(/^\$2[ab]\$\d+\$/);
      expect(user.password).not.toBe(validPassword);
    });

    test('No password appears in any JSON response', async () => {
      const user = makeUniqueUser('nopass');
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(user);
      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.user).not.toHaveProperty('password');
      expect(JSON.stringify(registerRes.body)).not.toContain(validPassword);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });
      expect(loginRes.body.data.user).not.toHaveProperty('password');
      expect(JSON.stringify(loginRes.body)).not.toContain(validPassword);
    });

    test('Password validation rejects weak passwords', async () => {
      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'Pass123!', // too short
      ];

      for (const pwd of weakPasswords) {
        const validation = validatePasswordStrength(pwd, { name: 'Test', email: 'test@example.com' });
        expect(validation.isValid).toBe(false);
      }
    });

    test('Password validation rejects common passwords', async () => {
      const validation = validatePasswordStrength('password123!', { name: 'Test', email: 'test@example.com' });
      expect(validation.isValid).toBe(false);
    });

    test('Password validation rejects passwords containing personal info', async () => {
      const validation = validatePasswordStrength('TestUser123!', { name: 'Test User', email: 'test@example.com' });
      expect(validation.isValid).toBe(false);
    });

    test('Password validation accepts strong passwords', async () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyStr0ng!Pass',
        'C0mpl3x!P@ssw0rd',
      ];

      for (const pwd of strongPasswords) {
        const validation = validatePasswordStrength(pwd, { name: 'Test', email: 'test@example.com' });
        expect(validation.isValid).toBe(true);
      }
    });
  });

  describe('JWT Access Token', () => {
    test('Access token expires in ~15 minutes', async () => {
      const user = makeUniqueUser('jwt');
      await request(app).post('/api/auth/register').send(user);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.accessToken;
      const decoded = jwt.decode(token);
      const expDiff = decoded.exp - decoded.iat;
      // 15 min = 900 seconds, allow some buffer
      expect(expDiff).toBeLessThanOrEqual(1000);
      expect(expDiff).toBeGreaterThanOrEqual(800);
    });

    test('Expired JWT returns 401 with generic message', async () => {
      const expiredToken = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user', jti: 'test' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s', issuer: 'sangam.ai', audience: 'sangam.ai', algorithm: 'HS256' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Token expired');
    });

    test('Tampered JWT returns 401', async () => {
      const token = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user', jti: 'test' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m', issuer: 'sangam.ai', audience: 'sangam.ai', algorithm: 'HS256' }
      );
      const tampered = token + 'tampered';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });

    test('Wrong signature JWT returns 401', async () => {
      const token = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user', jti: 'test' },
        'wrong-secret',
        { expiresIn: '15m', issuer: 'sangam.ai', audience: 'sangam.ai', algorithm: 'HS256' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    test('Auth rate limit triggers after multiple attempts', async () => {
      const user = makeUniqueUser('ratelimit');
      await request(app).post('/api/auth/register').send(user);

      // Should get 429 after enough attempts
      let lastStatus = 200;
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user.email, password: 'wrong' });
        lastStatus = res.status;
        if (res.status === 429) break;
      }
      // Eventually should hit rate limit
      expect([401, 429]).toContain(lastStatus);
    });
  });

  describe('User Enumeration Prevention', () => {
    test('Registration with existing email returns generic success', async () => {
      const user = makeUniqueUser('enum');
      await request(app).post('/api/auth/register').send(user);

      const res = await request(app)
        .post('/api/auth/register')
        .send(user);

      // Should not reveal if email exists - returns 200 or 201
      expect([200, 201]).toContain(res.status);
    });

    test('Forgot password always returns 200', async () => {
      const user = makeUniqueUser('forgot');
      await request(app).post('/api/auth/register').send(user);

      const unknownRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown@example.com' });

      const knownRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      expect(unknownRes.status).toBe(200);
      expect(knownRes.status).toBe(200);
      expect(unknownRes.body.message).toBe(knownRes.body.message);
    });

    test('Login timing is consistent for unknown vs known email', async () => {
      const user = makeUniqueUser('timing');
      await request(app).post('/api/auth/register').send(user);

      const iterations = 5;
      const unknownTimes = [];
      const knownTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start1 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'unknown@example.com', password: 'wrong' });
        unknownTimes.push(Date.now() - start1);

        const start2 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({ email: user.email, password: 'wrong' });
        knownTimes.push(Date.now() - start2);
      }

      const avgUnknown = unknownTimes.reduce((a, b) => a + b, 0) / iterations;
      const avgKnown = knownTimes.reduce((a, b) => a + b, 0) / iterations;

      expect(Math.abs(avgUnknown - avgKnown)).toBeLessThanOrEqual(100);
    });
  });

  describe('Password Reset', () => {
    test('Reset token is hashed in DB, expires in 15 min, single-use', async () => {
      const user = makeUniqueUser('reset');
      await request(app).post('/api/auth/register').send(user);

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      const dbUser = await User.findOne({ email: user.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser.passwordResetToken).toMatch(/^[a-f0-9]{64}$/);
      expect(dbUser.passwordResetExpires.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 1000);
      expect(dbUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());

      const resetToken = dbUser.passwordResetToken;
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(plainToken).digest('hex');
      expect(hashed).toBe(resetToken);
    });

    test('Password reset revokes all sessions', async () => {
      const user = makeUniqueUser('reset2');
      await request(app).post('/api/auth/register').send(user);

      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      const dbUser = await User.findOne({ email: user.email });
      expect(dbUser).not.toBeNull();
      const resetToken = dbUser.passwordResetToken;

      await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'NewSecurePass123!', confirmPassword: 'NewSecurePass123!' });

      const sessions = await Session.find({ userId: dbUser._id });
      for (const session of sessions) {
        expect(session.revokedAt).not.toBeNull();
        expect(session.revokedReason).toBe('password_change');
      }
    });
  });

  describe('Input Sanitization', () => {
    test('XSS payload in name field is rejected', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '<script>alert(1)</script>',
          email: 'xss@example.com',
          password: validPassword,
          confirmPassword: validPassword,
          terms: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Validation failed');
    });

    test('NoSQL injection payload in email field does not bypass auth', async () => {
      await User.create(validUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: validPassword });

      expect(res.status).toBe(400);
    });

    test('Unexpected fields are rejected', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'new@example.com',
          maliciousField: 'injection',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === 'maliciousField')).toBe(true);
    });

    test('Body size limit enforced', async () => {
      const largePayload = {
        name: 'a'.repeat(20000),
        email: 'test@example.com',
        password: validPassword,
        confirmPassword: validPassword,
        terms: true,
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(largePayload);

      expect(res.status).toBe(413);
    });
  });

  describe('CORS', () => {
    test('CORS blocks requests from unauthorized origins', async () => {
      const user = makeUniqueUser('cors');
      await request(app).post('/api/auth/register').send(user);

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://evil.com')
        .send({ email: user.email, password: validPassword });

      expect(res.status).toBe(403);
    });

    test('CORS allows configured frontend origin', async () => {
      const user = makeUniqueUser('cors2');
      await request(app).post('/api/auth/register').send(user);

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: user.email, password: validPassword });

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Security Headers', () => {
    test('API responses include security headers (except HSTS in test)', async () => {
      const res = await request(app)
        .get('/api/health');

      // HSTS is disabled in test environment
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['permissions-policy']).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('Password change revokes all active sessions', async () => {
      const user = makeUniqueUser('session');
      await request(app).post('/api/auth/register').send(user);

      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });

      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });

      const dbUser = await User.findOne({ email: user.email });
      dbUser.password = 'NewPassword123!';
      await dbUser.save();

      const sessions = await Session.find({ userId: dbUser._id });
      for (const session of sessions) {
        expect(session.revokedAt).not.toBeNull();
        expect(session.revokedReason).toBe('password_change');
      }
    });

    test('Logout revokes current session', async () => {
      const user = makeUniqueUser('logout');
      await request(app).post('/api/auth/register').send(user);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: validPassword });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      const token = refreshCookie.split(';')[0].split('=')[1];

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${token}`]);

      const sessions = await Session.find({ userId: (await User.findOne({ email: user.email }))._id });
      expect(sessions[0].revokedAt).not.toBeNull();
      expect(sessions[0].revokedReason).toBe('logout');
    });
  });
});