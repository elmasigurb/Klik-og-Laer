import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { CatalogProvider } from './features/catalog/CatalogContext'
import { ContentProvider } from './features/content/ContentContext'
import { AuthProvider } from './features/auth/AuthContext'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><ContentProvider><CatalogProvider><App /></CatalogProvider></ContentProvider></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
