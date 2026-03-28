import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Complaint } from '../types/complaint'

/** Approximate bounds for mainland India + islands (W–E, S–N). */
const INDIA_BOUNDS = L.latLngBounds([6.2, 68.0], [37.4, 97.5])

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openComplaintsWithGeo(complaints: Complaint[]) {
  return complaints.filter(
    (c) =>
      c.status !== 'Resolved' &&
      c.lat != null &&
      c.lng != null &&
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng),
  )
}

export interface IndiaFieldMapProps {
  complaints: Complaint[]
  signedIn: boolean
}

export function IndiaFieldMap({ complaints, signedIn }: IndiaFieldMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  const openWithGeo = useMemo(() => openComplaintsWithGeo(complaints), [complaints])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    setMapError(null)

    try {
      const map = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      })

      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const markers = L.layerGroup().addTo(map)
      layerRef.current = markers

      map.fitBounds(INDIA_BOUNDS, { padding: [14, 14] })

      const t1 = window.setTimeout(() => map.invalidateSize(), 100)
      const t2 = window.setTimeout(() => map.invalidateSize(), 400)

      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
        layerRef.current = null
        mapRef.current = null
        map.remove()
      }
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Map could not load')
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const pin = L.divIcon({
      className: 'cc-leaflet-marker',
      html: '<div class="cc-leaflet-marker__inner"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -18],
    })

    for (const c of openWithGeo) {
      const lat = c.lat as number
      const lng = c.lng as number
      L.marker([lat, lng], { icon: pin })
        .bindPopup(
          `<div class="cc-leaflet-popup"><strong>${escapeHtml(c.id)}</strong><br/>${escapeHtml(c.issueType)}<br/><span class="cc-leaflet-popup__status">${escapeHtml(c.status)}</span></div>`,
        )
        .addTo(layer)
    }

    if (openWithGeo.length > 0) {
      const bounds = L.latLngBounds(openWithGeo.map((c) => [c.lat as number, c.lng as number]))
      map.fitBounds(bounds, { padding: [52, 52], maxZoom: 15 })
    } else {
      map.fitBounds(INDIA_BOUNDS, { padding: [14, 14] })
    }

    window.setTimeout(() => map.invalidateSize(), 50)
  }, [openWithGeo])

  const hasOpenWithoutGeo =
    signedIn &&
    openWithGeo.length === 0 &&
    complaints.some((c) => c.status !== 'Resolved')

  return (
    <div className="cc-map cc-map--leaflet">
      {!signedIn && (
        <p className="cc-map__banner">Sign in to see your open grievances with GPS on the map (updates live).</p>
      )}
      {hasOpenWithoutGeo && (
        <p className="cc-map__banner cc-map__banner--soft">
          You have open reports without map coordinates. Use <strong>Use my location</strong> when filing a report to
          appear here.
        </p>
      )}
      {mapError ? (
        <p className="cc-map__error">{mapError}</p>
      ) : (
        <div
          ref={hostRef}
          className="cc-map__leaflet-host"
          role="application"
          aria-label="Map of India with your open complaint locations"
        />
      )}
    </div>
  )
}
