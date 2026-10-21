import { useEffect, useState } from 'react';

const CONSULTA = '(max-width: 699px)';

/** true em telas de celular, onde as telas trocam de layout. */
export function useCelular(): boolean {
  const [celular, setCelular] = useState(() => window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    const m = window.matchMedia(CONSULTA);
    const mudar = () => setCelular(m.matches);
    m.addEventListener('change', mudar);
    return () => m.removeEventListener('change', mudar);
  }, []);
  return celular;
}
