import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle2, 
  ShieldCheck, 
  Navigation, 
  ArrowRight,
  Radio,
  KeyRound
} from 'lucide-react';
import { TransferPinModal } from '../components/TransferPinModal.jsx';

export const TransferTracker = () => {
  const { user } = useAuth();
  const { lastEvent } = useSocket();
  const [transfers, setTransfers] = useState([]);
  const [selectedTransferForPin, setSelectedTransferForPin] = useState(null);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState(null);

  const fetchTransfers = async () => {
    try {
      const data = await api.get('/api/transfers');
      if (data.success) {
        setTransfers(data.transfers);
      }
    } catch (e) {
      console.warn('Failed to fetch transfers:', e);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [user?.id, lastEvent]);

  const handleAdvanceMilestone = async (trf, currentMilestones) => {
    const nextIndex = currentMilestones.findIndex(m => !m.done);
    if (nextIndex === -1) return;

    setUpdatingMilestoneId(trf._id);
    try {
      const statusMap = {
        0: 'DISPATCHED',
        1: 'DISPATCHED',
        2: 'EN_ROUTE',
        3: 'APPROACHING',
        4: 'ARRIVED'
      };

      const data = await api.patch(`/api/transfers/${trf._id}/milestone`, {
        milestoneIndex: nextIndex,
        status: statusMap[nextIndex]
      });

      if (data.success) {
        setTransfers(prev => prev.map(t => t._id === trf._id ? data.transfer : t));
      }
    } catch (err) {
      alert(`Milestone update failed: ${err.message}`);
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Truck size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.35rem' }}>Medical Transit & Chain-of-Custody Command</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Real-time ambulance and cold-chain transit tracking with milestone logging and secure PIN handoff verification.
          </p>
        </div>
      </div>

      {/* Transit Board */}
      {transfers.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <Truck size={48} style={{ color: '#64748b', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Medical Transits</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            All approved emergency resource transfers have reached destination or no new dispatches are pending.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
          {transfers.map((trf) => {
            const isCompleted = trf.status === 'ARRIVED_VERIFIED';
            const canVerifyPin = !isCompleted;

            return (
              <div
                key={trf._id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(0, 229, 255, 0.3)',
                  padding: '1.5rem'
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="mono" style={{ color: '#00e5ff', fontSize: '1.1rem', fontWeight: 700 }}>
                          {trf.vehicleIdentifier}
                        </span>
                        <span className={`status-pill ${isCompleted ? 'completed' : 'in_transit'}`}>
                          {trf.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {trf.vehicleType}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Clock size={15} />
                        <span>~{trf.estimatedMinutes} mins ETA</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {trf.distanceKm} km route
                      </div>
                    </div>
                  </div>

                  {/* Resource Payload */}
                  <div style={{
                    background: '#091329',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Emergency Consignment:
                    </span>
                    <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, marginTop: '0.15rem' }}>
                      {trf.resourceName}
                    </div>
                  </div>

                  {/* Origin to Destination Route */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.04)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                    fontSize: '0.85rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SUPPLIER</span>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{trf.fromHospital?.name || 'Supplying Facility'}</div>
                    </div>
                    <ArrowRight size={18} style={{ color: '#00e5ff' }} />
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>RECEIVING</span>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{trf.toHospital?.name || 'Destination Hospital'}</div>
                    </div>
                  </div>

                  {/* Driver Details & Pin Hint */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1' }}>
                      <Phone size={14} style={{ color: '#38bdf8' }} />
                      <span>{trf.driverName} ({trf.contactNumber})</span>
                    </div>

                    {!isCompleted && (
                      <div style={{
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        color: '#fbbf24',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem'
                      }}>
                        Handoff PIN: <strong>{trf.handoffPin}</strong>
                      </div>
                    )}
                  </div>

                  {/* Milestones Stepper */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Transit Milestones:
                    </span>
                    {trf.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: m.done ? '#34d399' : '#64748b',
                          background: m.done ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: m.done ? '#10b981' : '#334155'
                          }} />
                          <span>{m.label}</span>
                        </div>
                        {m.timestamp && (
                          <span className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(m.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                  {!isCompleted && (
                    <>
                      <button
                        onClick={() => handleAdvanceMilestone(trf, trf.milestones)}
                        disabled={updatingMilestoneId === trf._id}
                        className="btn btn-secondary btn-sm"
                      >
                        <Navigation size={14} />
                        <span>Advance Milestone</span>
                      </button>
                      <button
                        onClick={() => setSelectedTransferForPin(trf)}
                        className="btn btn-success btn-sm"
                      >
                        <KeyRound size={14} />
                        <span>Verify Handoff PIN</span>
                      </button>
                    </>
                  )}

                  {isCompleted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      <CheckCircle2 size={16} />
                      <span>Custody Confirmed & Admitted</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chain-of-Custody PIN Modal */}
      {selectedTransferForPin && (
        <TransferPinModal
          transfer={selectedTransferForPin}
          isOpen={!!selectedTransferForPin}
          onClose={() => setSelectedTransferForPin(null)}
          onSuccess={() => {
            fetchTransfers();
            setSelectedTransferForPin(null);
          }}
        />
      )}
    </div>
  );
};
