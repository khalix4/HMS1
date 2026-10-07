import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to enrich request with hospital and resource details
const enrichRequest = (reqDoc) => {
  const requestingHosp = dataStore.getHospitalById(reqDoc.requestingHospitalId);
  const supplyingHosp = dataStore.getHospitalById(reqDoc.supplyingHospitalId);
  const resource = dataStore.getResourceById(reqDoc.resourceId);
  const transfer = reqDoc.transferId ? dataStore.getTransferById(reqDoc.transferId) : null;

  return {
    ...reqDoc,
    requestingHospital: requestingHosp || null,
    supplyingHospital: supplyingHosp || null,
    resource: resource || null,
    transfer: transfer || null
  };
};

// POST /api/emergency/search (Proximity Search with Haversine algorithm)
router.post('/search', authenticate, (req, res) => {
  try {
    const { category, resourceName, maxDistanceKm, urgency } = req.body;
    const originHospitalId = req.body.originHospitalId || req.user.hospitalId;

    if (!originHospitalId) {
      return res.status(400).json({ success: false, message: 'Origin hospital ID is required for proximity radar calculation.' });
    }

    const matches = dataStore.searchEmergencyResources({
      originHospitalId,
      category,
      resourceName,
      maxDistanceKm: Number(maxDistanceKm) || 150,
      urgency: urgency || 'ROUTINE'
    });

    res.json({
      success: true,
      originHospital: dataStore.getHospitalById(originHospitalId),
      searchParams: { category, resourceName, maxDistanceKm, urgency },
      count: matches.length,
      matches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/emergency/broadcast (Code Red Emergency Regional Broadcast)
router.post('/broadcast', authenticate, (req, res) => {
  try {
    const { resourceCategory, resourceName, quantity, clinicalReason, patientSummary } = req.body;
    const requestingHospitalId = req.user.hospitalId;
    const hosp = dataStore.getHospitalById(requestingHospitalId);

    if (!resourceName || !quantity) {
      return res.status(400).json({ success: false, message: 'Resource name and required quantity are required.' });
    }

    const broadcastRequest = dataStore.createRequest({
      requestingHospitalId,
      supplyingHospitalId: null, // Broadcast to all network facilities
      isBroadcast: true,
      resourceId: null,
      resourceCategory: resourceCategory || 'CRITICAL_SUPPLY',
      resourceName,
      quantityRequested: Number(quantity),
      urgency: 'CODE_RED_CRITICAL',
      clinicalReason: clinicalReason || 'Immediate life-threat emergency requiring urgent inter-hospital resource allocation.',
      patientSummary: patientSummary || 'Critical patient in emergency resuscitation.'
    });

    dataStore.addAuditLog({
      action: 'EMERGENCY_BROADCAST',
      severity: 'CRITICAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: hosp?.name || 'Requesting Hospital',
      details: `BROADCAST CODE RED: Need ${quantity} ${resourceName}. Urgency: IMMEDIATE`,
      requestId: broadcastRequest._id,
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('code_red_broadcast', {
        broadcastId: broadcastRequest._id,
        requestNumber: broadcastRequest.requestNumber,
        hospitalName: hosp?.name || 'Regional Facility',
        resourceName,
        quantity,
        clinicalReason: broadcastRequest.clinicalReason,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Code Red broadcast successfully propagated across regional network.',
      broadcast: enrichRequest(broadcastRequest)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/emergency/requests (Formal Request creation)
router.post('/requests', authenticate, (req, res) => {
  try {
    const { supplyingHospitalId, resourceId, quantityRequested, urgency, clinicalReason, patientSummary, requestedEtaMinutes } = req.body;
    const requestingHospitalId = req.user.hospitalId;

    if (!supplyingHospitalId || !resourceId || !quantityRequested) {
      return res.status(400).json({ success: false, message: 'Supplying hospital, resource ID, and requested quantity are required.' });
    }

    const resource = dataStore.getResourceById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Target resource not found.' });
    }

    const requestingHosp = dataStore.getHospitalById(requestingHospitalId);
    const supplyingHosp = dataStore.getHospitalById(supplyingHospitalId);

    const newReq = dataStore.createRequest({
      requestingHospitalId,
      supplyingHospitalId,
      resourceId,
      resourceCategory: resource.category,
      resourceName: resource.name,
      quantityRequested: Number(quantityRequested),
      urgency: urgency || 'URGENT',
      clinicalReason: clinicalReason || 'Critical emergency requirement',
      patientSummary: patientSummary || '',
      requestedEtaMinutes: Number(requestedEtaMinutes) || 45
    });

    dataStore.addAuditLog({
      action: 'EMERGENCY_REQUEST_SUBMITTED',
      severity: urgency === 'CODE_RED_CRITICAL' ? 'CRITICAL' : 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: requestingHosp?.name || 'Requesting Hospital',
      details: `Submitted request ${newReq.requestNumber} to ${supplyingHosp?.name} for ${quantityRequested}x ${resource.name}`,
      requestId: newReq._id,
      ipAddress: req.ip
    });

    const enriched = enrichRequest(newReq);

    const io = req.app.get('io');
    if (io) {
      // Direct alert to supplying hospital room and network broadcast
      io.emit('new_emergency_request', {
        request: enriched,
        targetHospitalId: supplyingHospitalId,
        message: `New ${urgency} request from ${requestingHosp?.name}: ${quantityRequested}x ${resource.name}`
      });
    }

    res.status(201).json({ success: true, request: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/emergency/requests
router.get('/requests', authenticate, (req, res) => {
  try {
    const { status, urgency, viewMode } = req.query;
    let filter = {};

    // If not Network Admin, filter by user's hospital
    if (req.user.role !== 'NETWORK_ADMIN') {
      filter.hospitalId = req.user.hospitalId;
    }

    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;

    let requests = dataStore.getRequests(filter);

    // Optional view mode filter (incoming / outgoing)
    if (viewMode === 'incoming') {
      requests = requests.filter(r => r.supplyingHospitalId === req.user.hospitalId || (r.isBroadcast && r.requestingHospitalId !== req.user.hospitalId));
    } else if (viewMode === 'outgoing') {
      requests = requests.filter(r => r.requestingHospitalId === req.user.hospitalId);
    }

    const enriched = requests.map(enrichRequest);
    res.json({ success: true, count: enriched.length, requests: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/emergency/requests/:id
router.get('/requests/:id', authenticate, (req, res) => {
  const requestDoc = dataStore.getRequestById(req.params.id);
  if (!requestDoc) {
    return res.status(404).json({ success: false, message: 'Request not found.' });
  }
  res.json({ success: true, request: enrichRequest(requestDoc) });
});

// PATCH /api/emergency/requests/:id/approve (Atomic Reservation Lock)
router.patch('/requests/:id/approve', authenticate, (req, res) => {
  try {
    const requestDoc = dataStore.getRequestById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Supplying hospital validation (or accepting a broadcast)
    let supplyingHospId = requestDoc.supplyingHospitalId;
    if (requestDoc.isBroadcast && !supplyingHospId) {
      supplyingHospId = req.user.hospitalId;
      requestDoc.supplyingHospitalId = supplyingHospId;
    }

    if (req.user.role !== 'NETWORK_ADMIN' && req.user.hospitalId !== supplyingHospId) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only the supplying hospital can approve this request.' });
    }

    let targetResourceId = requestDoc.resourceId;
    // If it was a broadcast, select matching resource from supplier's stock
    if (!targetResourceId) {
      const supplierResources = dataStore.getResources({ hospitalId: supplyingHospId });
      const matchingRes = supplierResources.find(r => r.availableQuantity >= requestDoc.quantityRequested) || supplierResources[0];
      if (!matchingRes) {
        return res.status(400).json({ success: false, message: 'No suitable local resource in inventory to fulfill this broadcast.' });
      }
      targetResourceId = matchingRes._id;
      requestDoc.resourceId = targetResourceId;
    }

    // ATOMIC RESERVATION LOCK
    const lockedResource = dataStore.lockResourceReservation(targetResourceId, requestDoc.quantityRequested);

    // Update Request State
    dataStore.updateRequest(req.params.id, {
      status: 'APPROVED_RESERVED',
      reviewedAt: new Date(),
      approvedBy: req.user.name,
      supplyingHospitalId: supplyingHospId
    });

    const supplyingHosp = dataStore.getHospitalById(supplyingHospId);
    const requestingHosp = dataStore.getHospitalById(requestDoc.requestingHospitalId);

    dataStore.addAuditLog({
      action: 'REQUEST_APPROVED_RESERVED',
      severity: 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: supplyingHosp?.name || 'Supplying Facility',
      details: `Approved ${requestDoc.requestNumber}. Locked ${requestDoc.quantityRequested} units of ${lockedResource.name} in inventory.`,
      requestId: requestDoc._id,
      ipAddress: req.ip
    });

    const enriched = enrichRequest(dataStore.getRequestById(req.params.id));

    const io = req.app.get('io');
    if (io) {
      io.emit('request_approved', {
        requestId: requestDoc._id,
        requestNumber: requestDoc.requestNumber,
        request: enriched,
        message: `${supplyingHosp?.name} APPROVED emergency request ${requestDoc.requestNumber}. Resources are locked and reserved.`
      });
      io.emit('resource_updated', {
        resource: lockedResource,
        message: `Inventory locked: ${lockedResource.name}`
      });
    }

    res.json({
      success: true,
      message: 'Request approved and resources atomically reserved.',
      request: enriched,
      lockedResource
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/emergency/requests/:id/decline (Decline with clinical reason)
router.patch('/requests/:id/decline', authenticate, (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A formal reason for declining the emergency request is required.' });
    }

    const requestDoc = dataStore.getRequestById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    dataStore.updateRequest(req.params.id, {
      status: 'DECLINED',
      declineReason: reason,
      reviewedAt: new Date(),
      declinedBy: req.user.name
    });

    const supplyingHosp = dataStore.getHospitalById(requestDoc.supplyingHospitalId);

    dataStore.addAuditLog({
      action: 'REQUEST_DECLINED',
      severity: 'WARNING',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: supplyingHosp?.name || 'Supplying Facility',
      details: `Declined ${requestDoc.requestNumber}. Reason: ${reason}`,
      requestId: requestDoc._id,
      ipAddress: req.ip
    });

    const enriched = enrichRequest(dataStore.getRequestById(req.params.id));

    const io = req.app.get('io');
    if (io) {
      io.emit('request_declined', {
        requestId: requestDoc._id,
        requestNumber: requestDoc.requestNumber,
        request: enriched,
        reason,
        message: `Emergency request ${requestDoc.requestNumber} was declined by supplying hospital.`
      });
    }

    res.json({ success: true, message: 'Request declined.', request: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/emergency/requests/:id/cancel (Cancel Request & Release any hold)
router.patch('/requests/:id/cancel', authenticate, (req, res) => {
  try {
    const requestDoc = dataStore.getRequestById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Release resource reservation if it was approved
    if (requestDoc.status === 'APPROVED_RESERVED' && requestDoc.resourceId) {
      dataStore.releaseResourceReservation(requestDoc.resourceId, requestDoc.quantityRequested);
    }

    dataStore.updateRequest(req.params.id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: req.user.name
    });

    const requestingHosp = dataStore.getHospitalById(requestDoc.requestingHospitalId);

    dataStore.addAuditLog({
      action: 'REQUEST_CANCELLED',
      severity: 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: requestingHosp?.name || 'Requesting Facility',
      details: `Cancelled request ${requestDoc.requestNumber}. Any held inventory released.`,
      requestId: requestDoc._id,
      ipAddress: req.ip
    });

    const enriched = enrichRequest(dataStore.getRequestById(req.params.id));

    const io = req.app.get('io');
    if (io) {
      io.emit('request_cancelled', {
        requestId: requestDoc._id,
        request: enriched
      });
    }

    res.json({ success: true, message: 'Request cancelled and reservation holds released.', request: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
