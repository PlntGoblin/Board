import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1626', fontSize: '16px', color: '#8892b0',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthModal redirectTo={window.location.pathname} />;
  }

  return children;
}
