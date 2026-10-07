import express from 'express';
import { dataStore } from '../store/dataStore.js';

const router = express.Router();

// Middleware to verify integration API key (for external HMIS/EMR/Lab systems)
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== (process.env.INTEGRATION_API_KEY || 'mayo-hmis-secure-api-key-2026')) {
    return res.status(401).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'security',
        diagnostics: 'Invalid or missing HMIS/EMR Integration API Key in X-API-KEY header.'
      }]
    });
  }
  next();
};

// GET /api/integration/fhir/Location (FHIR R4 Hospital Locations)
router.get('/fhir/Location', verifyApiKey, (req, res) => {
  const hospitals = dataStore.getHospitals({ status: 'VERIFIED' });
  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: hospitals.length,
    entry: hospitals.map(h => ({
      resource: {
        resourceType: 'Location',
        id: h._id,
        identifier: [{ system: 'urn:ietf:rfc:3986', value: h.licenseNumber }],
        status: 'active',
        name: h.name,
        description: h.category,
        mode: 'instance',
        telecom: [{ system: 'phone', value: h.emergencyPhone, use: 'work' }],
        address: {
          line: [h.address],
          city: h.city,
          state: h.state,
          country: 'USA'
        },
        position: {
          latitude: h.coordinates.lat,
          longitude: h.coordinates.lng
        }
      }
    }))
  };
  res.json(fhirBundle);
});

// GET /api/integration/fhir/HealthcareService (FHIR R4 Hospital Resources & Beds)
router.get('/fhir/HealthcareService', verifyApiKey, (req, res) => {
  const resources = dataStore.getResources({ availableOnly: false });
  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map(r => ({
      resource: {
        resourceType: 'HealthcareService',
        id: r._id,
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/service-category', code: r.category }] }],
        name: r.name,
        comment: r.specification,
        extraDetails: `Available: ${r.availableQuantity} / Total: ${r.totalQuantity} ${r.unitOfMeasure}. Status: ${r.status}`,
        providedBy: { reference: `Location/${r.hospitalId}` }
      }
    }))
  };
  res.json(fhirBundle);
});

// GET /api/integration/fhir/SupplyDelivery (FHIR R4 Inter-Hospital Medical Transfers)
router.get('/fhir/SupplyDelivery', verifyApiKey, (req, res) => {
  const transfers = dataStore.getTransfers();
  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: transfers.length,
    entry: transfers.map(t => ({
      resource: {
        resourceType: 'SupplyDelivery',
        id: t._id,
        status: t.status === 'ARRIVED_VERIFIED' ? 'completed' : 'in-progress',
        itemCodeableConcept: { text: t.resourceName },
        supplier: { reference: `Location/${t.fromHospitalId}` },
        destination: { reference: `Location/${t.toHospitalId}` },
        occurrenceDateTime: t.startedAt
      }
    }))
  };
  res.json(fhirBundle);
});

// POST /api/integration/blood-bank/sync (Sync inventory from Laboratory/Blood Bank systems)
router.post('/blood-bank/sync', verifyApiKey, (req, res) => {
  try {
    const { hospitalId, units } = req.body;
    if (!hospitalId || !Array.isArray(units)) {
      return res.status(400).json({ success: false, message: 'hospitalId and units array are required.' });
    }

    const hosp = dataStore.getHospitalById(hospitalId);
    if (!hosp) return res.status(404).json({ success: false, message: 'Hospital not found.' });

    let updatedCount = 0;
    units.forEach(u => {
      const existing = dataStore.getResources({ hospitalId, category: 'BLOOD_PRODUCT' }).find(r => r.name.toLowerCase().includes(u.bloodType.toLowerCase()));
      if (existing) {
        dataStore.updateResource(existing._id, {
          availableQuantity: Number(u.quantity),
          totalQuantity: Math.max(existing.totalQuantity, Number(u.quantity))
        });
        updatedCount++;
      }
    });

    res.json({
      success: true,
      message: `Successfully synchronized ${updatedCount} blood product lines for ${hosp.name}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
