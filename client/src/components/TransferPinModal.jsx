import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { KeyRound, ShieldCheck, X, Truck, CheckCircle2 } from 'lucide-react';

export const TransferPinModal = ({ transfer, isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  if (!isOpen || !transfer) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('Please enter a valid 4-digit numeric PIN.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = await api.post(`/api/transfers/${transfer._id}/verify-handoff`, { pin });
      if (data.success) {
        setVerified(true);
        setTimeout(() => {
          if (onSuccess) onSuccess(data.transfer);
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Verification rejected. Incorrect PIN.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel glow-cyan" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 229, 255, 0.15)',
          color: verified ? '#10b981' : '#00e5ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          {verified ? <CheckCircle2 size={32} /> : <KeyRound size={28} />}
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
          {verified ? 'Handoff Confirmed & Verified!' : 'Chain-of-Custody Handoff PIN'}
        </h2>
        <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
          Enter the secure 4-digit PIN provided by the transfer courier to confirm receipt and finalize custody.
        </p>

        {/* Transfer details summary */}
        <div style={{
          background: '#091329',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          textAlign: 'left',
          marginBottom: '1.25rem',
          fontSize: '0.825rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#94a3b8' }}>Unit:</span>
            <strong style={{ color: '#fff' }}>{transfer.vehicleIdentifier} ({transfer.vehicleType})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#94a3b8' }}>Courier/Driver:</span>
            <span style={{ color: '#f1f5f9' }}>{transfer.driverName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Resource:</span>
            <strong style={{ color: '#00e5ff' }}>{transfer.resourceName}</strong>
          </div>
        </div>

        {/* Demo Hint Helper */}
        <div style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '6px',
          padding: '0.4rem 0.8rem',
          fontSize: '0.775rem',
          color: '#38bdf8',
          marginBottom: '1.25rem'
        }}>
          <strong>Demo Verification PIN:</strong> <span className="mono" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>{transfer.handoffPin}</span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '0.5rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.825rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              disabled={verified || submitting}
              className="mono"
              style={{
                width: '180px',
                height: '54px',
                fontSize: '1.75rem',
                letterSpacing: '0.5rem',
                textAlign: 'center',
                background: '#070d1e',
                border: '2px solid #00e5ff',
                borderRadius: '10px',
                color: '#fff',
                outline: 'none',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)'
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={submitting || pin.length !== 4 || verified}
            >
              <ShieldCheck size={18} />
              <span>{submitting ? 'Verifying...' : verified ? 'Verified!' : 'Confirm Handoff'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
