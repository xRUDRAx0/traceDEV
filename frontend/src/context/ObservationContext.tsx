import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

interface ObservationContextType {
  isActive: boolean;
  toggleObservation: () => Promise<void>;
  isLoading: boolean;
  liveEvents: any[];
  socket: Socket | null;
  currentSessionId: string | null;
  livePattern: any;
}

const ObservationContext = createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [livePattern, setLivePattern] = useState<any>(null);

  useEffect(() => {
    // Initial fetch of settings
    fetch(`${API_URL}/api/settings/observation`)
      .then(res => res.json())
      .then(data => {
        setIsActive(data.active);
        setCurrentSessionId(data.sessionId || null);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load observation settings', err);
        setIsLoading(false);
      });

    // Setup Socket.IO
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('observation_status', (data) => {
      setIsActive(data.active);
      setCurrentSessionId(data.sessionId || null);
      if (data.active && data.sessionId !== currentSessionId) {
        setLiveEvents([]); // Clear live events on new session start
        setLivePattern(null);
      }
    });

    newSocket.on('new_event', (event) => {
      setLiveEvents(prev => {
        if (event.sessionId && event.sessionId !== currentSessionId) {
          // rare mismatch ignored
        }
        return [event, ...prev];
      });
    });

    newSocket.on('live_pattern', (pattern) => {
      setLivePattern(pattern);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const toggleObservation = async () => {
    const newState = !isActive;
    setIsActive(newState); // Optimistic UI update
    
    try {
      await fetch(`${API_URL}/api/settings/observation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });
    } catch (err) {
      console.error('Failed to save observation setting', err);
      setIsActive(!newState); // Revert on failure
    }
  };

  return (
    <ObservationContext.Provider value={{ isActive, toggleObservation, isLoading, liveEvents, socket, currentSessionId, livePattern }}>
      {children}
    </ObservationContext.Provider>
  );
}

export function useObservation() {
  const context = useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservation must be used within an ObservationProvider');
  }
  return context;
}
