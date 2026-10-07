import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { PlusCircle, X, Layers } from 'lucide-react';

export const NewResourceModal = ({ isOpen, onClose, onSuccess }) => {
  const [category, setCategory] = useState('ICU_BED');
  const [name, setName] = useState('');
  const [specification, setSpecification] = useState('');
  const [totalQuantity, setTotalQuantity] = useState(5);
  const [unitOfMeasure, setUnitOfMeasure] = useState('Beds');
  const [criticalThreshold, setCriticalThreshold] = useState(2);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === 'ICU_BED') {
      setName('Adult ICU Bed');
      setUnitOfMeasure('Beds');
    } else if (cat === 'BLOOD_PRODUCT') {
      setName('O- Negative Blood Units');
      setUnitOfMeasure('Units (450ml)');
    } else if (cat === 'EQUIPMENT') {
      setName('Mechanical Transport Ventilator');
      setUnitOfMeasure('Units');
    } else if (cat === 'SPECIALIST') {
      setName('Trauma Surgeon On-Call');
      setUnitOfMeasure('Physicians');
    } else if (cat === 'CRITICAL_MEDICATION') {
      setName('Antivenin Polyvalent');
      setUnitOfMeasure('Vials');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Resource name is required.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = await api.post('/api/resources', {
        category,
        name,
        specification,
        totalQuantity: Number(totalQuantity),
        availableQuantity: Number(totalQuantity),
        unitOfMeasure,
        criticalThreshold: Number(criticalThreshold),
        notes
      });

      if (data.success) {
        if (onSuccess) onSuccess(data.resource);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to publish resource.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel glow-cyan" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.25rem' }}>Publish Critical Resource</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Resource Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="ICU_BED">ICU & Critical Bed</option>
              <option value="BLOOD_PRODUCT">Blood & Blood Product</option>
              <option value="EQUIPMENT">Critical Medical Equipment (Ventilator/ECMO/Dialysis)</option>
              <option value="SPECIALIST">On-Call Specialist Team</option>
              <option value="CRITICAL_MEDICATION">Critical Medication / Antidote</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Resource Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adult ICU Bed, O- Blood, ECMO Machine"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Specifications / Model</label>
            <input
              type="text"
              className="form-input"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="e.g. Negative Pressure Isolation, Leukoreduced, Hamilton-C6"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Total Quantity</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <input
                type="text"
                className="form-input"
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                placeholder="Beds / Units"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alert Threshold</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Location, storage temp, maintenance schedule, on-call paging details..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
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
              className="btn btn-primary"
              disabled={submitting}
            >
              <PlusCircle size={16} />
              <span>{submitting ? 'Publishing...' : 'Publish to Network'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
