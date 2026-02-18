import { useMemo } from 'react';

export default function Confetti() {
  const colors = ['#38bdf8', '#818cf8', '#facc15', '#f472b6', '#34d399', '#fb923c', '#a78bfa'];

  const pieces = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 1.5,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      isCircle: i % 3 === 0,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.left}%`, top: '-10px',
          width: `${p.size}px`, height: p.isCircle ? `${p.size}px` : `${p.size * 0.6}px`,
          background: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          transform: `rotate(${p.rotation}deg)`, opacity: 0,
        }} />
      ))}
      <div style={{
        position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px',
        padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '10px',
        animation: 'confetti-toast 4s ease forwards',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontSize: '22px' }}>🎉</span>
        <span style={{
          fontSize: '15px', fontWeight: '600',
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          The more the merrier!
        </span>
      </div>
    </div>
  );
}
