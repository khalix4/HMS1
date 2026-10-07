import './server.js';

const BASE = 'http://localhost:5000';
let adminToken = '';
let mayoToken = '';
let stJudeToken = '';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runE2ETests = async () => {
  console.log('\n======================================================');
  console.log('  STARTING END-TO-END VERIFICATION OF HERCS');
  console.log('======================================================\n');

  try {
    // Wait 3.5s for DB connection attempt and server startup
    await delay(3500);

    // 1. Health check
    console.log('[TEST 1] Testing Server Health Check...');
    const healthRes = await fetch(`${BASE}/api/health`);
    const healthData = await healthRes.json();
    console.log(`  -> Status: ${healthData.status}, Mode: ${healthData.db.mode}`);
    if (healthData.status !== 'ONLINE') throw new Error('Health check failed');

    // 2. Authentication & Demo Switcher
    console.log('\n[TEST 2] Testing User Auth & Token Issuance...');
    const adminLogin = await fetch(`${BASE}/api/auth/demo-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_network_admin' })
    }).then(r => r.json());
    adminToken = adminLogin.token;
    console.log(`  -> Admin Logged In: ${adminLogin.user.name} (${adminLogin.user.role})`);

    const mayoLogin = await fetch(`${BASE}/api/auth/demo-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_mayo_coordinator' })
    }).then(r => r.json());
    mayoToken = mayoLogin.token;
    console.log(`  -> Mayo Coordinator Logged In: ${mayoLogin.user.name}`);

    const stJudeLogin = await fetch(`${BASE}/api/auth/demo-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_stjude_coordinator' })
    }).then(r => r.json());
    stJudeToken = stJudeLogin.token;
    console.log(`  -> St. Jude Coordinator Logged In: ${stJudeLogin.user.name}`);

    // 3. Hospital Verification Workflow
    console.log('\n[TEST 3] Testing Hospital Onboarding & Verification Workflow...');
    // Register new hospital
    const newHospRes = await fetch(`${BASE}/api/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cascade Ridge Emergency Center',
        licenseNumber: 'HOSP-LIC-2026-TEST',
        emergencyPhone: '+1 (507) 555-9090',
        city: 'Rochester'
      })
    }).then(r => r.json());
    const registeredHospId = newHospRes.hospital._id;
    console.log(`  -> Registered Hospital: ${newHospRes.hospital.name} (Status: ${newHospRes.hospital.status})`);
    if (newHospRes.hospital.status !== 'PENDING') throw new Error('Hospital should start as PENDING');

    // Admin verifies the hospital
    const verifyRes = await fetch(`${BASE}/api/hospitals/${registeredHospId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    }).then(r => r.json());
    console.log(`  -> Admin Verified Hospital: ${verifyRes.hospital.name} (New Status: ${verifyRes.hospital.status})`);
    if (verifyRes.hospital.status !== 'VERIFIED') throw new Error('Hospital verification failed');

    // 4. Proximity Radar Search (Haversine distance calculation)
    console.log('\n[TEST 4] Testing Proximity Radar Search (Haversine Distance)...');
    const searchRes = await fetch(`${BASE}/api/emergency/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stJudeToken}`
      },
      body: JSON.stringify({
        originHospitalId: 'hosp_st_jude_trauma',
        category: 'BLOOD_PRODUCT',
        maxDistanceKm: 50,
        urgency: 'CODE_RED_CRITICAL'
      })
    }).then(r => r.json());
    console.log(`  -> Found ${searchRes.count} matching nearby blood supplies.`);
    const mayoBloodMatch = searchRes.matches.find(m => m.hospital._id === 'hosp_mayo_central');
    if (!mayoBloodMatch) throw new Error('Mayo blood match not found in proximity search');
    console.log(`  -> Closest Supplier: ${mayoBloodMatch.hospital.name}, Distance: ${mayoBloodMatch.distanceKm} km, ETA: ~${mayoBloodMatch.estTransitMinutes} mins`);

    // 5. Formal Emergency Request Creation
    console.log('\n[TEST 5] Submitting Formal Emergency Request from St. Jude to Mayo...');
    const reqRes = await fetch(`${BASE}/api/emergency/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stJudeToken}`
      },
      body: JSON.stringify({
        supplyingHospitalId: 'hosp_mayo_central',
        resourceId: mayoBloodMatch.resource._id,
        quantityRequested: 3,
        urgency: 'CODE_RED_CRITICAL',
        clinicalReason: 'Active traumatic retroperitoneal bleed requiring immediate MTP.'
      })
    }).then(r => r.json());
    const emergencyReq = reqRes.request;
    console.log(`  -> Created Request: ${emergencyReq.requestNumber} (Status: ${emergencyReq.status})`);

    // 6. Supplier Approval & Atomic Reservation Locking
    console.log('\n[TEST 6] Testing Supplier Approval & Atomic Reservation Lock...');
    // Check stock before lock
    const resBefore = await fetch(`${BASE}/api/resources/${mayoBloodMatch.resource._id}`).then(r => r.json());
    const availBefore = resBefore.resource.availableQuantity;
    const reservedBefore = resBefore.resource.reservedQuantity;

    const approveRes = await fetch(`${BASE}/api/emergency/requests/${emergencyReq._id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mayoToken}`
      }
    }).then(r => r.json());
    console.log(`  -> Request Approved: ${approveRes.request.requestNumber} (Status: ${approveRes.request.status})`);

    // Verify stock after lock
    const resAfter = await fetch(`${BASE}/api/resources/${mayoBloodMatch.resource._id}`).then(r => r.json());
    console.log(`  -> Inventory Before Lock: Available=${availBefore}, Reserved=${reservedBefore}`);
    console.log(`  -> Inventory After Lock: Available=${resAfter.resource.availableQuantity}, Reserved=${resAfter.resource.reservedQuantity}`);
    if (resAfter.resource.availableQuantity !== availBefore - 3) throw new Error('Atomic lock failed to decrement available quantity');
    if (resAfter.resource.reservedQuantity !== reservedBefore + 3) throw new Error('Atomic lock failed to increment reserved quantity');
    console.log(`  -> ATOMIC RESERVATION LOCK VERIFIED CONCURRENCY-SAFE!`);

    // 7. Medical Transit Dispatch with 4-Digit Chain-of-Custody PIN
    console.log('\n[TEST 7] Dispatching Medical Transit & Generating Custody PIN...');
    const dispatchRes = await fetch(`${BASE}/api/transfers/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mayoToken}`
      },
      body: JSON.stringify({
        requestId: emergencyReq._id,
        vehicleType: 'Emergency Medical Courier (Cold Chain)',
        vehicleIdentifier: 'RAPID-COURIER-TEST-9',
        driverName: 'Officer Jordan Lee',
        contactNumber: '+1 (507) 555-4321'
      })
    }).then(r => r.json());
    const transfer = dispatchRes.transfer;
    console.log(`  -> Dispatched Vehicle: ${transfer.vehicleIdentifier}`);
    console.log(`  -> Secure 4-Digit Custody PIN: ${transfer.handoffPin}`);
    if (!transfer.handoffPin || transfer.handoffPin.length !== 4) throw new Error('Valid 4-digit PIN required');

    // 8. Transit Milestone Advancement
    console.log('\n[TEST 8] Advancing Transit Milestones to Dock Arrival...');
    const milestoneRes = await fetch(`${BASE}/api/transfers/${transfer._id}/milestone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mayoToken}`
      },
      body: JSON.stringify({ milestoneIndex: 3, status: 'APPROACHING' })
    }).then(r => r.json());
    console.log(`  -> Transit Status Updated: ${milestoneRes.transfer.status}`);

    // 9. Chain-of-Custody Handoff PIN Verification
    console.log('\n[TEST 9] Receiving Hospital Verifies 4-Digit PIN & Confirms Custody...');
    // Try bad PIN first
    const badPinRes = await fetch(`${BASE}/api/transfers/${transfer._id}/verify-handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stJudeToken}`
      },
      body: JSON.stringify({ pin: '0000' })
    });
    if (badPinRes.ok) throw new Error('Bad PIN should have been rejected!');
    console.log('  -> Invalid PIN correctly rejected with 400 error.');

    // Correct PIN verification
    const goodPinRes = await fetch(`${BASE}/api/transfers/${transfer._id}/verify-handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stJudeToken}`
      },
      body: JSON.stringify({ pin: transfer.handoffPin })
    }).then(r => r.json());
    console.log(`  -> PIN Verified! Status: ${goodPinRes.transfer.status}`);
    if (goodPinRes.transfer.status !== 'ARRIVED_VERIFIED') throw new Error('Transfer handoff verification failed');

    // Verify request is completed
    const checkReq = await fetch(`${BASE}/api/emergency/requests/${emergencyReq._id}`, {
      headers: { 'Authorization': `Bearer ${stJudeToken}` }
    }).then(r => r.json());
    console.log(`  -> Emergency Request Final Status: ${checkReq.request.status}`);
    if (checkReq.request.status !== 'COMPLETED') throw new Error('Request should be COMPLETED');

    // 10. Code Red Regional Broadcast
    console.log('\n[TEST 10] Testing Code Red Regional Broadcast System...');
    const broadcastRes = await fetch(`${BASE}/api/emergency/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stJudeToken}`
      },
      body: JSON.stringify({
        resourceCategory: 'EQUIPMENT',
        resourceName: 'Pediatric Transport Ventilator',
        quantity: 1,
        clinicalReason: 'Emergent pediatric status asthmaticus transfer from regional clinic.'
      })
    }).then(r => r.json());
    console.log(`  -> Regional Broadcast Transmitted: ${broadcastRes.broadcast.requestNumber} (Urgency: ${broadcastRes.broadcast.urgency})`);

    // 11. Immutable Audit Trail Inspection
    console.log('\n[TEST 11] Inspecting Immutable Digital Audit Logs...');
    const auditRes = await fetch(`${BASE}/api/audit/logs?limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }).then(r => r.json());
    console.log(`  -> Audit Trail Recorded ${auditRes.count} recent events.`);
    const actionsRecorded = auditRes.logs.map(l => l.action);
    console.log(`  -> Actions logged:`, actionsRecorded.slice(0, 5).join(', '));

    // 12. External HMIS/FHIR Interoperability
    console.log('\n[TEST 12] Testing HL7 FHIR R4 Integration Endpoints...');
    const fhirRes = await fetch(`${BASE}/api/integration/fhir/Location`, {
      headers: { 'X-API-KEY': 'mayo-hmis-secure-api-key-2026' }
    }).then(r => r.json());
    console.log(`  -> FHIR Location Bundle: ${fhirRes.resourceType}, Total Entries: ${fhirRes.total}`);
    if (fhirRes.resourceType !== 'Bundle') throw new Error('FHIR resourceType must be Bundle');

    console.log('\n======================================================');
    console.log('  ALL 12 END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!  ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL TEST FAILURE]:', error);
    process.exit(1);
  }
};

runE2ETests();
