import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Hospital-to-Hospital Secure Inter-Facility Communication & Telemetry Routes
 */

// GET /api/comms/hospitals - List verified facilities for direct comms link
router.get('/hospitals', (req, res) => {
  const hospitals = dataStore.getHospitals({ status: 'VERIFIED' });
  res.json({ success: true, count: hospitals.length, hospitals });
});

// GET /api/comms/messages - Get comms transmission history between two facilities
router.get('/messages', (req, res) => {
  const { hospitalA, hospitalB, limit = 50 } = req.query;
  const messages = dataStore.getHospitalMessages(hospitalA, hospitalB, parseInt(limit));
  res.json({ success: true, count: messages.length, messages });
});

// GET /api/comms/link-status - Check live bilateral link health, latency, and distance
router.get('/link-status', (req, res) => {
  const { hospitalA, hospitalB } = req.query;
  if (!hospitalA || !hospitalB) {
    return res.status(400).json({ success: false, message: 'Both hospitalA and hospitalB query parameters are required.' });
  }

  const status = dataStore.getHospitalLinkStatus(hospitalA, hospitalB);
  res.json({ success: true, status });
});

// POST /api/comms/send - Send real-time clinical dispatch, organ handshake, or telemetry ping
router.post('/send', authenticate, (req, res) => {
  const { 
    toHospitalId, 
    message, 
    messageType = 'CLINICAL_DISPATCH', 
    urgency = 'ROUTINE',
    metadata = {} 
  } = req.body;

  if (!toHospitalId || !message) {
    return res.status(400).json({ success: false, message: 'Recipient facility and message body are required.' });
  }

  const fromHospitalId = req.user.hospitalId;
  const fromHospital = dataStore.getHospitalById(fromHospitalId);
  const toHospital = dataStore.getHospitalById(toHospitalId);

  if (!toHospital) {
    return res.status(404).json({ success: false, message: 'Recipient facility not found in network.' });
  }

  // Calculate live road distance & emergency code red transit time
  const distanceKm = dataStore.calculateHospitalDistance(fromHospitalId, toHospitalId);
  const transitMinutes = dataStore.estimateTransitTime(distanceKm, urgency);

  const packet = dataStore.saveHospitalMessage({
    fromHospitalId,
    fromHospitalName: fromHospital?.name || 'Emergency Facility',
    fromHospitalCode: fromHospital?.code || 'FAC-01',
    toHospitalId,
    toHospitalName: toHospital.name,
    toHospitalCode: toHospital.code,
    senderId: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    message,
    messageType, // 'CLINICAL_DISPATCH', 'ORGAN_HANDSHAKE', 'BED_COORDINATION', 'CODE_RED_INTERLINK', 'PING_TELEMETRY'
    urgency,
    distanceKm,
    estimatedTransitMinutes: transitMinutes,
    metadata
  });

  // Emit WebSocket event to both hospital rooms and global network channel
  const io = req.app.get('io');
  if (io) {
    io.to(`hospital_${fromHospitalId}`).to(`hospital_${toHospitalId}`).emit('hospital_direct_message', packet);
    io.to('network_broadcast').emit('hospital_direct_message', packet);
  }

  res.status(201).json({ success: true, message: packet });
});

export default router;
