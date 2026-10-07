import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  PlusCircle, 
  Check, 
  X, 
  Phone, 
  Mail, 
  Users, 
  FileCheck,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const NetworkAdmin = () => {
  const { user } = useAuth();
  const { lastEvent } = useSocket();
  const [hospitals, setHospitals] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('hospitals'); // 'hospitals', 'users', 'register'

  // New hospital form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Hospital');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Rochester');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [activeBedsCapacity, setActiveBedsCapacity] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAdminData = async () => {
    try {
      const [hospData, usrData] = await Promise.all([
        api.get('/api/hospitals'),
        api.get('/api/auth/users')
      ]);

      if (hospData.success) setHospitals(hospData.hospitals);
      if (usrData.success) setUsersList(usrData.users);
    } catch (e) {
      console.warn('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [lastEvent]);

  const handleUpdateStatus = async (hospitalId, status) => {
    try {
      const data = await api.patch(`/api/hospitals/${hospitalId}/status`, { status });
      if (data.success) {
        setHospitals(prev => prev.map(h => h._id === hospitalId ? data.hospital : h));
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleRegisterHospital = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const data = await api.post('/api/hospitals', {
        name,
        category,
        licenseNumber,
        address,
        city,
        state: 'MN',
        emergencyPhone,
        dispatchEmail,
        directorName,
        activeBedsCapacity
      });

      if (data.success) {
        setMessage(`Hospital "${data.hospital.name}" submitted successfully! Pending verification.`);
        setName('');
        setLicenseNumber('');
        setEmergencyPhone('');
        setDispatchEmail('');
        fetchAdminData();
        setActiveSubTab('hospitals');
      }
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.35rem' }}>Network Administration & Hospital Verification</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Trusted facility onboarding, clinical licensing authorization, and role-based credential management.
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="nav-tabs">
        <button
          onClick={() => setActiveSubTab('hospitals')}
          className={`nav-tab ${activeSubTab === 'hospitals' ? 'active' : ''}`}
        >
          <Building size={16} />
          <span>Verified Facilities ({hospitals.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('register')}
          className={`nav-tab ${activeSubTab === 'register' ? 'active' : ''}`}
        >
          <PlusCircle size={16} />
          <span>Register New Hospital Facility</span>
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`nav-tab ${activeSubTab === 'users' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Authorized Coordinators & RBAC ({usersList.length})</span>
        </button>
      </div>

      {/* 1. Hospitals Verification Table */}
      {activeSubTab === 'hospitals' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hospital Facility</th>
                  <th>Classification</th>
                  <th>License ID</th>
                  <th>Location & Hotline</th>
                  <th>Bed Capacity</th>
                  <th>Verification Status</th>
                  <th style={{ textAlign: 'right' }}>Authorization Action</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hosp) => (
                  <tr key={hosp._id}>
                    <td>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{hosp.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#00e5ff' }}>Code: {hosp.code}</div>
                    </td>
                    <td>
                      <span className="status-pill verified" style={{ fontSize: '0.65rem' }}>
                        {hosp.category}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {hosp.licenseNumber}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.825rem', color: '#e2e8f0' }}>{hosp.address}, {hosp.city}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Phone size={12} style={{ color: '#00e5ff' }} />
                        <span>{hosp.emergencyPhone}</span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: '#f8fafc' }}>{hosp.activeBedsCapacity}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}> beds</span>
                    </td>
                    <td>
                      <span className={`status-pill ${hosp.status.toLowerCase()}`}>
                        {hosp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {hosp.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleUpdateStatus(hosp._id, 'VERIFIED')}
                            className="btn btn-success btn-sm"
                            title="Approve Hospital License"
                          >
                            <Check size={14} />
                            <span>Verify Facility</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(hosp._id, 'SUSPENDED')}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ff6b7d' }}
                            title="Reject Application"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : hosp.status === 'VERIFIED' ? (
                        <button
                          onClick={() => handleUpdateStatus(hosp._id, 'SUSPENDED')}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#fbbf24', fontSize: '0.75rem' }}
                        >
                          <span>Suspend Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(hosp._id, 'VERIFIED')}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <span>Re-instate</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Register New Hospital Form */}
      {activeSubTab === 'register' && (
        <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Building2 size={24} style={{ color: '#00e5ff' }} />
            <h3 style={{ fontSize: '1.25rem' }}>Hospital Onboarding Application</h3>
          </div>

          <form onSubmit={handleRegisterHospital}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Hospital Legal Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Northstar Medical Center"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Healthcare Classification</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Level-1 Trauma Center">Level-1 Trauma Center</option>
                  <option value="Tertiary Care & Trauma">Tertiary Care & Trauma</option>
                  <option value="Pediatric Specialty">Pediatric Specialty</option>
                  <option value="General Hospital">General Hospital</option>
                  <option value="Community Hospital">Community Hospital</option>
                  <option value="Cardiac Specialty Center">Cardiac Specialty Center</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">State Healthcare License ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. HOSP-LIC-2026-880"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Active Bed Capacity</label>
                <input
                  type="number"
                  min="10"
                  className="form-input"
                  value={activeBedsCapacity}
                  onChange={(e) => setActiveBedsCapacity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 500 Health Park Blvd"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">24/7 Emergency Dispatch Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+1 (507) 555-0199"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={dispatchEmail}
                  onChange={(e) => setDispatchEmail(e.target.value)}
                  placeholder="dispatch@hospital.health.org"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Medical Director / Chief of Emergency</label>
              <input
                type="text"
                className="form-input"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="Dr. Full Name, MD"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('hospitals')}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                <FileCheck size={16} />
                <span>{submitting ? 'Submitting Application...' : 'Submit Verification Application'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Authorized Users & RBAC */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Authorized Officer</th>
                  <th>Assigned Role</th>
                  <th>Hospital Affiliation</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong style={{ color: '#f8fafc' }}>{u.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className="status-pill in_transit" style={{ fontSize: '0.7rem' }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}>
                        <Building2 size={13} style={{ color: '#00e5ff' }} />
                        <span>{u.hospitalName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                      {u.department}
                    </td>
                    <td>
                      <span className="status-pill available" style={{ fontSize: '0.65rem' }}>
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
