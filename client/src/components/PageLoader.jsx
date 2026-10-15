import BrandLoader from './BrandLoader';

// Suspense fallback while a lazily loaded route downloads.
export default function PageLoader() {
  return <BrandLoader variant="page" />;
}
