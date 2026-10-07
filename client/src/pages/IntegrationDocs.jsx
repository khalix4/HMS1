import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { Share2, Code2, Database, Key, Send, CheckCircle2, Copy } from 'lucide-react';

export const IntegrationDocs = () => {
  const [apiKey, setApiKey] = useState('mayo-hmis-secure-api-key-2026');
  const [endpoint, setEndpoint] = useState('/api/integration/fhir/Location');
  const [responseJson, setResponseJson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Blood bank sync demo state
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const testEndpoint = async () => {
    setLoading(true);
    setResponseJson(null);
    try {
      const res = await fetch(endpoint, {
        headers: { 'X-API-KEY': apiKey }
      });
      const data = await res.json();
      setResponseJson(data);
    } catch (err) {
      setResponseJson({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestBloodBankSync = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const res = await fetch('/api/integration/blood-bank/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey
        },
        body: JSON.stringify({
          hospitalId: 'hosp_mayo_central',
          units: [
            { bloodType: 'O- Negative', quantity: 20 },
            { bloodType: 'Platelets', quantity: 15 }
          ]
        })
      });
      const data = await res.json();
      setSyncStatus(data.message || 'Sync successful');
    } catch (e) {
      setSyncStatus(`Sync error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = () => {
    if (responseJson) {
      navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Share2 size={22} style={{ color: '#00e5ff' }} />
          <h2 style={{ fontSize: '1.35rem' }}>HMIS, EMR & FHIR Integration Layer</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          Standardized HL7 FHIR (Fast Healthcare Interoperability Resources) R4 interoperability layer for Electronic Medical Records and Blood Bank automated synchronization.
        </p>
      </div>

      {/* API Key & Architecture Overview */}
      <div className="glass-panel glow-cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} style={{ color: '#00e5ff' }} />
            <h3 style={{ fontSize: '1.05rem' }}>Integration Authorization & Credentials</h3>
          </div>
          <span className="status-pill available" style={{ fontSize: '0.7rem' }}>
            FHIR R4 SPECIFICATION ALIGNED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">API Key (X-API-KEY Header)</label>
            <input
              type="text"
              className="form-input mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            External Electronic Medical Record (EMR) systems like Epic, Cerner, or regional blood bank inventory databases authenticate via the standard <code>X-API-KEY</code> header to securely publish and read resources.
          </div>
        </div>
      </div>

      {/* Interactive API Sandbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Endpoints selector & Blood Bank Sync trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code2 size={18} style={{ color: '#00e5ff' }} />
              <span>FHIR R4 Query Console</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Select Standard FHIR Endpoint</label>
              <select
                className="form-select mono"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              >
                <option value="/api/integration/fhir/Location">GET /api/integration/fhir/Location (Hospital Facilities)</option>
                <option value="/api/integration/fhir/HealthcareService">GET /api/integration/fhir/HealthcareService (ICU Beds & Equipment)</option>
                <option value="/api/integration/fhir/SupplyDelivery">GET /api/integration/fhir/SupplyDelivery (Inter-Hospital Transfers)</option>
              </select>
            </div>

            <button
              onClick={testEndpoint}
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <Send size={15} />
              <span>{loading ? 'Executing Query...' : 'Execute FHIR Request'}</span>
            </button>
          </div>

          {/* Blood Bank Live Sync Simulation */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: '#ff6b7d' }} />
              <span>Laboratory & Blood Bank Automated Sync Webhook</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Simulates an automated barcoded laboratory blood bank sending real-time stock updates for Mayo Regional Medical Center.
            </p>

            <button
              onClick={handleTestBloodBankSync}
              className="btn btn-secondary"
              disabled={syncing}
              style={{ width: '100%' }}
            >
              <Database size={15} style={{ color: '#ff334b' }} />
              <span>{syncing ? 'Synchronizing with LIMS...' : 'Simulate Blood Bank Sync (20x O- Units)'}</span>
            </button>

            {syncStatus && (
              <div style={{
                marginTop: '0.75rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{syncStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live JSON Response Viewer */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Live Payload Response:
            </span>
            {responseJson && (
              <button
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              >
                <Copy size={12} />
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            )}
          </div>

          <pre
            className="mono"
            style={{
              background: '#070d1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '1rem',
              color: '#38bdf8',
              fontSize: '0.775rem',
              overflow: 'auto',
              maxHeight: '420px',
              flex: 1
            }}
          >
            {responseJson
              ? JSON.stringify(responseJson, null, 2)
              : '// Click "Execute FHIR Request" to view live HL7 FHIR Bundle payload'}
          </pre>
        </div>
      </div>
    </div>
  );
};
