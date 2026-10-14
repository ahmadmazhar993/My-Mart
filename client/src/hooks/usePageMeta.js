import { useEffect } from 'react';

const SITE_NAME = 'AHM Mart';

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute('content');
  el.setAttribute('content', content);
  return () => el.setAttribute('content', previous ?? '');
};

// Sets title, description, canonical URL and Open Graph/Twitter tags for the current page, and
// restores the previous values on unmount. `jsonLd` (optional) is injected as a JSON-LD script.
// This is client-side only: crawlers that do not run JavaScript will see the defaults in index.html.
const usePageMeta = ({ title, description, path, image, type = 'website', jsonLd } = {}) => {
  useEffect(() => {
    const cleanups = [];
    const fullTitle = title ? `${title} | ${SITE_NAME}` : document.title;
    const previousTitle = document.title;
    document.title = fullTitle;
    cleanups.push(() => { document.title = previousTitle; });

    const url = `${window.location.origin}${path ?? window.location.pathname}`;
    if (description) {
      cleanups.push(upsertMeta('name', 'description', description));
      cleanups.push(upsertMeta('property', 'og:description', description));
      cleanups.push(upsertMeta('name', 'twitter:description', description));
    }
    cleanups.push(upsertMeta('property', 'og:title', fullTitle));
    cleanups.push(upsertMeta('name', 'twitter:title', fullTitle));
    cleanups.push(upsertMeta('property', 'og:type', type));
    cleanups.push(upsertMeta('property', 'og:url', url));
    if (image) {
      const abs = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      cleanups.push(upsertMeta('property', 'og:image', abs));
      cleanups.push(upsertMeta('name', 'twitter:image', abs));
    }

    let canonical = document.head.querySelector('link[rel="canonical"]');
    const hadCanonical = Boolean(canonical);
    const previousHref = canonical?.getAttribute('href');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
    cleanups.push(() => {
      if (hadCanonical) canonical.setAttribute('href', previousHref);
      else canonical.remove();
    });

    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
      cleanups.push(() => script.remove());
    }

    return () => cleanups.forEach((fn) => fn());
  }, [title, description, path, image, type, jsonLd]);
};

export default usePageMeta;
