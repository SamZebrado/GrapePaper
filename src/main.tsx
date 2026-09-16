import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import GrapeApplication from './GrapeApplication.tsx'
import { parseHandoff } from './reader/protocol'
import './i18n'
import { UIProvider } from './contexts/UIContext.tsx'

const incoming = parseHandoff(location.hash);
// Consume the fragment before rendering: no PDF/selection goes into requests or referrers.
if (location.hash.startsWith('#grapepaper=')) history.replaceState(null, '', location.pathname + location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <GrapeApplication incoming={incoming} />
    </UIProvider>
  </StrictMode>,
)
