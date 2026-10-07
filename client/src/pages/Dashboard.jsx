import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  Activity, 
  Bed, 
  Droplet, 
  Flame, 
  Truck, 
  Radio, 
  Layers, 
  PlusCircle, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Dashboard = ({ setCurrentTab, onOpenBroadcast, onOpenNewResource }) => {
  const { user, currentHospital } = useAuth();
  const { lastEvent } = useSocket();
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [anaData, reqData, trfData, logData] = await Promise.all([
        api.get('/api/audit/analytics').catch(() => ({})),
        api.get('/api/emergency/requests').catch(() => ({ requests: [] })),
        api.get('/api/transfers').catch(() => ({ transfers: [] })),
        api.get('/api/audit/logs', { limit: 6 }).catch(() => ({ logs: [] }))
      ]);

      if (anaData.success) setAnalytics(anaData.analytics);
      if (reqData.requests) setRequests(reqData.requests.slice(0, 5));
      if (trfData.transfers) setTransfers(trfData.transfers.filter(t => t.status !== 'ARRIVED_VERIFIED'));
      if (logData.logs) setRecentLogs(logData.logs);
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, lastEvent]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Welcome & Operational Readiness */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(14, 26, 56, 0.9) 0%, rgba(9, 19, 41, 0.9) 100%)',
        padding: '1.25rem 1.75rem',
        borderRadius: '14px',
        border: '1px solid rgba(0, 229, 255, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.04em' }}>
              OPERATIONAL READINESS STATUS: LEVEL 1 ACTIVE
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {currentHospital?.name || 'Regional Emergency Directorate'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Signed in as <strong>{user?.name}</strong> ({user?.role}) • {user?.department || 'Medical Operations'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentTab('radar')}
            className="btn btn-primary"
            style={{ fontSize: '0.825rem' }}
          >
            <Radio size={16} />
            <span>Launch Emergency Radar</span>
          </button>
          <button
            onClick={onOpenNewResource}
            className="btn btn-secondary"
            style={{ fontSize: '0.825rem' }}
          >
            <PlusCircle size={16} />
            <span>Publish Resource</span>
          </button>
          <button
            onClick={onOpenBroadcast}
            className="btn btn-emergency"
            style={{ fontSize: '0.825rem' }}
          >
            <Flame size={16} />
            <span>Code Red Alert</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* ICU Beds KPI */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="form-label">Available ICU Beds</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                {analytics?.resources?.availableICUBeds ?? 12}
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                  /{analytics?.resources?.totalICUBeds ?? 52}
                </span>
              </div>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.6rem', borderRadius: '10px' }}>
              <Bed size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              {100 - (analytics?.resources?.icuOccupancyPercent || 76)}% Bed Reserve
            </span>
            <span>across verified network</span>
          </div>
        </div>

        {/* Blood Supply KPI */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="form-label">Critical Blood Reserves</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff6b7d', marginTop: '0.25rem' }}>
                {analytics?.resources?.availableBloodUnits ?? 37}
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}> Units</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 51, 75, 0.15)', color: '#ff6b7d', padding: '0.6rem', borderRadius: '10px' }}>
              <Droplet size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span className="status-pill available" style={{ fontSize: '0.65rem' }}>
              Universal O- Active
            </span>
            <span>Cold-chain tracked</span>
          </div>
        </div>

        {/* Active Emergency Requests */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="form-label">Active Requests</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                {analytics?.requests?.activeRequestsCount ?? 2}
                <span style={{ fontSize: '1rem', color: '#ff6b7d', fontWeight: 600, marginLeft: '0.5rem' }}>
                  ({analytics?.requests?.codeRedActiveCount ?? 1} Code Red)
                </span>
              </div>
            </div>
            <div style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.6rem', borderRadius: '10px' }}>
              <Activity size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <Clock size={14} style={{ color: '#fbbf24' }} />
            <span>Avg. confirmation: <strong>6.4 mins</strong></span>
          </div>
        </div>

        {/* In-Transit Units */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="form-label">Active Transfers</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                {transfers.length}
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}> En-Route</span>
              </div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.6rem', borderRadius: '10px' }}>
              <Truck size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <ShieldCheck size={14} style={{ color: '#34d399' }} />
            <span>Chain-of-Custody PIN Secured</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Requests & Live Transits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {/* Active Emergency Requests Stream */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Activity size={18} style={{ color: '#00e5ff' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Active Emergency Coordination</h3>
            </div>
            <button
              onClick={() => setCurrentTab('requests')}
              className="btn btn-secondary btn-sm"
            >
              <span>View All ({requests.length})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.5rem auto' }} />
              <p>No pending emergency requests. Network resources stabilized.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requests.map((req) => (
                <div
                  key={req._id}
                  style={{
                    background: '#091329',
                    border: req.urgency === 'CODE_RED_CRITICAL' ? '1px solid rgba(255, 51, 75, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '0.9rem 1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        {req.requestNumber}
                      </span>
                      <span className={`status-pill ${req.urgency.toLowerCase()}`}>
                        {req.urgency.replace('_', ' ')}
                      </span>
                    </div>
                    <span className={`status-pill ${req.status.toLowerCase()}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#f1f5f9' }}>
                      {req.quantityRequested}x {req.resourceName}
                    </strong>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span><strong>From:</strong> {req.requestingHospital?.name || 'Requesting Facility'}</span>
                    <span>→</span>
                    <span><strong>To:</strong> {req.supplyingHospital?.name || 'Open Network Broadcast'}</span>
                  </div>

                  {req.clinicalReason && (
                    <div style={{ fontSize: '0.775rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(0,0,0,0.25)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                      "{req.clinicalReason}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Transfer Vectors & Ambulance Monitoring */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Truck size={18} style={{ color: '#00e5ff' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Active Medical Transit Dispatch</h3>
            </div>
            <button
              onClick={() => setCurrentTab('transfers')}
              className="btn btn-secondary btn-sm"
            >
              <span>Dispatch Board</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <Truck size={36} style={{ color: '#64748b', margin: '0 auto 0.5rem auto' }} />
              <p>No emergency transfer units currently on the road.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transfers.map((trf) => (
                <div
                  key={trf._id}
                  style={{
                    background: '#091329',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '0.9rem 1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="mono" style={{ color: '#00e5ff', fontWeight: 700, fontSize: '0.85rem' }}>
                        {trf.vehicleIdentifier}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ({trf.vehicleType})
                      </span>
                    </div>
                    <span className="status-pill in_transit">
                      {trf.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                    <strong>Payload:</strong> {trf.resourceName}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <div>
                      <span>Route: </span>
                      <strong style={{ color: '#e2e8f0' }}>{trf.fromHospital?.name?.split(' ')[0]}</strong>
                      <span> → </span>
                      <strong style={{ color: '#e2e8f0' }}>{trf.toHospital?.name?.split(' ')[0]}</strong>
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                      ~{trf.estimatedMinutes} mins ETA ({trf.distanceKm} km)
                    </div>
                  </div>

                  {/* Progress milestones */}
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.3rem' }}>
                    {trf.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          height: '5px',
                          borderRadius: '2px',
                          background: m.done ? '#10b981' : '#1e293b'
                        }}
                        title={`${m.label}: ${m.done ? 'Completed' : 'Pending'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance & Immutable Event Log Ticker */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={18} style={{ color: '#00e5ff' }} />
            <h3 style={{ fontSize: '1.05rem' }}>Live Compliance & Digital Audit Stream</h3>
          </div>
          <button
            onClick={() => setCurrentTab('audit')}
            className="btn btn-secondary btn-sm"
          >
            <span>Full Audit Log</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor & Facility</th>
                <th>Details</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log._id}>
                  <td className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td>
                    <strong style={{ color: '#e2e8f0', fontSize: '0.825rem' }}>{log.action}</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem', color: '#f1f5f9' }}>{log.actorName}</div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{log.hospitalName} ({log.actorRole})</div>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                    {log.details}
                  </td>
                  <td>
                    <span className={`status-pill ${log.severity === 'CRITICAL' ? 'code_red' : log.severity === 'WARNING' ? 'urgent' : 'available'}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
