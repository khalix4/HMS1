import express from 'express';
import bcrypt from 'bcryptjs';
import { dataStore } from '../store/dataStore.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = dataStore.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not registered.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const hospital = dataStore.getHospitalById(user.hospitalId);
    const token = generateToken(user);

    dataStore.addAuditLog({
      action: 'USER_LOGIN',
      severity: 'LOW',
      actorName: user.name,
      actorRole: user.role,
      hospitalName: hospital ? hospital.name : 'Network HQ',
      details: `User logged in from ${req.ip}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        hospital: hospital || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/demo-switch (Quick switcher for testing and demonstration)
router.post('/demo-switch', (req, res) => {
  try {
    const { userId } = req.body;
    const user = dataStore.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo user not found.' });
    }

    const hospital = dataStore.getHospitalById(user.hospitalId);
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        hospital: hospital || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const hospital = dataStore.getHospitalById(req.user.hospitalId);
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      hospital: hospital || null
    }
  });
});

// GET /api/auth/users (Demo user list)
router.get('/users', (req, res) => {
  const users = dataStore.getUsers().map(u => {
    const hosp = dataStore.getHospitalById(u.hospitalId);
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      hospitalName: hosp ? hosp.name : 'Regional Administration',
      hospitalId: u.hospitalId
    };
  });
  res.json({ success: true, users });
});

export default router;
