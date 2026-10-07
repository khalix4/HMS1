import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Radio, 
  Search, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Send, 
  Building2, 
  Flame, 
  Sliders,
  CheckCircle2
} from 'lucide-react';

export const EmergencyRadar = ({ onRequestSuccess }) => {
  const { currentHospital } = useAuth();
  const [category, setCategory] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [urgency, setUrgency] = useState('CODE_RED_CRITICAL');
  const [maxDistanceKm, setMaxDistanceKm] = useState(75);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [quantityToRequest, setQuantityToRequest] = useState(1);
  const [clinicalReason, setClinicalReason] = useState('Critical emergency resource required for life-threatening resuscitation.');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const executeRadarSearch = async () => {
    if (!currentHospital?._id) return;
    setSearching(true);
    setSuccessMessage('');
    try {
      const data = await api.post('/api/emergency/search', {
        originHospitalId: currentHospital._id,
        category: category || undefined,
        resourceName: resourceName || undefined,
        maxDistanceKm: Number(maxDistanceKm),
        urgency
      });
      if (data.success) {
        setResults(data.matches);
      }
    } catch (e) {
      console.warn('Radar search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    executeRadarSearch();
  }, [currentHospital?._id, urgency, category, maxDistanceKm]);

  const handleOpenRequest = (match) => {
    setSelectedMatch(match);
    setQuantityToRequest(1);
    setClinicalReason(`Emergent requirement for ${match.resource.name} at ${currentHospital?.name}. Urgency: ${urgency}`);
  };

  const handleSendFormalRequest = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setSubmittingRequest(true);

    try {
      const data = await api.post('/api/emergency/requests', {
        supplyingHospitalId: selectedMatch.hospital._id,
        resourceId: selectedMatch.resource._id,
        quantityRequested: Number(quantityToRequest),
        urgency,
        clinicalReason,
        requestedEtaMinutes: selectedMatch.estTransitMinutes
      });

      if (data.success) {
        setSuccessMessage(`Formal emergency request ${data.request.requestNumber} dispatched to ${selectedMatch.hospital.name}!`);
        setSelectedMatch(null);
        if (onRequestSuccess) onRequestSuccess(data.request);
      }
    } catch (err) {
      alert(`Request failed: ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Radar Controls */}
      <div className="glass-panel glow-cyan">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Radio size={22} style={{ color: '#00e5ff' }} />
              <h2 style={{ fontSize: '1.35rem' }}>Regional Emergency Radar & Proximity Scanner</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Origin Radar Hub: <strong style={{ color: '#f8fafc' }}>{currentHospital?.name}</strong> • Real-time Haversine proximity computation
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TRIAGE URGENCY:</span>
            {[
              { id: 'CODE_RED_CRITICAL', label: 'Code Red (<60m)', color: '#ff334b' },
              { id: 'URGENT', label: 'Urgent (2-4h)', color: '#fbbf24' },
              { id: 'ROUTINE', label: 'Routine (12-24h)', color: '#10b981' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setUrgency(t.id)}
                style={{
                  background: urgency === t.id ? `${t.color}22` : 'transparent',
                  border: `1px solid ${urgency === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                  color: urgency === t.id ? t.color : '#94a3b8',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Resource Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Resource Types</option>
              <option value="ICU_BED">ICU & Critical Beds</option>
              <option value="BLOOD_PRODUCT">Blood Products & Plasma</option>
              <option value="EQUIPMENT">Critical Equipment (ECMO/Vent)</option>
              <option value="SPECIALIST">On-Call Specialist Teams</option>
              <option value="CRITICAL_MEDICATION">Critical Antivenoms & Drugs</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Keyword / Specific Model</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="e.g. O-, ECMO, PICU..."
                style={{ paddingLeft: '2.2rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Search Radius:</span>
              <strong style={{ color: '#00e5ff' }}>{maxDistanceKm} km</strong>
            </label>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(e.target.value)}
              style={{ accentColor: '#00e5ff', cursor: 'pointer', height: '36px' }}
            />
          </div>

          <div>
            <button
              onClick={executeRadarSearch}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
              disabled={searching}
            >
              <Radio size={16} />
              <span>{searching ? 'Scanning Radar...' : 'Scan Nearby'}</span>
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '0.9rem 1.25rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Radar Graphic & Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Visual Radar Scope */}
        <div className="glass-panel" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem', color: '#00e5ff' }}>TACTICAL PROXIMITY SCOPE</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>Concentric Range Rings (25km / 50km / 75km)</p>

          <div style={{
            width: '300px',
            height: '300px',
            margin: '0 auto',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #091a38 0%, #050b1a 100%)',
            border: '2px solid rgba(0, 229, 255, 0.4)',
            position: 'relative',
            boxShadow: '0 0 30px rgba(0, 229, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Concentric rings */}
            <div style={{ width: '220px', height: '220px', borderRadius: '50%', border: '1px dashed rgba(0, 229, 255, 0.25)', position: 'absolute' }} />
            <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: '1px dashed rgba(0, 229, 255, 0.3)', position: 'absolute' }} />
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid rgba(0, 229, 255, 0.4)', position: 'absolute' }} />

            {/* Crosshairs */}
            <div style={{ width: '100%', height: '1px', background: 'rgba(0, 229, 255, 0.2)', position: 'absolute' }} />
            <div style={{ height: '100%', width: '1px', background: 'rgba(0, 229, 255, 0.2)', position: 'absolute' }} />

            {/* Rotating Radar Sweep Line */}
            <div
              className="radar-sweep"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(0, 229, 255, 0.35) 0deg, transparent 60deg, transparent 360deg)'
              }}
            />

            {/* Center Blip: Origin Hospital */}
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#00e5ff',
                boxShadow: '0 0 10px #00e5ff',
                position: 'absolute',
                zIndex: 10
              }}
              title={`Origin: ${currentHospital?.name}`}
            />

            {/* Simulated Targets / Hospital Blips on Radar */}
            {results.slice(0, 6).map((match, idx) => {
              // Map distance to radial offset
              const angle = (idx * 65 + 40) * (Math.PI / 180);
              const maxScopeDist = Math.max(maxDistanceKm, 10);
              const radiusFraction = Math.min(0.85, (match.distanceKm / maxScopeDist) * 0.8 + 0.15);
              const r = 135 * radiusFraction;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;

              return (
                <div
                  key={match.resource._id}
                  onClick={() => handleOpenRequest(match)}
                  style={{
                    position: 'absolute',
                    transform: `translate(${x}px, ${y}px)`,
                    cursor: 'pointer',
                    zIndex: 20
                  }}
                  title={`${match.hospital.name}: ${match.resource.name} (${match.distanceKm} km)`}
                >
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: match.resource.category === 'BLOOD_PRODUCT' ? '#ff334b' : '#34d399',
                    boxShadow: `0 0 8px ${match.resource.category === 'BLOOD_PRODUCT' ? '#ff334b' : '#34d399'}`,
                    margin: '0 auto'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: '#f8fafc', fontWeight: 600, textShadow: '0 1px 3px #000', whiteSpace: 'nowrap' }}>
                    {match.distanceKm}km
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff' }} /> Origin Hub
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff334b' }} /> Blood Unit
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} /> ICU / Equip
            </span>
          </div>
        </div>

        {/* Search Results List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>
              Nearby Available Supplies ({results.length} Matches)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Ranked by emergency transit feasibility
            </span>
          </div>

          {results.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <Radio size={48} style={{ color: '#475569', margin: '0 auto 1rem auto' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No matching resources within {maxDistanceKm} km</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                Try expanding your search radius slider, selecting "All Resource Types", or trigger a network-wide Code Red Broadcast.
              </p>
              <button
                onClick={() => setMaxDistanceKm(150)}
                className="btn btn-secondary btn-sm"
              >
                Expand Radius to 150 km
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {results.map((match) => (
                <div
                  key={match.resource._id}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="status-pill in_transit" style={{ fontSize: '0.65rem' }}>
                        {match.resource.category.replace('_', ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00e5ff', fontWeight: 700, fontSize: '0.85rem' }}>
                        <MapPin size={14} />
                        <span>{match.distanceKm} km</span>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#f8fafc' }}>
                      {match.resource.name}
                    </h4>
                    {match.resource.specification && (
                      <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                        {match.resource.specification}
                      </div>
                    )}

                    <div style={{
                      background: '#091329',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Facility:</span>
                        <strong style={{ color: '#e2e8f0' }}>{match.hospital.name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Available Capacity:</span>
                        <strong style={{ color: '#34d399' }}>{match.resource.availableQuantity} {match.resource.unitOfMeasure}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Est. Transit Time:</span>
                        <strong style={{ color: '#38bdf8' }}>~{match.estTransitMinutes} mins</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRequest(match)}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.825rem' }}
                  >
                    <Send size={15} />
                    <span>Send Emergency Request</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direct Formal Request Modal from Radar */}
      {selectedMatch && (
        <div className="modal-overlay" onClick={() => setSelectedMatch(null)}>
          <div className="modal-content glass-panel glow-cyan" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Submit Formal Emergency Request
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Requesting from: <strong>{selectedMatch.hospital.name}</strong> (~{selectedMatch.estTransitMinutes} mins away)
            </p>

            <form onSubmit={handleSendFormalRequest}>
              <div className="form-group">
                <label className="form-label">Resource</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedMatch.resource.name}
                  disabled
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity Required (Max: {selectedMatch.resource.availableQuantity})</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedMatch.resource.availableQuantity}
                    className="form-input"
                    value={quantityToRequest}
                    onChange={(e) => setQuantityToRequest(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Triage Priority</label>
                  <select
                    className="form-select"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                  >
                    <option value="CODE_RED_CRITICAL">CODE RED (&lt;60m)</option>
                    <option value="URGENT">URGENT (2-4h)</option>
                    <option value="ROUTINE">ROUTINE (12-24h)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Justification</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={clinicalReason}
                  onChange={(e) => setClinicalReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="btn btn-secondary"
                  disabled={submittingRequest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingRequest}
                >
                  <Send size={15} />
                  <span>{submittingRequest ? 'Submitting...' : 'Dispatch Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
