import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/resources
router.get('/', (req, res) => {
  try {
    const { hospitalId, category, status, availableOnly } = req.query;
    const resources = dataStore.getResources({
      hospitalId,
      category,
      status,
      availableOnly: availableOnly === 'true'
    });

    // Attach hospital info
    const enriched = resources.map(r => {
      const hosp = dataStore.getHospitalById(r.hospitalId);
      return {
        ...r,
        hospitalName: hosp?.name || 'Unknown',
        hospitalCode: hosp?.code || '',
        hospitalCity: hosp?.city || ''
      };
    });

    res.json({ success: true, count: enriched.length, resources: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/resources/:id
router.get('/:id', (req, res) => {
  const resource = dataStore.getResourceById(req.params.id);
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found.' });
  }
  const hosp = dataStore.getHospitalById(resource.hospitalId);
  res.json({ success: true, resource: { ...resource, hospital: hosp } });
});

// POST /api/resources (Add resource)
router.post('/', authenticate, (req, res) => {
  try {
    const { category, name, specification, totalQuantity, availableQuantity, unitOfMeasure, criticalThreshold, notes } = req.body;
    const hospitalId = req.body.hospitalId || req.user.hospitalId;

    if (!category || !name || totalQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'Category, resource name, and total quantity are required.' });
    }

    const hosp = dataStore.getHospitalById(hospitalId);
    if (!hosp) {
      return res.status(404).json({ success: false, message: 'Specified hospital does not exist.' });
    }

    const newRes = dataStore.createResource({
      hospitalId,
      category,
      name,
      specification: specification || '',
      totalQuantity: Number(totalQuantity),
      availableQuantity: availableQuantity !== undefined ? Number(availableQuantity) : Number(totalQuantity),
      unitOfMeasure: unitOfMeasure || 'Units',
      criticalThreshold: Number(criticalThreshold) || 2,
      notes: notes || ''
    });

    dataStore.addAuditLog({
      action: 'RESOURCE_CREATED',
      severity: 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: hosp.name,
      details: `Added new critical resource: ${name} (${totalQuantity} ${unitOfMeasure})`,
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('resource_created', {
        resource: { ...newRes, hospitalName: hosp.name },
        message: `${hosp.name} published new resource: ${newRes.name}`
      });
    }

    res.status(201).json({ success: true, resource: newRes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/resources/:id (Update capacity/availability)
router.patch('/:id', authenticate, (req, res) => {
  try {
    const resource = dataStore.getResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    // Ensure user belongs to this hospital or is Network Admin
    if (req.user.role !== 'NETWORK_ADMIN' && req.user.hospitalId !== resource.hospitalId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify resources for another hospital facility.' });
    }

    const updates = {};
    if (req.body.totalQuantity !== undefined) updates.totalQuantity = Number(req.body.totalQuantity);
    if (req.body.availableQuantity !== undefined) updates.availableQuantity = Number(req.body.availableQuantity);
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.specification !== undefined) updates.specification = req.body.specification;

    const updated = dataStore.updateResource(req.params.id, updates);
    const hosp = dataStore.getHospitalById(updated.hospitalId);

    dataStore.addAuditLog({
      action: 'RESOURCE_UPDATED',
      severity: updated.status === 'CRITICAL_LOW' ? 'WARNING' : 'NORMAL',
      actorName: req.user.name,
      actorRole: req.user.role,
      hospitalName: hosp?.name || 'Hospital',
      details: `Updated resource ${updated.name}: Available ${updated.availableQuantity}/${updated.totalQuantity} (${updated.status})`,
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('resource_updated', {
        resource: { ...updated, hospitalName: hosp?.name },
        message: `Inventory update at ${hosp?.name}: ${updated.name}`
      });
    }

    res.json({ success: true, resource: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
