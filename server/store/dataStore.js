import bcrypt from 'bcryptjs';

/**
 * Universal Reactive Data Store
 * Supports seamless in-memory and persistent document operations.
 * Implements atomic resource reservation locking, haversine distance search,
 * transfer lifecycle management, and immutable audit logs.
 */

// In-Memory Collections
let hospitals = [];
let users = [];
let resources = [];
let emergencyRequests = [];
let transfers = [];
let auditLogs = [];

// Helper to generate UUID-like IDs
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
};

// Calculate Haversine distance in kilometers between two geo-coordinates
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Estimate transit time in minutes given distance
export const estimateTransitMinutes = (distanceKm, urgency = 'ROUTINE') => {
  // Base emergency vehicle speed: ~45 km/h in city traffic, ~65 km/h for Code Red with siren
  const speed = urgency === 'CODE_RED_CRITICAL' ? 65 : 45;
  const timeHours = distanceKm / speed;
  const minutes = Math.ceil(timeHours * 60) + 5; // 5 min staging buffer
  return Math.max(8, minutes);
};

// Seed initial realistic healthcare network
export const seedInitialData = async () => {
  if (hospitals.length > 0) return; // already seeded

  console.log('[SEED] Initializing realistic Mayo Emergency Regional Network data...');

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Admin@1234', salt);

  // 1. Hospitals (Pre-configured realistic regional network)
  hospitals = [
    {
      _id: 'hosp_mayo_central',
      name: 'Mayo Regional Medical Center',
      code: 'MRMC-01',
      category: 'Level-1 Trauma Center',
      status: 'VERIFIED',
      licenseNumber: 'HOSP-LIC-2024-001',
      address: '200 1st St SW',
      city: 'Rochester',
      state: 'MN',
      coordinates: { lat: 44.0225, lng: -92.4668 },
      emergencyPhone: '+1 (507) 284-2511',
      dispatchEmail: 'dispatch@mayo-central.health.org',
      directorName: 'Dr. Sarah Jenkins, MD',
      activeBedsCapacity: 450,
      verifiedAt: new Date('2024-01-10T08:00:00Z')
    },
    {
      _id: 'hosp_st_jude_trauma',
      name: 'St. Jude Memorial Hospital',
      code: 'SJMH-02',
      category: 'Tertiary Care & Trauma',
      status: 'VERIFIED',
      licenseNumber: 'HOSP-LIC-2024-045',
      address: '742 Evergreen Blvd',
      city: 'Rochester',
      state: 'MN',
      coordinates: { lat: 44.038, lng: -92.492 },
      emergencyPhone: '+1 (507) 538-3232',
      dispatchEmail: 'emergency@stjude-memorial.health.org',
      directorName: 'Dr. Marcus Vance, FACS',
      activeBedsCapacity: 320,
      verifiedAt: new Date('2024-01-15T09:30:00Z')
    },
    {
      _id: 'hosp_metro_general',
      name: 'Metro City General Hospital',
      code: 'MCGH-03',
      category: 'General & Acute Care',
      status: 'VERIFIED',
      licenseNumber: 'HOSP-LIC-2024-089',
      address: '1500 North Broadway',
      city: 'Rochester',
      state: 'MN',
      coordinates: { lat: 44.049, lng: -92.463 },
      emergencyPhone: '+1 (507) 255-5555',
      dispatchEmail: 'coordination@metrogeneral.health.org',
      directorName: 'Dr. Elena Rostova, MD',
      activeBedsCapacity: 280,
      verifiedAt: new Date('2024-02-01T10:00:00Z')
    },
    {
      _id: 'hosp_valley_children',
      name: "Valley Children's & Specialty Hospital",
      code: 'VCSH-04',
      category: 'Pediatric Specialty',
      status: 'VERIFIED',
      licenseNumber: 'HOSP-LIC-2024-112',
      address: '890 Valley Park Dr',
      city: 'Oronoco',
      state: 'MN',
      coordinates: { lat: 44.148, lng: -92.531 },
      emergencyPhone: '+1 (507) 367-9900',
      dispatchEmail: 'pediatric-dispatch@valleychildren.health.org',
      directorName: 'Dr. Kevin Thorne, MD',
      activeBedsCapacity: 190,
      verifiedAt: new Date('2024-02-15T11:20:00Z')
    },
    {
      _id: 'hosp_pinecrest_pending',
      name: 'Pinecrest Community Medical Center',
      code: 'PCMC-05',
      category: 'Community Hospital',
      status: 'PENDING',
      licenseNumber: 'HOSP-LIC-2026-902',
      address: '410 Pine Hollow Way',
      city: 'Stewartville',
      state: 'MN',
      coordinates: { lat: 43.856, lng: -92.491 },
      emergencyPhone: '+1 (507) 533-4000',
      dispatchEmail: 'admin@pinecrestmed.org',
      directorName: 'Dr. Arthur Campbell',
      activeBedsCapacity: 85,
      verifiedAt: null
    }
  ];

  // 2. Users (Ready-to-use accounts with different roles)
  users = [
    {
      _id: 'usr_network_admin',
      name: 'Eleanor Vance',
      email: 'admin@mayonetwork.org',
      password: defaultPasswordHash,
      role: 'NETWORK_ADMIN',
      hospitalId: 'hosp_mayo_central',
      department: 'Regional Healthcare Directorate',
      phone: '+1 (507) 284-0001',
      isActive: true
    },
    {
      _id: 'usr_mayo_coordinator',
      name: 'Dr. Marcus Hayes, MD',
      email: 'coordinator@mayo.org',
      password: defaultPasswordHash,
      role: 'RESOURCE_COORDINATOR',
      hospitalId: 'hosp_mayo_central',
      department: 'Emergency & Critical Care',
      phone: '+1 (507) 284-0002',
      isActive: true
    },
    {
      _id: 'usr_stjude_coordinator',
      name: 'Nurse Sandra Miller, RN',
      email: 'coordinator@stjude.org',
      password: defaultPasswordHash,
      role: 'RESOURCE_COORDINATOR',
      hospitalId: 'hosp_st_jude_trauma',
      department: 'Trauma Resource Dispatch',
      phone: '+1 (507) 538-0001',
      isActive: true
    },
    {
      _id: 'usr_metro_coordinator',
      name: 'David Chen, Dispatch Lead',
      email: 'coordinator@metrogeneral.org',
      password: defaultPasswordHash,
      role: 'RESOURCE_COORDINATOR',
      hospitalId: 'hosp_metro_general',
      department: 'Resource Coordination Center',
      phone: '+1 (507) 255-0001',
      isActive: true
    },
    {
      _id: 'usr_valley_physician',
      name: 'Dr. Maya Lin, MD (Pediatric Intensivist)',
      email: 'physician@valleychildren.org',
      password: defaultPasswordHash,
      role: 'PHYSICIAN',
      hospitalId: 'hosp_valley_children',
      department: 'Pediatric ICU',
      phone: '+1 (507) 367-0001',
      isActive: true
    },
    {
      _id: 'usr_dispatcher_dan',
      name: 'Dan Walker (Lead Transfer Officer)',
      email: 'dispatch@mayonetwork.org',
      password: defaultPasswordHash,
      role: 'TRANSFER_DISPATCHER',
      hospitalId: 'hosp_mayo_central',
      department: 'Regional EMS Dispatch',
      phone: '+1 (507) 284-0009',
      isActive: true
    }
  ];

  // 3. Resources across hospitals (ICU Beds, Blood Products, Equipment, Specialists, Critical Medications)
  resources = [
    // Mayo Central Resources
    {
      _id: 'res_01',
      hospitalId: 'hosp_mayo_central',
      category: 'ICU_BED',
      name: 'Adult ICU Bed',
      specification: 'Negative Pressure Isolation / HEPA',
      totalQuantity: 24,
      availableQuantity: 5,
      reservedQuantity: 2,
      inUseQuantity: 17,
      unitOfMeasure: 'Beds',
      status: 'AVAILABLE',
      criticalThreshold: 3,
      notes: 'Monitored with 24/7 central telemetry and ECMO ready.'
    },
    {
      _id: 'res_02',
      hospitalId: 'hosp_mayo_central',
      category: 'BLOOD_PRODUCT',
      name: 'O- Negative Blood Units',
      specification: 'Universal Donor PRBC (Leukoreduced)',
      totalQuantity: 30,
      availableQuantity: 12,
      reservedQuantity: 4,
      inUseQuantity: 14,
      unitOfMeasure: 'Units (450ml)',
      status: 'AVAILABLE',
      criticalThreshold: 5,
      notes: 'Stored at 4°C with barcode batch tracking.'
    },
    {
      _id: 'res_03',
      hospitalId: 'hosp_mayo_central',
      category: 'EQUIPMENT',
      name: 'ECMO Machine (Extracorporeal Membrane Oxygenation)',
      specification: 'Cardiohelp Mobile System (V-A & V-V capable)',
      totalQuantity: 4,
      availableQuantity: 1,
      reservedQuantity: 0,
      inUseQuantity: 3,
      unitOfMeasure: 'Units',
      status: 'CRITICAL_LOW',
      criticalThreshold: 1,
      notes: 'Includes cannulation kit and perfusionist standby.'
    },
    {
      _id: 'res_04',
      hospitalId: 'hosp_mayo_central',
      category: 'SPECIALIST',
      name: 'Interventional Neurosurgeon On-Call',
      specification: 'Acute Stroke & Craniotomy Trauma Team',
      totalQuantity: 2,
      availableQuantity: 1,
      reservedQuantity: 0,
      inUseQuantity: 1,
      unitOfMeasure: 'Physicians',
      status: 'AVAILABLE',
      criticalThreshold: 1,
      notes: 'Sub-30 minute surgical response window.'
    },
    {
      _id: 'res_05',
      hospitalId: 'hosp_mayo_central',
      category: 'CRITICAL_MEDICATION',
      name: 'CroFab Crotalidae Antivenin',
      specification: 'Equine Polyvalent Lyophilized 10 Vials',
      totalQuantity: 15,
      availableQuantity: 8,
      reservedQuantity: 1,
      inUseQuantity: 6,
      unitOfMeasure: 'Vials',
      status: 'AVAILABLE',
      criticalThreshold: 2,
      notes: 'Stored in emergency pharmacy vault.'
    },

    // St. Jude Memorial Resources
    {
      _id: 'res_06',
      hospitalId: 'hosp_st_jude_trauma',
      category: 'ICU_BED',
      name: 'Adult ICU Bed',
      specification: 'Level-1 Surgical Trauma ICU',
      totalQuantity: 18,
      availableQuantity: 2,
      reservedQuantity: 1,
      inUseQuantity: 15,
      unitOfMeasure: 'Beds',
      status: 'CRITICAL_LOW',
      criticalThreshold: 3,
      notes: 'Direct bridge to Trauma OR suite 4.'
    },
    {
      _id: 'res_07',
      hospitalId: 'hosp_st_jude_trauma',
      category: 'EQUIPMENT',
      name: 'Mechanical Ventilator (Hamilton-C6)',
      specification: 'High-end ICU & transport ventilation',
      totalQuantity: 16,
      availableQuantity: 6,
      reservedQuantity: 2,
      inUseQuantity: 8,
      unitOfMeasure: 'Units',
      status: 'AVAILABLE',
      criticalThreshold: 3,
      notes: 'Adaptive Support Ventilation (ASV) enabled.'
    },
    {
      _id: 'res_08',
      hospitalId: 'hosp_st_jude_trauma',
      category: 'BLOOD_PRODUCT',
      name: 'Platelets (Apheresis)',
      specification: 'HLA-Matched Single Donor Units',
      totalQuantity: 10,
      availableQuantity: 3,
      reservedQuantity: 1,
      inUseQuantity: 6,
      unitOfMeasure: 'Units',
      status: 'AVAILABLE',
      criticalThreshold: 2,
      notes: 'Agitated at room temperature (22°C).'
    },
    {
      _id: 'res_09',
      hospitalId: 'hosp_st_jude_trauma',
      category: 'SPECIALIST',
      name: 'Vascular Trauma Surgeon On-Call',
      specification: 'Major aortic and peripheral vascular reconstruction',
      totalQuantity: 2,
      availableQuantity: 2,
      reservedQuantity: 0,
      inUseQuantity: 0,
      unitOfMeasure: 'Physicians',
      status: 'AVAILABLE',
      criticalThreshold: 1,
      notes: 'Available for emergency consult or fly-in.'
    },

    // Metro City General Resources
    {
      _id: 'res_10',
      hospitalId: 'hosp_metro_general',
      category: 'BLOOD_PRODUCT',
      name: 'O+ Positive Blood Units',
      specification: 'Packed Red Blood Cells',
      totalQuantity: 40,
      availableQuantity: 22,
      reservedQuantity: 3,
      inUseQuantity: 15,
      unitOfMeasure: 'Units (450ml)',
      status: 'AVAILABLE',
      criticalThreshold: 6,
      notes: 'Verified screened units.'
    },
    {
      _id: 'res_11',
      hospitalId: 'hosp_metro_general',
      category: 'EQUIPMENT',
      name: 'Mobile Hemodialysis Machine (NxStage)',
      specification: 'Continuous Renal Replacement (CRRT)',
      totalQuantity: 6,
      availableQuantity: 3,
      reservedQuantity: 0,
      inUseQuantity: 3,
      unitOfMeasure: 'Units',
      status: 'AVAILABLE',
      criticalThreshold: 1,
      notes: 'Includes dialysate cartridges.'
    },
    {
      _id: 'res_12',
      hospitalId: 'hosp_metro_general',
      category: 'ICU_BED',
      name: 'Cardiac Care Unit (CCU) Bed',
      specification: 'Post-Cath Intervention Monitoring',
      totalQuantity: 12,
      availableQuantity: 4,
      reservedQuantity: 1,
      inUseQuantity: 7,
      unitOfMeasure: 'Beds',
      status: 'AVAILABLE',
      criticalThreshold: 2,
      notes: 'Dedicated cardiac telemetry.'
    },

    // Valley Children's Resources
    {
      _id: 'res_13',
      hospitalId: 'hosp_valley_children',
      category: 'ICU_BED',
      name: 'Pediatric ICU Bed (PICU)',
      specification: 'Infant & Child Critical Care Isolette',
      totalQuantity: 14,
      availableQuantity: 4,
      reservedQuantity: 1,
      inUseQuantity: 9,
      unitOfMeasure: 'Beds',
      status: 'AVAILABLE',
      criticalThreshold: 2,
      notes: 'Full pediatric respiratory support.'
    },
    {
      _id: 'res_14',
      hospitalId: 'hosp_valley_children',
      category: 'ICU_BED',
      name: 'Neonatal ICU Bed (NICU)',
      specification: 'Level IV Neonatal Critical Incubator',
      totalQuantity: 16,
      availableQuantity: 5,
      reservedQuantity: 0,
      inUseQuantity: 11,
      unitOfMeasure: 'Beds',
      status: 'AVAILABLE',
      criticalThreshold: 3,
      notes: 'High frequency oscillatory ventilation attached.'
    },
    {
      _id: 'res_15',
      hospitalId: 'hosp_valley_children',
      category: 'EQUIPMENT',
      name: 'Transport Infant Incubator',
      specification: 'Battery-backed thermal air-ambulance unit',
      totalQuantity: 3,
      availableQuantity: 2,
      reservedQuantity: 0,
      inUseQuantity: 1,
      unitOfMeasure: 'Units',
      status: 'AVAILABLE',
      criticalThreshold: 1,
      notes: 'FAA and ground ambulance certified.'
    }
  ];

  // 4. Initial Emergency Requests (Demonstrating active workflows)
  emergencyRequests = [
    {
      _id: 'req_001',
      requestNumber: 'REQ-2026-0811',
      requestingHospitalId: 'hosp_st_jude_trauma',
      supplyingHospitalId: 'hosp_mayo_central',
      resourceId: 'res_02',
      resourceCategory: 'BLOOD_PRODUCT',
      resourceName: 'O- Negative Blood Units',
      quantityRequested: 4,
      urgency: 'CODE_RED_CRITICAL',
      clinicalReason: 'Multi-vehicle collision trauma with hemorrhagic shock; acute blood loss > 2000ml.',
      patientSummary: 'Male, 34yo, emergent laparatomy in OR-2',
      status: 'TRANSFER_DISPATCHED',
      requestedAt: new Date(Date.now() - 42 * 60 * 1000), // 42 mins ago
      reviewedAt: new Date(Date.now() - 36 * 60 * 1000),
      dispatchedAt: new Date(Date.now() - 25 * 60 * 1000),
      completedAt: null,
      transferId: 'trf_001'
    },
    {
      _id: 'req_002',
      requestNumber: 'REQ-2026-0812',
      requestingHospitalId: 'hosp_metro_general',
      supplyingHospitalId: 'hosp_mayo_central',
      resourceId: 'res_01',
      resourceCategory: 'ICU_BED',
      resourceName: 'Adult ICU Bed',
      quantityRequested: 1,
      urgency: 'URGENT',
      clinicalReason: 'Acute Respiratory Distress Syndrome (ARDS) secondary to severe sepsis.',
      patientSummary: 'Female, 62yo, mechanical vent dependent',
      status: 'APPROVED_RESERVED',
      requestedAt: new Date(Date.now() - 15 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 8 * 60 * 1000),
      dispatchedAt: null,
      completedAt: null,
      transferId: null
    }
  ];

  // 5. Active Transfers
  transfers = [
    {
      _id: 'trf_001',
      requestId: 'req_001',
      requestNumber: 'REQ-2026-0811',
      fromHospitalId: 'hosp_mayo_central',
      toHospitalId: 'hosp_st_jude_trauma',
      resourceName: 'O- Negative Blood Units (4 Units)',
      vehicleType: 'Emergency Medical Courier (Cold Chain)',
      vehicleIdentifier: 'RAPID-COURIER-07',
      driverName: 'Officer Robert Ross',
      contactNumber: '+1 (507) 991-3849',
      distanceKm: 3.4,
      estimatedMinutes: 10,
      status: 'EN_ROUTE',
      handoffPin: '4821', // 4-digit verification PIN for receiving hospital
      startedAt: new Date(Date.now() - 25 * 60 * 1000),
      etaTimestamp: new Date(Date.now() + 5 * 60 * 1000), // 5 min remaining
      milestones: [
        { label: 'Dispatch Order Received', timestamp: new Date(Date.now() - 25 * 60 * 1000), done: true },
        { label: 'Biological Cold Box Secured & Tagged', timestamp: new Date(Date.now() - 22 * 60 * 1000), done: true },
        { label: 'Departed Mayo Central Bay 3', timestamp: new Date(Date.now() - 18 * 60 * 1000), done: true },
        { label: 'Approaching St. Jude Trauma Dock', timestamp: new Date(Date.now() - 3 * 60 * 1000), done: true },
        { label: 'Handoff PIN Verification & Reception', timestamp: null, done: false }
      ]
    }
  ];

  // 6. Audit Trail
  auditLogs = [
    {
      _id: 'log_01',
      timestamp: new Date(Date.now() - 42 * 60 * 1000),
      action: 'EMERGENCY_REQUEST_SUBMITTED',
      severity: 'CRITICAL',
      actorName: 'Nurse Sandra Miller, RN',
      actorRole: 'RESOURCE_COORDINATOR',
      hospitalName: 'St. Jude Memorial Hospital',
      details: 'Submitted CODE RED Emergency Request for 4 Units of O- Negative Blood.',
      requestId: 'req_001',
      ipAddress: '192.168.10.45'
    },
    {
      _id: 'log_02',
      timestamp: new Date(Date.now() - 36 * 60 * 1000),
      action: 'RESERVATION_LOCKED',
      severity: 'NORMAL',
      actorName: 'Dr. Marcus Hayes, MD',
      actorRole: 'RESOURCE_COORDINATOR',
      hospitalName: 'Mayo Regional Medical Center',
      details: 'Approved request REQ-2026-0811. 4 units of O- Negative Blood atomically reserved.',
      requestId: 'req_001',
      ipAddress: '192.168.10.12'
    },
    {
      _id: 'log_03',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      action: 'TRANSFER_DISPATCHED',
      severity: 'NORMAL',
      actorName: 'Dan Walker',
      actorRole: 'TRANSFER_DISPATCHER',
      hospitalName: 'Mayo Regional Medical Center',
      details: 'Dispatched Emergency Courier RAPID-COURIER-07 with cold chain verification code.',
      requestId: 'req_001',
      ipAddress: '192.168.10.19'
    }
  ];

  console.log(`[SEED] Preloaded ${hospitals.length} hospitals, ${resources.length} critical resources, ${users.length} authorized users.`);
};

// Data Store Accessors & Mutators
export const dataStore = {
  // Hospitals
  getHospitals: (filter = {}) => {
    let result = [...hospitals];
    if (filter.status) result = result.filter(h => h.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(h => h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q) || h.city.toLowerCase().includes(q));
    }
    return result;
  },
  getHospitalById: id => hospitals.find(h => h._id === id),
  createHospital: data => {
    const newHospital = {
      _id: generateId('hosp'),
      status: 'PENDING',
      createdAt: new Date(),
      ...data
    };
    hospitals.push(newHospital);
    return newHospital;
  },
  updateHospitalStatus: (id, status) => {
    const hosp = hospitals.find(h => h._id === id);
    if (hosp) {
      hosp.status = status;
      if (status === 'VERIFIED') hosp.verifiedAt = new Date();
    }
    return hosp;
  },

  // Users
  getUsers: () => [...users],
  getUserById: id => users.find(u => u._id === id),
  getUserByEmail: email => users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  createUser: data => {
    const newUser = {
      _id: generateId('usr'),
      createdAt: new Date(),
      isActive: true,
      ...data
    };
    users.push(newUser);
    return newUser;
  },

  // Resources & Atomic Locking
  getResources: (filter = {}) => {
    let result = [...resources];
    if (filter.hospitalId) result = result.filter(r => r.hospitalId === filter.hospitalId);
    if (filter.category) result = result.filter(r => r.category === filter.category);
    if (filter.status) result = result.filter(r => r.status === filter.status);
    if (filter.availableOnly) result = result.filter(r => r.availableQuantity > 0);
    return result;
  },
  getResourceById: id => resources.find(r => r._id === id),
  createResource: data => {
    const newRes = {
      _id: generateId('res'),
      totalQuantity: Number(data.totalQuantity) || 0,
      availableQuantity: Number(data.availableQuantity) || Number(data.totalQuantity) || 0,
      reservedQuantity: 0,
      inUseQuantity: 0,
      status: 'AVAILABLE',
      updatedAt: new Date(),
      ...data
    };
    resources.push(newRes);
    return newRes;
  },
  updateResource: (id, updates) => {
    const res = resources.find(r => r._id === id);
    if (res) {
      Object.assign(res, updates, { updatedAt: new Date() });
      // Re-evaluate status
      if (res.availableQuantity <= 0) {
        res.status = 'DEPLETED';
      } else if (res.availableQuantity <= (res.criticalThreshold || 2)) {
        res.status = 'CRITICAL_LOW';
      } else {
        res.status = 'AVAILABLE';
      }
    }
    return res;
  },
  // Atomic Reservation Hold
  lockResourceReservation: (resourceId, quantity) => {
    const res = resources.find(r => r._id === resourceId);
    if (!res) throw new Error('Resource not found');
    if (res.availableQuantity < quantity) {
      throw new Error(`Insufficient available capacity. Requested: ${quantity}, Available: ${res.availableQuantity}`);
    }
    // Decrement available, increment reserved
    res.availableQuantity -= quantity;
    res.reservedQuantity += quantity;
    if (res.availableQuantity <= 0) {
      res.status = 'DEPLETED';
    } else if (res.availableQuantity <= (res.criticalThreshold || 2)) {
      res.status = 'CRITICAL_LOW';
    }
    res.updatedAt = new Date();
    return res;
  },
  // Release Reservation Hold (e.g. if request declined or cancelled)
  releaseResourceReservation: (resourceId, quantity) => {
    const res = resources.find(r => r._id === resourceId);
    if (res) {
      const releaseQty = Math.min(quantity, res.reservedQuantity);
      res.reservedQuantity -= releaseQty;
      res.availableQuantity += releaseQty;
      if (res.availableQuantity > (res.criticalThreshold || 2)) {
        res.status = 'AVAILABLE';
      } else if (res.availableQuantity > 0) {
        res.status = 'CRITICAL_LOW';
      }
      res.updatedAt = new Date();
    }
    return res;
  },
  // Finalize Reservation into In-Use or Handed Off
  finalizeResourceHandoff: (resourceId, quantity) => {
    const res = resources.find(r => r._id === resourceId);
    if (res) {
      const moveQty = Math.min(quantity, res.reservedQuantity);
      res.reservedQuantity -= moveQty;
      res.inUseQuantity += moveQty;
      res.updatedAt = new Date();
    }
    return res;
  },

  // Emergency Proximity Search
  searchEmergencyResources: ({ originHospitalId, category, resourceName, maxDistanceKm = 100, urgency = 'ROUTINE' }) => {
    const origin = hospitals.find(h => h._id === originHospitalId);
    if (!origin) throw new Error('Origin hospital not found');

    const matches = [];

    for (const res of resources) {
      // Exclude origin hospital's own resources
      if (res.hospitalId === originHospitalId) continue;
      // Filter by category if specified
      if (category && res.category !== category) continue;
      // Filter by name pattern if specified
      if (resourceName && !res.name.toLowerCase().includes(resourceName.toLowerCase())) continue;
      // Must have at least 1 available
      if (res.availableQuantity <= 0) continue;

      const hosp = hospitals.find(h => h._id === res.hospitalId);
      // Supplying hospital must be verified
      if (!hosp || hosp.status !== 'VERIFIED') continue;

      const distanceKm = calculateDistanceKm(
        origin.coordinates?.lat,
        origin.coordinates?.lng,
        hosp.coordinates?.lat,
        hosp.coordinates?.lng
      );

      if (distanceKm <= maxDistanceKm) {
        const estTransitMinutes = estimateTransitMinutes(distanceKm, urgency);
        matches.push({
          resource: res,
          hospital: hosp,
          distanceKm,
          estTransitMinutes,
          urgencyRecommendation: estTransitMinutes <= 30 ? 'HIGH_FEASIBILITY' : 'MODERATE_TRANSIT'
        });
      }
    }

    // Sort by shortest transit time / closest distance
    return matches.sort((a, b) => a.distanceKm - b.distanceKm);
  },

  // Emergency Requests
  getRequests: (filter = {}) => {
    let result = [...emergencyRequests];
    if (filter.hospitalId) {
      result = result.filter(r => r.requestingHospitalId === filter.hospitalId || r.supplyingHospitalId === filter.hospitalId);
    }
    if (filter.status) result = result.filter(r => r.status === filter.status);
    if (filter.urgency) result = result.filter(r => r.urgency === filter.urgency);
    // Sort newest first
    return result.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  },
  getRequestById: id => emergencyRequests.find(r => r._id === id),
  createRequest: data => {
    const count = emergencyRequests.length + 1;
    const year = new Date().getFullYear();
    const newRequest = {
      _id: generateId('req'),
      requestNumber: `REQ-${year}-${String(count).padStart(4, '0')}`,
      status: 'REQUESTED',
      requestedAt: new Date(),
      reviewedAt: null,
      dispatchedAt: null,
      completedAt: null,
      transferId: null,
      ...data
    };
    emergencyRequests.push(newRequest);
    return newRequest;
  },
  updateRequest: (id, updates) => {
    const req = emergencyRequests.find(r => r._id === id);
    if (req) {
      Object.assign(req, updates);
    }
    return req;
  },

  // Transfer Tracking
  getTransfers: (filter = {}) => {
    let result = [...transfers];
    if (filter.hospitalId) {
      result = result.filter(t => t.fromHospitalId === filter.hospitalId || t.toHospitalId === filter.hospitalId);
    }
    if (filter.status) result = result.filter(t => t.status === filter.status);
    return result.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  },
  getTransferById: id => transfers.find(t => t._id === id),
  createTransfer: data => {
    // Generate secure 4-digit PIN for receiving hospital verification
    const handoffPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newTransfer = {
      _id: generateId('trf'),
      status: 'DISPATCHED',
      startedAt: new Date(),
      handoffPin,
      milestones: [
        { label: 'Dispatch Order Received', timestamp: new Date(), done: true },
        { label: 'Resource Secured & Inspected', timestamp: new Date(), done: true },
        { label: 'Departed Facility', timestamp: new Date(), done: true },
        { label: 'Approaching Destination', timestamp: null, done: false },
        { label: 'Handoff Verification & Completed', timestamp: null, done: false }
      ],
      ...data
    };
    transfers.push(newTransfer);
    return newTransfer;
  },
  updateTransferMilestone: (id, milestoneIndex, status) => {
    const trf = transfers.find(t => t._id === id);
    if (trf && trf.milestones[milestoneIndex]) {
      trf.milestones[milestoneIndex].done = true;
      trf.milestones[milestoneIndex].timestamp = new Date();
      if (status) trf.status = status;
    }
    return trf;
  },
  verifyTransferHandoffPin: (id, enteredPin, confirmedBy) => {
    const trf = transfers.find(t => t._id === id);
    if (!trf) throw new Error('Transfer record not found');
    if (trf.handoffPin !== enteredPin) {
      throw new Error('Invalid Handoff PIN. Verification rejected for patient/resource safety.');
    }
    trf.status = 'ARRIVED_VERIFIED';
    trf.completedAt = new Date();
    trf.confirmedBy = confirmedBy;
    // mark all milestones done
    trf.milestones.forEach(m => {
      m.done = true;
      if (!m.timestamp) m.timestamp = new Date();
    });
    return trf;
  },

  // Audit Logs
  getAuditLogs: (limit = 100) => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },
  addAuditLog: entry => {
    const log = {
      _id: generateId('log'),
      timestamp: new Date(),
      ...entry
    };
    auditLogs.push(log);
    return log;
  },

  // Analytics Aggregation
  getNetworkAnalytics: () => {
    const totalHospitals = hospitals.length;
    const verifiedHospitals = hospitals.filter(h => h.status === 'VERIFIED').length;
    
    let totalICUBeds = 0;
    let availableICUBeds = 0;
    let totalBloodUnits = 0;
    let availableBloodUnits = 0;
    let totalEquipment = 0;
    let availableEquipment = 0;

    for (const r of resources) {
      if (r.category === 'ICU_BED') {
        totalICUBeds += r.totalQuantity;
        availableICUBeds += r.availableQuantity;
      } else if (r.category === 'BLOOD_PRODUCT') {
        totalBloodUnits += r.totalQuantity;
        availableBloodUnits += r.availableQuantity;
      } else if (r.category === 'EQUIPMENT') {
        totalEquipment += r.totalQuantity;
        availableEquipment += r.availableQuantity;
      }
    }

    const activeRequests = emergencyRequests.filter(r => !['COMPLETED', 'DECLINED', 'CANCELLED'].includes(r.status));
    const codeRedRequests = activeRequests.filter(r => r.urgency === 'CODE_RED_CRITICAL');
    const activeTransfers = transfers.filter(t => !['ARRIVED_VERIFIED', 'CANCELLED'].includes(t.status));

    return {
      totalHospitals,
      verifiedHospitals,
      resources: {
        totalICUBeds,
        availableICUBeds,
        icuOccupancyPercent: totalICUBeds ? Math.round(((totalICUBeds - availableICUBeds) / totalICUBeds) * 100) : 0,
        totalBloodUnits,
        availableBloodUnits,
        totalEquipment,
        availableEquipment
      },
      requests: {
        totalRequests: emergencyRequests.length,
        activeRequestsCount: activeRequests.length,
        codeRedActiveCount: codeRedRequests.length,
        fulfilledCount: emergencyRequests.filter(r => r.status === 'COMPLETED').length
      },
      activeTransfersCount: activeTransfers.length
    };
  }
};
