import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/hospitals
router.get('/', (req, res) => {
  const { status, search } = req.query;
  const hospitals = dataStore.getHospitals({ status, search });
  res.json({ success: true, count: hospitals.length, hospitals });
});

// GET /api/hospitals/:id
router.get('/:id', (req, res) => {
  const hospital = dataStore.getHospitalById(req.params.id);
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital facility not found.' });
  }
  const hospitalResources = dataStore.getResources({ hospitalId: hospital._id });
  res.json({ success: true, hospital, resources: hospitalResources });
});

// POST /api/hospitals (Registration of new facility)
router.post('/', (req, res) => {
  try {
    const { name, code, category, licenseNumber, address, city, state, coordinates, emergencyPhone, dispatchEmail, directorName, activeBedsCapacity } = req.body;

    if (!name || !licenseNumber || !emergencyPhone) {
      return res.status(400).json({ success: false, message: 'Hospital name, license number, and emergency phone are required.' });
    }

    const newHospital = dataStore.createHospital({
      name,
      code: code || `HOSP-${Math.floor(10 + Math.random() * 90)}`,
      category: category || 'General Hospital',
      licenseNumber,
      address: address || '100 Medical Center Way',
      city: city || 'Rochester',
      state: state || 'MN',
      coordinates: coordinates || { lat: 44.02, lng: -92.46 },
      emergencyPhone,
      dispatchEmail: dispatchEmail || 'dispatch@facility.health.org',
      directorName: directorName || 'Medical Director',
      activeBedsCapacity: Number(activeBedsCapacity) || 100
    });

    dataStore.addAuditLog({
      action: 'HOSPITAL_REGISTERED',
      severity: 'NORMAL',
      actorName: 'Self-Registration Portal',
      actorRole: 'APPLICANT',
      hospitalName: newHospital.name,
      details: `New hospital applied for network verification. License: ${licenseNumber}`,
      ipAddress: req.ip
    });

    // Notify connected network admins via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('hospital_registered', {
        message: `New hospital "${newHospital.name}" submitted for verification`,
        hospital: newHospital
      });
    }

    res.status(201).json({
      success: true,
      message: 'Hospital registration submitted successfully. Pending Network Administrator verification.',
      hospital: newHospital
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/hospitals/:id/status (Network Admin verification)
router.patch('/:id/status', authenticate, authorizeRoles('NETWORK_ADMIN'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['VERIFIED', 'PENDING', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be VERIFIED, PENDING, or SUSPENDED.' });
    }

    const updated = dataStore.updateHospitalStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    dataStore.addAuditLog({
      action: `HOSPITAL_${status}`,
      severity: status === 'VERIFIED' ? 'NORMAL' : 'WARNING',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: updated.name,
      details: `Hospital verification status updated to ${status} by Network Admin`,
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('hospital_status_changed', {
        hospitalId: updated._id,
        status,
        message: `Hospital "${updated.name}" is now ${status}`
      });
    }

    res.json({ success: true, hospital: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
