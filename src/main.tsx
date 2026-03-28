import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RootErrorBoundary } from './RootErrorBoundary.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  document.getElementById('root')!.innerHTML = `
    <div style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:1.5rem;line-height:1.5">
      <h1 style="font-size:1.125rem;margin:0 0 0.75rem">Convex URL missing</h1>
      <p style="margin:0;color:#444">Create <code>.env.local</code> with <code>VITE_CONVEX_URL=</code> your deployment URL from <code>npx convex dev</code>.</p>
    </div>
  `
} else {
  const convex = new ConvexReactClient(convexUrl)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RootErrorBoundary>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </RootErrorBoundary>
    </StrictMode>,
  )
}
