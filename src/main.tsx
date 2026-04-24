import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import './theme/variables.css'
import './index.css'
import { setupIonicReact } from '@ionic/react'
import App from './App.tsx'

setupIonicReact()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
