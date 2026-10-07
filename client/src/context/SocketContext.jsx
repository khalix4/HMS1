import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { soundManager } from '../utils/soundAlert.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    // Connect to Socket.io server
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('[SOCKET] Connected to real-time dispatch network.');
      setIsConnected(true);
      s.emit('join_network');
    });

    s.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from network.');
      setIsConnected(false);
    });

    // Real-time Event Handlers
    s.on('code_red_broadcast', (data) => {
      console.log('[SOCKET] CODE RED BROADCAST:', data);
      soundManager.playEmergencySiren();
      const newAlert = {
        id: `alert_${Date.now()}`,
        type: 'CODE_RED',
        title: `🚨 EMERGENCY BROADCAST: ${data.resourceName}`,
        message: `${data.hospitalName} urgently requires ${data.quantity} units. Clinical: "${data.clinicalReason}"`,
        timestamp: new Date(),
        raw: data
      };
      setActiveAlerts((prev) => [newAlert, ...prev]);
      setLastEvent({ type: 'code_red_broadcast', data });
    });

    s.on('new_emergency_request', (data) => {
      console.log('[SOCKET] New emergency request:', data);
      soundManager.playEmergencySiren();
      const newAlert = {
        id: `alert_${Date.now()}`,
        type: 'NEW_REQUEST',
        title: `⚠️ New Resource Request`,
        message: data.message,
        timestamp: new Date(),
        raw: data
      };
      setActiveAlerts((prev) => [newAlert, ...prev]);
      setLastEvent({ type: 'new_emergency_request', data });
    });

    s.on('request_approved', (data) => {
      console.log('[SOCKET] Request approved:', data);
      soundManager.playSuccessChime();
      const newAlert = {
        id: `alert_${Date.now()}`,
        type: 'APPROVED',
        title: `✅ Request Approved & Locked`,
        message: data.message,
        timestamp: new Date(),
        raw: data
      };
      setActiveAlerts((prev) => [newAlert, ...prev]);
      setLastEvent({ type: 'request_approved', data });
    });

    s.on('request_declined', (data) => {
      console.log('[SOCKET] Request declined:', data);
      setLastEvent({ type: 'request_declined', data });
    });

    s.on('transfer_dispatched', (data) => {
      console.log('[SOCKET] Transfer dispatched:', data);
      soundManager.playRadioClick();
      setLastEvent({ type: 'transfer_dispatched', data });
    });

    s.on('transfer_completed', (data) => {
      console.log('[SOCKET] Transfer completed:', data);
      soundManager.playSuccessChime();
      const newAlert = {
        id: `alert_${Date.now()}`,
        type: 'COMPLETED',
        title: `🎉 Transfer Handoff Verified`,
        message: data.message,
        timestamp: new Date(),
        raw: data
      };
      setActiveAlerts((prev) => [newAlert, ...prev]);
      setLastEvent({ type: 'transfer_completed', data });
    });

    s.on('resource_updated', (data) => {
      setLastEvent({ type: 'resource_updated', data });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // When user switches hospital, join that hospital's room
  useEffect(() => {
    if (socket && user?.hospitalId) {
      socket.emit('join_hospital', user.hospitalId);
    }
  }, [socket, user?.hospitalId]);

  const dismissAlert = (alertId) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const toggleSound = () => {
    const newState = soundManager.toggleSound();
    setSoundEnabled(newState);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeAlerts,
        dismissAlert,
        soundEnabled,
        toggleSound,
        lastEvent
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
