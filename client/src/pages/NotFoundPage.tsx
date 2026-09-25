import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-fg">Page not found</h1>
      <p className="mt-2 text-sm text-fg-3">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className={buttonStyles('primary', 'md', 'mt-6')}>
        Back to dashboard
      </Link>
    </div>
  );
}
