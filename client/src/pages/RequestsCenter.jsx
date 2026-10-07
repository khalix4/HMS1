import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Clock, 
  Building2, 
  AlertTriangle, 
  Lock, 
  Send,
  Radio,
  ArrowRight
} from 'lucide-react';

export const RequestsCenter = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const { lastEvent } = useSocket();
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'outgoing', 'all'
  const [actionInProgress, setActionInProgress] = useState(null);
  const [declineModalReq, setDeclineModalReq] = useState(null);
  const [declineReason, setDeclineReason] = useState('Immediate local polytrauma surgery requiring remaining inventory reserve.');
  const [dispatchModalReq, setDispatchModalReq] = useState(null);
  const [vehicleType, setVehicleType] = useState('Advanced Life Support (ALS) Ambulance');
  const [driverName, setDriverName] = useState('Officer Robert Ross');
  const [contactNumber, setContactNumber] = useState('+1 (507) 991-3849');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await api.get('/api/emergency/requests', {
        viewMode: activeTab !== 'all' ? activeTab : undefined
      });
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.warn('Failed to fetch requests:', e);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, user?.id, lastEvent]);

  // Handle Approve with Atomic Lock
  const handleApprove = async (reqId) => {
    setActionInProgress(reqId);
    try {
      const data = await api.patch(`/api/emergency/requests/${reqId}/approve`);
      if (data.success) {
        setRequests(prev => prev.map(r => r._id === reqId ? data.request : r));
      }
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Decline
  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineModalReq) return;
    setActionInProgress(declineModalReq._id);

    try {
      const data = await api.patch(`/api/emergency/requests/${declineModalReq._id}/decline`, {
        reason: declineReason
      });
      if (data.success) {
        setRequests(prev => prev.map(r => r._id === declineModalReq._id ? data.request : r));
        setDeclineModalReq(null);
      }
    } catch (err) {
      alert(`Decline action failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Dispatch Transit
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!dispatchModalReq) return;
    setSubmittingDispatch(true);

    try {
      const data = await api.post('/api/transfers/dispatch', {
        requestId: dispatchModalReq._id,
        vehicleType,
        driverName,
        contactNumber
      });

      if (data.success) {
        setDispatchModalReq(null);
        setCurrentTab('transfers');
      }
    } catch (err) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setSubmittingDispatch(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.35rem' }}>Hospital-to-Hospital Request Coordination</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Multi-stage emergency lifecycle: Formal Request → Supplier Review & Atomic Lock → Medical Transit Dispatch → Custody Handoff.
          </p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="nav-tabs">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`nav-tab ${activeTab === 'incoming' ? 'active' : ''}`}
        >
          <span>Incoming Supplier Requests</span>
          <span className="mono" style={{ fontSize: '0.75rem', background: '#0e1a38', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
            {requests.filter(r => r.supplyingHospitalId === user?.hospitalId && r.status === 'REQUESTED').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`nav-tab ${activeTab === 'outgoing' ? 'active' : ''}`}
        >
          <span>Outgoing Facility Requests</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`nav-tab ${activeTab === 'all' ? 'active' : ''}`}
        >
          <span>All Regional Requests</span>
        </button>
      </div>

      {/* Requests Card Stream */}
      {requests.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Requests Pending</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            There are currently no active emergency requests in this queue.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((req) => {
            const isSupplyingFacility = req.supplyingHospitalId === user?.hospitalId || (!req.supplyingHospitalId && req.isBroadcast);
            const canApprove = isSupplyingFacility && req.status === 'REQUESTED';
            const canDispatch = isSupplyingFacility && req.status === 'APPROVED_RESERVED';

            return (
              <div
                key={req._id}
                className={`glass-panel ${req.urgency === 'CODE_RED_CRITICAL' ? 'glow-red' : ''}`}
                style={{ padding: '1.25rem 1.5rem' }}
              >
                {/* Top Row: Request ID, Urgency, Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="mono" style={{ fontSize: '0.9rem', color: '#00e5ff', fontWeight: 700 }}>
                      {req.requestNumber}
                    </span>
                    <span className={`status-pill ${req.urgency.toLowerCase()}`}>
                      {req.urgency.replace('_', ' ')}
                    </span>
                    {req.isBroadcast && (
                      <span className="status-pill code_red" style={{ fontSize: '0.65rem' }}>
                        NETWORK BROADCAST
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Requested: {new Date(req.requestedAt).toLocaleTimeString()}
                    </span>
                    <span className={`status-pill ${req.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Resource Info & Parties */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.25rem' }}>
                      {req.quantityRequested}x {req.resourceName}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Category: <strong style={{ color: '#e2e8f0' }}>{req.resourceCategory}</strong>
                    </div>

                    {req.clinicalReason && (
                      <div style={{
                        marginTop: '0.5rem',
                        background: '#091329',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: '#cbd5e1',
                        borderLeft: req.urgency === 'CODE_RED_CRITICAL' ? '3px solid #ff334b' : '3px solid #00e5ff'
                      }}>
                        <strong>Clinical Justification:</strong> {req.clinicalReason}
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: '#091329',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.825rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Requesting Facility:</span>
                      <strong style={{ color: '#fff' }}>{req.requestingHospital?.name || 'Requesting Hospital'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Supplying Facility:</span>
                      <strong style={{ color: '#00e5ff' }}>{req.supplyingHospital?.name || 'Open to All Facilities'}</strong>
                    </div>
                    {req.declineReason && (
                      <div style={{ color: '#ff6b7d', marginTop: '0.25rem' }}>
                        <strong>Decline Reason:</strong> {req.declineReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Progression Stepper */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#070d1e',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span>1. Request Submitted</span>
                  </div>
                  <ArrowRight size={14} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: ['APPROVED_RESERVED', 'TRANSFER_DISPATCHED', 'COMPLETED'].includes(req.status) ? '#10b981' : '#64748b',
                    fontWeight: 600
                  }}>
                    <Lock size={12} />
                    <span>2. Supplier Approved & Locked</span>
                  </div>
                  <ArrowRight size={14} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: ['TRANSFER_DISPATCHED', 'COMPLETED'].includes(req.status) ? '#10b981' : '#64748b',
                    fontWeight: 600
                  }}>
                    <Truck size={12} />
                    <span>3. In-Transit Dispatch</span>
                  </div>
                  <ArrowRight size={14} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: req.status === 'COMPLETED' ? '#10b981' : '#64748b',
                    fontWeight: 600
                  }}>
                    <CheckCircle2 size={12} />
                    <span>4. Handoff PIN Verified</span>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {canApprove && (
                    <>
                      <button
                        onClick={() => setDeclineModalReq(req)}
                        className="btn btn-secondary btn-sm"
                        disabled={actionInProgress === req._id}
                        style={{ color: '#ff6b7d' }}
                      >
                        <XCircle size={14} />
                        <span>Decline Request</span>
                      </button>
                      <button
                        onClick={() => handleApprove(req._id)}
                        className="btn btn-success btn-sm"
                        disabled={actionInProgress === req._id}
                      >
                        <Lock size={14} />
                        <span>{actionInProgress === req._id ? 'Locking...' : 'Approve & Lock Inventory'}</span>
                      </button>
                    </>
                  )}

                  {canDispatch && (
                    <button
                      onClick={() => setDispatchModalReq(req)}
                      className="btn btn-primary btn-sm"
                    >
                      <Truck size={14} />
                      <span>Dispatch Medical Transit</span>
                    </button>
                  )}

                  {req.transferId && (
                    <button
                      onClick={() => setCurrentTab('transfers')}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#00e5ff' }}
                    >
                      <Truck size={14} />
                      <span>Track Transit Vector</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineModalReq && (
        <div className="modal-overlay" onClick={() => setDeclineModalReq(null)}>
          <div className="modal-content glass-panel glow-red" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ff6b7d', marginBottom: '0.5rem' }}>
              Decline Emergency Request
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Clinical audit standards require an explicit operational or medical reason for declining emergency coordination requests.
            </p>

            <form onSubmit={handleDeclineSubmit}>
              <div className="form-group">
                <label className="form-label">Mandatory Decline Reason</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setDeclineModalReq(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-emergency"
                  disabled={actionInProgress === declineModalReq._id}
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Transfer Modal */}
      {dispatchModalReq && (
        <div className="modal-overlay" onClick={() => setDispatchModalReq(null)}>
          <div className="modal-content glass-panel glow-cyan" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Dispatch Emergency Medical Transit
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Dispatching for <strong>{dispatchModalReq.requestNumber}</strong>: {dispatchModalReq.quantityRequested}x {dispatchModalReq.resourceName}
            </p>

            <form onSubmit={handleDispatchSubmit}>
              <div className="form-group">
                <label className="form-label">Transit Vehicle Type</label>
                <select
                  className="form-select"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="Advanced Life Support (ALS) Ambulance">Advanced Life Support (ALS) Ambulance</option>
                  <option value="Basic Life Support (BLS) Ambulance">Basic Life Support (BLS) Ambulance</option>
                  <option value="Critical Care Air Medical / Helicopter">Critical Care Air Medical / Helicopter</option>
                  <option value="Emergency Medical Courier (Cold Chain)">Emergency Medical Courier (Cold Chain Blood/Drugs)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Driver / Paramedic in Charge</label>
                <input
                  type="text"
                  className="form-input"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Direct Contact Hotline</label>
                <input
                  type="text"
                  className="form-input"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{
                background: 'rgba(0, 229, 255, 0.08)',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#38bdf8',
                marginBottom: '1.25rem'
              }}>
                A secure 4-digit chain-of-custody verification PIN will be generated and required upon delivery at the receiving dock.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalReq(null)}
                  className="btn btn-secondary"
                  disabled={submittingDispatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingDispatch}
                >
                  <Truck size={16} />
                  <span>{submittingDispatch ? 'Dispatching...' : 'Confirm Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
