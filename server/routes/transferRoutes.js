import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const enrichTransfer = (trf) => {
  const req = trf.requestId ? dataStore.getRequestById(trf.requestId) : null;
  const fromHosp = dataStore.getHospitalById(trf.fromHospitalId);
  const toHosp = dataStore.getHospitalById(trf.toHospitalId);

  return {
    ...trf,
    request: req,
    fromHospital: fromHosp || null,
    toHospital: toHosp || null
  };
};

// GET /api/transfers
router.get('/', authenticate, (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (req.user.role !== 'NETWORK_ADMIN') {
      filter.hospitalId = req.user.hospitalId;
    }
    if (status) filter.status = status;

    const transfers = dataStore.getTransfers(filter);
    res.json({ success: true, count: transfers.length, transfers: transfers.map(enrichTransfer) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transfers/:id
router.get('/:id', authenticate, (req, res) => {
  const trf = dataStore.getTransferById(req.params.id);
  if (!trf) {
    return res.status(404).json({ success: false, message: 'Transfer record not found.' });
  }
  res.json({ success: true, transfer: enrichTransfer(trf) });
});

// POST /api/transfers/dispatch (Dispatch Transit Unit)
router.post('/dispatch', authenticate, (req, res) => {
  try {
    const { requestId, vehicleType, vehicleIdentifier, driverName, contactNumber } = req.body;

    const requestDoc = dataStore.getRequestById(requestId);
    if (!requestDoc) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    if (requestDoc.status !== 'APPROVED_RESERVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch transfer for request in '${requestDoc.status}' status. Must be in 'APPROVED_RESERVED'.`
      });
    }

    const fromHosp = dataStore.getHospitalById(requestDoc.supplyingHospitalId);
    const toHosp = dataStore.getHospitalById(requestDoc.requestingHospitalId);

    const distanceKm = dataStore.calculateDistanceKm(
      fromHosp?.coordinates?.lat,
      fromHosp?.coordinates?.lng,
      toHosp?.coordinates?.lat,
      toHosp?.coordinates?.lng
    );

    const estimatedMinutes = dataStore.estimateTransitMinutes(distanceKm, requestDoc.urgency);

    const newTransfer = dataStore.createTransfer({
      requestId: requestDoc._id,
      requestNumber: requestDoc.requestNumber,
      fromHospitalId: requestDoc.supplyingHospitalId,
      toHospitalId: requestDoc.requestingHospitalId,
      resourceName: `${requestDoc.quantityRequested}x ${requestDoc.resourceName}`,
      vehicleType: vehicleType || 'Advanced Life Support (ALS) Ambulance',
      vehicleIdentifier: vehicleIdentifier || `MED-UNIT-${Math.floor(100 + Math.random() * 900)}`,
      driverName: driverName || 'Emergency Dispatch Paramedic',
      contactNumber: contactNumber || '+1 (507) 555-0199',
      distanceKm,
      estimatedMinutes,
      etaTimestamp: new Date(Date.now() + estimatedMinutes * 60 * 1000)
    });

    // Update Request
    dataStore.updateRequest(requestId, {
      status: 'TRANSFER_DISPATCHED',
      dispatchedAt: new Date(),
      transferId: newTransfer._id
    });

    dataStore.addAuditLog({
      action: 'TRANSFER_DISPATCHED',
      severity: 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: fromHosp?.name || 'Supplying Facility',
      details: `Dispatched ${newTransfer.vehicleIdentifier} (${newTransfer.vehicleType}) for ${requestDoc.requestNumber}. Handoff Security PIN generated.`,
      requestId: requestDoc._id,
      ipAddress: req.ip
    });

    const enriched = enrichTransfer(newTransfer);

    const io = req.app.get('io');
    if (io) {
      io.emit('transfer_dispatched', {
        transfer: enriched,
        message: `Transfer dispatched: ${requestDoc.requestNumber} is en-route from ${fromHosp?.name} to ${toHosp?.name}`
      });
      io.emit('request_updated', {
        request: dataStore.getRequestById(requestId)
      });
    }

    res.status(201).json({
      success: true,
      message: 'Transfer unit dispatched successfully.',
      transfer: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/transfers/:id/milestone (Update Transit Milestones)
router.patch('/:id/milestone', authenticate, (req, res) => {
  try {
    const { milestoneIndex, status } = req.body;
    const trf = dataStore.updateTransferMilestone(req.params.id, Number(milestoneIndex), status);
    if (!trf) {
      return res.status(404).json({ success: false, message: 'Transfer not found.' });
    }

    const enriched = enrichTransfer(trf);

    const io = req.app.get('io');
    if (io) {
      io.emit('transfer_milestone_updated', {
        transfer: enriched,
        milestoneIndex,
        message: `Transfer ${trf.vehicleIdentifier} milestone updated.`
      });
    }

    res.json({ success: true, transfer: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/transfers/:id/verify-handoff (Chain-of-Custody 4-digit PIN verification)
router.post('/:id/verify-handoff', authenticate, (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Verification PIN is required for custody confirmation.' });
    }

    const trf = dataStore.verifyTransferHandoffPin(req.params.id, String(pin).trim(), req.user.name);
    
    // Complete Request
    if (trf.requestId) {
      const reqDoc = dataStore.getRequestById(trf.requestId);
      if (reqDoc) {
        dataStore.updateRequest(trf.requestId, {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: req.user.name
        });

        // Finalize inventory reservation (move from reserved to in-use)
        if (reqDoc.resourceId) {
          dataStore.finalizeResourceHandoff(reqDoc.resourceId, reqDoc.quantityRequested);
        }
      }
    }

    const toHosp = dataStore.getHospitalById(trf.toHospitalId);

    dataStore.addAuditLog({
      action: 'HANDOFF_VERIFIED_COMPLETED',
      severity: 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: toHosp?.name || 'Receiving Facility',
      details: `Chain-of-custody PIN verified for transfer ${trf.vehicleIdentifier}. Resource successfully received and admitted.`,
      requestId: trf.requestId,
      ipAddress: req.ip
    });

    const enriched = enrichTransfer(trf);

    const io = req.app.get('io');
    if (io) {
      io.emit('transfer_completed', {
        transfer: enriched,
        message: `Handoff verified! Resource for ${trf.requestNumber} safely received at ${toHosp?.name}.`
      });
      if (trf.requestId) {
        io.emit('request_completed', {
          request: dataStore.getRequestById(trf.requestId)
        });
      }
    }

    res.json({
      success: true,
      message: 'Chain-of-custody PIN successfully verified! Transfer complete.',
      transfer: enriched
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
