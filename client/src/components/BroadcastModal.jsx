import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { Flame, AlertTriangle, X, Radio } from 'lucide-react';

export const BroadcastModal = ({ isOpen, onClose, onBroadcastSuccess }) => {
  const [category, setCategory] = useState('BLOOD_PRODUCT');
  const [resourceName, setResourceName] = useState('O- Negative Blood Units');
  const [quantity, setQuantity] = useState(4);
  const [clinicalReason, setClinicalReason] = useState('Critical trauma patient with acute exsanguinating hemorrhage in OR. Hospital supply depleted.');
  const [patientSummary, setPatientSummary] = useState('34-year-old male, massive polytrauma, emergent laparotomy');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await api.post('/api/emergency/broadcast', {
        resourceCategory: category,
        resourceName,
        quantity: Number(quantity),
        clinicalReason,
        patientSummary
      });

      if (data.success) {
        if (onBroadcastSuccess) onBroadcastSuccess(data.broadcast);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel glow-red" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: '#ff334b',
              color: '#fff',
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ff6b7d' }}>CODE RED REGIONAL BROADCAST</h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Instant high-priority emergency blast to all verified hospitals in the network.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          background: 'rgba(255, 51, 75, 0.1)',
          border: '1px solid rgba(255, 51, 75, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          color: '#ffb3ba'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, color: '#ff334b' }} />
          <span>
            This alert sounds an audible siren and displays an emergency alert ticker on all active hospital coordinator terminals. Use only for life-critical shortages.
          </span>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem 0.9rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Resource Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="BLOOD_PRODUCT">Blood & Blood Products</option>
                <option value="ICU_BED">ICU & Critical Beds</option>
                <option value="EQUIPMENT">Critical Equipment (ECMO/Vent)</option>
                <option value="SPECIALIST">On-Call Specialist Team</option>
                <option value="CRITICAL_MEDICATION">Critical Medication / Antivenom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Needed</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Exact Resource Name / Specification</label>
            <input
              type="text"
              className="form-input"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder="e.g. O- Negative Blood Units, ECMO Machine, Pediatric ICU Bed"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Justification / Emergency Reason</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={clinicalReason}
              onChange={(e) => setClinicalReason(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Patient Clinical Summary</label>
            <input
              type="text"
              className="form-input"
              value={patientSummary}
              onChange={(e) => setPatientSummary(e.target.value)}
              placeholder="e.g. Age, gender, condition, current status"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
              className="btn btn-emergency"
              disabled={submitting}
            >
              <Radio size={16} />
              <span>{submitting ? 'Propagating Alert...' : 'TRANSMIT CODE RED ALERT'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
