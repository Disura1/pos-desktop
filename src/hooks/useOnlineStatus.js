import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

export const useOnlineStatus = (pollMs = 10000) => {
  const [isOnline, setIsOnline] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    const check = async () => {
      try {
        await apiClient.get('/status', { timeout: 4000 });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    timer.current = setInterval(check, pollMs);
    return () => clearInterval(timer.current);
  }, [pollMs]);

  return isOnline;
};