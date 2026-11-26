import { AuthProvider } from '../shared/auth/AuthProvider.jsx';
import { AppRouter } from './router.jsx';

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
