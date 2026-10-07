import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  Layers, 
  Search, 
  Filter, 
  PlusCircle, 
  Plus, 
  Minus, 
  Building2, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const ResourceDirectory = ({ onOpenNewResource }) => {
  const { user, currentHospital } = useAuth();
  const { lastEvent } = useSocket();
  const [resources, setResources] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState(null);

  const fetchDirectory = async () => {
    try {
      const [resData, hospData] = await Promise.all([
        api.get('/api/resources', {
          hospitalId: selectedHospital || undefined,
          category: selectedCategory || undefined
        }),
        api.get('/api/hospitals')
      ]);

      if (resData.success) setResources(resData.resources);
      if (hospData.success) setHospitals(hospData.hospitals);
    } catch (e) {
      console.warn('Error fetching directory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [selectedHospital, selectedCategory, lastEvent]);

  // Handle quick inline quantity adjustment (+ / -)
  const handleQuantityAdjust = async (resource, delta) => {
    const newQty = Math.max(0, resource.availableQuantity + delta);
    setAdjustingId(resource._id);

    try {
      const data = await api.patch(`/api/resources/${resource._id}`, {
        availableQuantity: newQty,
        totalQuantity: Math.max(resource.totalQuantity, newQty)
      });

      if (data.success) {
        setResources(prev => prev.map(r => r._id === resource._id ? { ...r, ...data.resource } : r));
      }
    } catch (err) {
      alert(err.message || 'Failed to update capacity');
    } finally {
      setAdjustingId(null);
    }
  };

  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) ||
      (r.specification && r.specification.toLowerCase().includes(q)) ||
      r.hospitalName.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.35rem' }}>Centralized Real-Time Resource Directory</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Verified hospital equipment, blood supplies, ICU beds, and on-call specialist teams.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchDirectory}
            className="btn btn-secondary btn-sm"
            title="Refresh Directory"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenNewResource}
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={15} />
            <span>Publish Resource</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resource, specification, hospital..."
              style={{ paddingLeft: '2.2rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          </div>

          {/* Hospital Filter */}
          <div>
            <select
              className="form-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            >
              <option value="">All Hospital Facilities</option>
              {hospitals.map(h => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.status})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Resource Categories</option>
              <option value="ICU_BED">ICU & Critical Beds</option>
              <option value="BLOOD_PRODUCT">Blood & Blood Products</option>
              <option value="EQUIPMENT">Critical Equipment (ECMO/Vent)</option>
              <option value="SPECIALIST">On-Call Specialist Teams</option>
              <option value="CRITICAL_MEDICATION">Critical Medications</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource Name & Spec</th>
                <th>Category</th>
                <th>Facility & Location</th>
                <th>Available Capacity</th>
                <th>Status</th>
                <th>Reserved Hold</th>
                <th>In-Use</th>
                <th style={{ textAlign: 'right' }}>Quick Adjust</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No matching resources found in the directory.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
                  const isMyHospital = user?.role === 'NETWORK_ADMIN' || user?.hospitalId === res.hospitalId;

                  return (
                    <tr key={res._id}>
                      <td>
                        <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{res.name}</strong>
                        {res.specification && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            {res.specification}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="status-pill in_transit" style={{ fontSize: '0.65rem' }}>
                          {res.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
                          <Building2 size={14} style={{ color: '#00e5ff' }} />
                          <span style={{ color: '#e2e8f0' }}>{res.hospitalName}</span>
                        </div>
                        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{res.hospitalCity}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: res.availableQuantity > (res.criticalThreshold || 2) ? '#34d399' : res.availableQuantity > 0 ? '#fbbf24' : '#ff6b7d'
                          }}>
                            {res.availableQuantity}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            / {res.totalQuantity} {res.unitOfMeasure}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${res.status.toLowerCase()}`}>
                          {res.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.85rem', color: res.reservedQuantity > 0 ? '#fbbf24' : '#64748b', fontWeight: 600 }}>
                          {res.reservedQuantity} {res.unitOfMeasure}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          {res.inUseQuantity} {res.unitOfMeasure}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isMyHospital ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleQuantityAdjust(res, -1)}
                              disabled={adjustingId === res._id || res.availableQuantity <= 0}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: 'rgba(255, 51, 75, 0.15)',
                                border: '1px solid rgba(255, 51, 75, 0.3)',
                                color: '#ff6b7d',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Decrease Available Capacity"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => handleQuantityAdjust(res, 1)}
                              disabled={adjustingId === res._id}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34d399',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Increase Available Capacity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            Read Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
