// End-to-end smoke test for the Airbnb v2 backend: REST + JWT + Mongo models + Socket.IO.
// Needs a running MongoDB (TEST_MONGO_URL, default mongodb://127.0.0.1:27017/airbnb_e2e).
// Run from backend/: npm run test:e2e
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 4777;
const BASE = `http://127.0.0.1:${PORT}`;
const env = {
  ...process.env,
  PORT: String(PORT),
  MONGO_URL: process.env.TEST_MONGO_URL || 'mongodb://127.0.0.1:27017/airbnb_e2e',
  KAFKA_ENABLED: 'false',
  JWT_SECRET: 'smoke-test-secret',
  SESSION_SECRET: 'smoke-session',
  CORS_ORIGINS: 'http://localhost:3000',
  KAFKAJS_NO_PARTITIONER_WARNING: '1',
};

const results = [];
const check = (name, cond, extra = '') => {
  results.push([name, !!cond]);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

const req = async (method, url, body, token) => {
  const r = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* empty */ }
  return { status: r.status, data };
};

const waitFor = (socket, event, ms = 5000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (d) => { clearTimeout(t); resolve(d); });
  });

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    s.once('connect', () => resolve(s));
    s.once('connect_error', (e) => reject(e));
  });

(async () => {
  const server = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  try {
    // wait for health
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try { up = (await fetch(BASE + '/health')).ok; } catch { /* not yet */ }
    }
    check('server starts (Mongo + Socket.IO, Kafka disabled)', up);
    if (!up) throw new Error('server did not start\n' + log);

    const stamp = Date.now();
    await req('POST', '/api/owner/signup', { name: 'Olivia Owner', email: `owner${stamp}@test.dev`, password: 'secret123', location: 'San Jose, CA' });
    const ol = await req('POST', '/api/owner/login', { email: `owner${stamp}@test.dev`, password: 'secret123' });
    check('owner signup + login returns JWT', ol.status === 200 && ol.data?.token);
    const ownerToken = ol.data.token;
    const ownerId = String(ol.data.owner?._id || ol.data.owner?.id);

    const cp = await req('POST', '/api/owner/properties', {
      name: 'Sunny Loft', type: 'Apartment', city: 'San Jose', state: 'CA', country: 'USA',
      price: 150, bedrooms: 2, bathrooms: 1, maxGuests: 4, amenities: ['wifi', 'kitchen'],
      availableFrom: '2030-01-01', availableTo: '2030-12-31',
    }, ownerToken);
    check('owner creates property', cp.status === 201 || cp.status === 200, `status=${cp.status}`);
    const propertyId = String(cp.data?.property?.id || cp.data?.property?._id);

    const search = await req('GET', '/api/properties/search?location=san%20jose&startDate=2030-03-01&endDate=2030-03-05&guests=2');
    check('search finds property by city + dates + guests', search.data?.properties?.some((p) => String(p.id) === propertyId), `count=${search.data?.count}`);

    await req('POST', '/api/traveler/signup', { name: 'Tom Traveler', email: `trav${stamp}@test.dev`, password: 'secret123' });
    const tl = await req('POST', '/api/traveler/login', { email: `trav${stamp}@test.dev`, password: 'secret123' });
    check('traveler signup + login returns JWT', tl.status === 200 && tl.data?.token);
    const travelerToken = tl.data.token;

    // Socket auth: no token must be rejected
    let rejected = false;
    try { await connect(undefined); } catch { rejected = true; }
    check('socket rejects connection without JWT', rejected);

    const ownerSocket = await connect(ownerToken);
    const travelerSocket = await connect(travelerToken);
    check('owner + traveler sockets connect with JWT', ownerSocket.connected && travelerSocket.connected);

    const ownerEvent = waitFor(ownerSocket, 'new-booking-request');
    const br = await req('POST', '/api/bookings/request', { propertyId, startDate: '2030-03-01', endDate: '2030-03-05', numGuests: 2, specialRequests: 'Late check-in' }, travelerToken);
    check('traveler requests booking', br.status === 201 || br.status === 200, `status=${br.status}`);
    const bookingId = String(br.data?.booking?.id || br.data?.booking?._id);
    const ev1 = await ownerEvent.catch((e) => ({ error: e.message }));
    check('owner receives real-time "new-booking-request"', ev1?.type === 'NEW_BOOKING_REQUEST' && String(ev1.booking?.id) === bookingId, JSON.stringify(ev1).slice(0, 80));

    const reqs = await req('GET', '/api/bookings/owner/requests', null, ownerToken);
    check('owner sees pending request', reqs.data?.bookings?.some((b) => String(b.id || b._id) === bookingId));

    const travelerEvent = waitFor(travelerSocket, 'booking-status-update');
    const acc = await req('PUT', `/api/bookings/owner/${bookingId}/accept`, null, ownerToken);
    check('owner accepts booking', acc.status === 200, `status=${acc.status}`);
    const ev2 = await travelerEvent.catch((e) => ({ error: e.message }));
    check('traveler receives real-time "booking-status-update" = ACCEPTED', ev2?.status === 'ACCEPTED', JSON.stringify(ev2).slice(0, 80));

    const conflict = await req('POST', '/api/bookings/request', { propertyId, startDate: '2030-03-02', endDate: '2030-03-04', numGuests: 2 }, travelerToken);
    check('overlapping booking is rejected', conflict.status >= 400, `status=${conflict.status}`);

    const fav = await req('POST', '/api/favorites', { propertyId }, travelerToken);
    const favDup = await req('POST', '/api/favorites', { propertyId }, travelerToken);
    const favList = await req('GET', '/api/favorites', null, travelerToken);
    check('favorite add + duplicate guard + list', (fav.status === 201 || fav.status === 200) && favDup.status >= 400 && (favList.data?.favorites || favList.data?.properties || []).length === 1, `add=${fav.status} dup=${favDup.status}`);

    const stats = await req('GET', '/api/bookings/owner/stats', null, ownerToken);
    check('owner stats aggregate', stats.status === 200, JSON.stringify(stats.data).slice(0, 90));

    ownerSocket.close();
    travelerSocket.close();
  } catch (e) {
    console.error('ERROR', e.message);
    console.error(log.slice(-1500));
    results.push(['exception', false]);
  } finally {
    server.kill();
    const failed = results.filter(([, ok]) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  }
})();
