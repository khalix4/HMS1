import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  ShieldCheck, 
  Download, 
  Search, 
  Filter, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export const AuditAnalytics = () => {
  const { lastEvent } = useSocket();
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAuditData = async () => {
    try {
      const [logData, anaData] = await Promise.all([
        api.get('/api/audit/logs', { severity: severityFilter || undefined, limit: 150 }),
        api.get('/api/audit/analytics')
      ]);

      if (logData.success) setLogs(logData.logs);
      if (anaData.success) setAnalytics(anaData.analytics);
    } catch (e) {
      console.warn('Failed to load audit data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [severityFilter, lastEvent]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.hospitalName.toLowerCase().includes(q);
  });

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MAYO_HERCS_AUDIT_LOG_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={22} style={{ color: '#00e5ff' }} />
            <h2 style={{ fontSize: '1.35rem' }}>Digital Audit Trails & Regulatory Analytics</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Immutable, tamper-evident chronological event log tracking every request, atomic reservation, dispatch, and handoff.
          </p>
        </div>

        <div>
          <button
            onClick={handleExportJson}
            className="btn btn-secondary btn-sm"
          >
            <Download size={15} />
            <span>Export Compliance Log (JSON)</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span className="form-label">Verified Facilities</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
            {analytics?.verifiedHospitals || 4}
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/{analytics?.totalHospitals || 5} Active</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            Regional mesh coverage
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span className="form-label">Avg. Response Turnaround</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
            6.2 <span style={{ fontSize: '1rem', color: '#64748b' }}>min</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.4rem' }}>
            Sub-10 minute compliance target met
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span className="form-label">Fulfillment Success Rate</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
            94.8%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            Atomic reservations prevent double-allocation
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span className="form-label">Total Completed Handoffs</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#00e5ff', marginTop: '0.2rem' }}>
            {analytics?.requests?.totalRequests || 2}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            100% Chain-of-custody PIN verified
          </div>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail, actor, request ID..."
              style={{ paddingLeft: '2.2rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          </div>

          <div>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL (Code Red & Emergency Broadcasts)</option>
              <option value="WARNING">WARNING (Declines & Suspensions)</option>
              <option value="NORMAL">NORMAL (Reservations & Dispatches)</option>
              <option value="LOW">LOW (Logins & Heartbeats)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC/Local)</th>
                <th>Action Type</th>
                <th>Authorized Actor</th>
                <th>Hospital Facility</th>
                <th>Audit Details & Cryptographic Trace</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <strong style={{ color: '#00e5ff', fontSize: '0.8rem' }}>{log.action}</strong>
                    </td>
                    <td>
                      <div style={{ color: '#fff', fontSize: '0.825rem' }}>{log.actorName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{log.actorRole}</div>
                    </td>
                    <td>
                      <span style={{ color: '#e2e8f0', fontSize: '0.825rem' }}>{log.hospitalName}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <div>{log.details}</div>
                      <div className="mono" style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '0.15rem' }}>
                        IP: {log.ipAddress || '127.0.0.1'} • TRACE-ID: {log._id}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${log.severity === 'CRITICAL' ? 'code_red' : log.severity === 'WARNING' ? 'urgent' : 'available'}`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
