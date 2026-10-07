import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  Activity, 
  Radio, 
  ShieldAlert, 
  Building2, 
  Layers, 
  Truck, 
  FileText, 
  Volume2, 
  VolumeX, 
  Flame, 
  Network,
  Share2,
  Users
} from 'lucide-react';

export const Navbar = ({ currentTab, setCurrentTab, onOpenBroadcast }) => {
  const { user, availableUsers, switchUser, currentHospital } = useAuth();
  const { isConnected, soundEnabled, toggleSound, activeAlerts } = useSocket();
  const [switching, setSwitching] = useState(false);

  const handleUserChange = async (e) => {
    const selectedId = e.target.value;
    if (selectedId && selectedId !== user?.id) {
      setSwitching(true);
      try {
        await switchUser(selectedId);
      } finally {
        setSwitching(false);
      }
    }
  };

  return (
    <header style={{
      background: '#091329',
      borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Top Utility Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00e5ff', fontWeight: 700 }}>
            <Activity size={16} />
            <span>MAYO DIGITAL SOLUTIONS</span>
          </div>
          <span style={{ color: '#475569' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
            }} />
            <span style={{ color: isConnected ? '#94a3b8' : '#ef4444', fontWeight: 500 }}>
              {isConnected ? 'REGIONAL MESH ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Demo Hospital Quick-Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0e1a38', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <Users size={14} style={{ color: '#00e5ff' }} />
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>SWITCH VIEW:</span>
            <select
              value={user?.id || ''}
              onChange={handleUserChange}
              disabled={switching}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.775rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableUsers.map(u => (
                <option key={u.id} value={u.id} style={{ background: '#0e1a38', color: '#fff' }}>
                  {u.name} — {u.hospitalName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={toggleSound}
            title={soundEnabled ? "Audio Alerts Enabled" : "Audio Alerts Muted"}
            style={{
              background: 'transparent',
              border: 'none',
              color: soundEnabled ? '#00e5ff' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem'
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 2rem'
      }}>
        {/* Logo & Facility Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ShieldAlert style={{ color: '#ff334b' }} size={24} />
              <span style={{ letterSpacing: '-0.02em' }}>Emergency Resource Network</span>
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
              <Building2 size={13} style={{ color: '#00e5ff' }} />
              <strong style={{ color: '#f1f5f9' }}>{currentHospital?.name || 'Regional Healthcare Directory'}</strong>
              {currentHospital?.category && (
                <span className="status-pill verified" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                  {currentHospital.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'dashboard', label: 'Command Center', icon: Activity },
            { id: 'radar', label: 'Emergency Radar', icon: Radio },
            { id: 'resources', label: 'Resource Directory', icon: Layers },
            { id: 'requests', label: 'Requests', icon: FileText, badge: activeAlerts.length > 0 ? activeAlerts.length : null },
            { id: 'transfers', label: 'Transit Tracking', icon: Truck },
            { id: 'network', label: 'Hospitals', icon: Network },
            { id: 'audit', label: 'Audit & KPIs', icon: ShieldAlert },
            { id: 'api', label: 'HMIS/FHIR', icon: Share2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  background: isActive ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid transparent',
                  color: isActive ? '#00e5ff' : '#94a3b8',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    background: '#ff334b',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Emergency Broadcast Button */}
        <div>
          <button
            onClick={onOpenBroadcast}
            className="btn btn-emergency pulse-emergency"
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.825rem' }}
          >
            <Flame size={16} />
            <span>CODE RED BROADCAST</span>
          </button>
        </div>
      </div>
    </header>
  );
};
