import { useEffect, useState } from 'preact/hooks';

/** The phone layout applies below 760px. */
const PHONE_QUERY = '(max-width: 759.98px)';

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return phone;
}
