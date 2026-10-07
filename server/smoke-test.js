import http from 'http';
import './server.js';

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    console.log('[SMOKE TEST] /api/health response:', data);

    const resHosp = await fetch('http://localhost:5000/api/hospitals');
    const dataHosp = await resHosp.json();
    console.log(`[SMOKE TEST] /api/hospitals loaded ${dataHosp.count} hospitals.`);

    const resRes = await fetch('http://localhost:5000/api/resources');
    const dataRes = await resRes.json();
    console.log(`[SMOKE TEST] /api/resources loaded ${dataRes.count} resources.`);

    console.log('[SMOKE TEST] ALL SERVER CHECKS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('[SMOKE TEST ERROR]', err);
    process.exit(1);
  }
}, 3000);
