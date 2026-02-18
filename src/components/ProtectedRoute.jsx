import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        fontSize: '16px',
        color: '#666',
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
