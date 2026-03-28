import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RootErrorBoundary } from './RootErrorBoundary.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  const isProdHost =
    typeof window !== 'undefined' &&
    !/localhost|127\.0\.0\.1/.test(window.location.hostname)
  document.getElementById('root')!.innerHTML = `
    <div style="font-family:system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:1.5rem;line-height:1.55">
      <h1 style="font-size:1.125rem;margin:0 0 0.75rem">Convex URL missing</h1>
      <p style="margin:0 0 0.85rem;color:#444">
        This app needs <code style="font-size:0.9em">VITE_CONVEX_URL</code> (your Convex deployment URL, e.g.
        <code style="font-size:0.85em">https://happy-animal-123.convex.cloud</code>).
      </p>
      ${
        isProdHost
          ? `<p style="margin:0 0 0.85rem;color:#444"><strong>Vercel / production:</strong> In the Vercel project → <strong>Settings → Environment Variables</strong>, add <code>VITE_CONVEX_URL</code> with that URL. Enable it for <strong>Production</strong> and <strong>Preview</strong>, then <strong>Redeploy</strong> (Vite bakes this in at build time).</p>`
          : `<p style="margin:0;color:#444">Locally: create <code>.env.local</code> with <code>VITE_CONVEX_URL=...</code> (from <code>npx convex dev</code> or your Convex dashboard).</p>`
      }
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
