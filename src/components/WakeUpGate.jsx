import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.jpg';

const MAX_WAIT_MS = 90000; // 90 seconds max
const POLL_INTERVAL_MS = 3000;

const MESSAGES = [
  'Starting up…',
  'Warming up the server…',
  'Almost there…',
  'Just a moment…',
  'Getting things ready…',
];

const WakeUpGate = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch('/api/status', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled && res.ok) {
          setReady(true);
          return;
        }
      } catch {
        // server not ready yet — keep polling
      }

      if (cancelled) return;

      const waited = Date.now() - startRef.current;
      if (waited >= MAX_WAIT_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(ping, POLL_INTERVAL_MS);
    };

    // Tick elapsed time for progress bar
    const ticker = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 3000);

    ping();

    return () => {
      cancelled = true;
      clearInterval(ticker);
    };
  }, []);

  if (ready) return children;

  const progress = Math.min((elapsed / MAX_WAIT_MS) * 100, 95);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff0f6 0%, #ffffff 60%, #fce4ec 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: 24,
      boxSizing: 'border-box',
    }}>
      {/* Logo */}
      <img
        src={logo}
        alt="Teen Girl"
        style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                 boxShadow: '0 4px 20px rgba(233,30,140,0.25)', marginBottom: 24 }}
      />

      {/* Brand name */}
      <div style={{ fontSize: 26, fontWeight: 900, color: '#e91e8c',
                    letterSpacing: 1, marginBottom: 6 }}>
        TEEN GIRL
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 36 }}>
        Point of Sale System
      </div>

      {timedOut ? (
        <>
          <div style={{ fontSize: 14, color: '#c62828', fontWeight: 600,
                        marginBottom: 12, textAlign: 'center' }}>
            Server is taking longer than usual.
          </div>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'center',
                        marginBottom: 20, maxWidth: 280 }}>
            Please check your internet connection, then try refreshing.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#e91e8c', color: '#fff', border: 'none',
                     borderRadius: 8, padding: '10px 28px', fontSize: 14,
                     fontWeight: 700, cursor: 'pointer' }}
          >
            Retry
          </button>
        </>
      ) : (
        <>
          {/* Status message */}
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24,
                        minHeight: 20, textAlign: 'center' }}>
            {MESSAGES[msgIdx]}
          </div>

          {/* Progress bar */}
          <div style={{ width: 260, background: '#f8bbd0', borderRadius: 8,
                        height: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #e91e8c, #f06292)',
              borderRadius: 8,
              transition: 'width 2.8s ease',
            }} />
          </div>

          {/* Pulsing dots */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 28 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: '#e91e8c',
                animation: `tg-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }} />
            ))}
          </div>

          <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center',
                        maxWidth: 260 }}>
            First load may take up to 60 seconds while the server wakes up.
          </div>
        </>
      )}

      <style>{`
        @keyframes tg-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WakeUpGate;
