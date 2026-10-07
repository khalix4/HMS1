import express from 'express';
import { dataStore } from '../store/dataStore.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit/logs
router.get('/logs', authenticate, (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const { action, severity, hospitalId } = req.query;
    let logs = dataStore.getAuditLogs(limit);

    if (action) logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    if (severity) logs = logs.filter(l => l.severity === severity);
    if (hospitalId) logs = logs.filter(l => l.hospitalId === hospitalId);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/audit/analytics (Network Executive KPIs)
router.get('/analytics', authenticate, (req, res) => {
  try {
    const analytics = dataStore.getNetworkAnalytics();
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
