import React from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { Flame, X, ArrowRight, ShieldAlert } from 'lucide-react';

export const EmergencyBanner = ({ onViewRequest }) => {
  const { activeAlerts, dismissAlert } = useSocket();

  if (!activeAlerts || activeAlerts.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.75rem 2rem 0.25rem 2rem',
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%'
    }}>
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="glass-panel pulse-emergency"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 51, 75, 0.2) 0%, rgba(14, 26, 56, 0.95) 100%)',
            border: '1px solid rgba(255, 51, 75, 0.6)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: '#ff334b',
              color: '#fff',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Flame size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <strong style={{ color: '#ff6b7d', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
                  {alert.title}
                </strong>
                <span className="status-pill code_red" style={{ fontSize: '0.65rem' }}>
                  CRITICAL
                </span>
              </div>
              <div style={{ fontSize: '0.825rem', color: '#e2e8f0', marginTop: '0.15rem' }}>
                {alert.message}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {alert.raw?.broadcastId && (
              <button
                onClick={() => onViewRequest && onViewRequest(alert.raw.broadcastId)}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.75rem' }}
              >
                <span>Respond & Lock</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={() => dismissAlert(alert.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Dismiss Alert"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
