import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when it detects the reset token in the URL
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/'), 2500);
  };

  const inputStyle = {
    width: '100%', padding: '11px 44px 11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '10px', fontSize: '14px',
    color: '#f0f4ff', outline: 'none',
    boxSizing: 'border-box', transition: 'all 0.2s',
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#080c14',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="Dark Matters" style={{ width: '44px', height: '44px', borderRadius: '12px', filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.4))', marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '600', color: '#f0f4ff', letterSpacing: '-0.5px' }}>
            {done ? 'Password updated' : 'Set new password'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            {done ? 'Redirecting you to sign in…' : ready ? 'Choose a strong password for your account.' : 'Validating your reset link…'}
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '28px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={40} color="#38bdf8" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Your password has been updated.
              </p>
            </div>
          ) : !ready ? (
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#475569', margin: 0 }}>
              If this link has expired, please request a new one from the sign-in page.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  required minLength={6}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required minLength={6}
                  style={{ ...inputStyle, padding: '11px 14px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', marginBottom: '14px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: loading ? 'rgba(56,189,248,0.25)' : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(56,189,248,0.18)',
                }}
              >
                {loading ? 'Updating…' : <><ArrowRight size={16} />Update password</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
