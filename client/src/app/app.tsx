import { ErrorBoundary } from './error-boundary';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}
