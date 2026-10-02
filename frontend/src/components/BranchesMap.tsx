import { useMemo, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps'

import { Branch } from '../lib/types'
import {
  MapPin,
  Phone,
  Clock,
  Check,
  Navigation,
  LocateFixed,
} from 'lucide-react'

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY

type UserLocation = {
  lat: number
  lng: number
}

export function BranchesMap({
  branches,
  activeBranchId,
  onSelect,
  height = '460px',
  selectable = false,
}: {
  branches: Branch[]
  activeBranchId?: string | null
  onSelect?: (branch: Branch) => void
  height?: string
  selectable?: boolean
}) {
  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(null)

  const [locationLoading, setLocationLoading] =
    useState(false)

  const [locationError, setLocationError] =
    useState<string | null>(null)

  const branchesWithCoordinates = useMemo(() => {
    return branches.filter(
      (branch) =>
        branch.latitude !== null &&
        branch.latitude !== undefined &&
        branch.longitude !== null &&
        branch.longitude !== undefined
    )
  }, [branches])

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-graphite-700 bg-graphite-900 px-6 text-center"
        style={{ height }}
      >
        <MapPin
          size={32}
          className="mb-3 text-amber-400"
        />

        <p className="text-sm font-semibold text-bone">
          Google Maps API key is missing
        </p>

        <p className="mt-2 max-w-md text-xs text-bone/50">
          Add VITE_GOOGLE_MAPS_API_KEY to your frontend
          .env file and restart Vite.
        </p>
      </div>
    )
  }

  if (branchesWithCoordinates.length === 0) {
    return (
      <div
        className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-graphite-700 bg-graphite-900 text-sm text-bone/50"
        style={{ height }}
      >
        No service-center coordinates are available.
      </div>
    )
  }

  const firstBranch = branchesWithCoordinates[0]

  const initialCenter = {
    lat: Number(firstBranch.latitude),
    lng: Number(firstBranch.longitude),
  }

  const mapCenter = userLocation ?? initialCenter

  /*
   * Ask browser for current location.
   */
  const findMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        'Location is not supported by this browser.'
      )
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setUserLocation(location)
        setLocationLoading(false)
      },
      (error) => {
        console.error('Location error:', error)

        setLocationLoading(false)

        if (error.code === 1) {
          setLocationError(
            'Location permission was denied.'
          )
        } else if (error.code === 2) {
          setLocationError(
            'Your location could not be determined.'
          )
        } else {
          setLocationError(
            'Unable to get your location.'
          )
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-900"
      style={{ height }}
    >
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          center={mapCenter}
          defaultZoom={5}
          gestureHandling="greedy"
          fullscreenControl
          zoomControl
          streetViewControl={false}
          mapTypeControl={false}
          mapId="DEMO_MAP_ID"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {/* BayLine service centers */}

          {branchesWithCoordinates.map((branch) => (
            <BayLineMarker
              key={branch.id}
              branch={branch}
              active={activeBranchId === branch.id}
              selectable={selectable}
              onSelect={onSelect}
            />
          ))}

          {/* User location */}

          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title="Your location"
              zIndex={500}
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-500 shadow-xl">
                <div className="h-2.5 w-2.5 rounded-full bg-white" />

                <span className="absolute inset-[-7px] rounded-full border border-blue-400/60" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* My Location control */}

      <div className="absolute right-4 top-4 z-[1000]">
        <button
          type="button"
          onClick={findMyLocation}
          disabled={locationLoading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-graphite-950/90 px-4 py-3 text-sm font-semibold text-bone shadow-xl backdrop-blur-md transition hover:border-amber-400/50 hover:bg-graphite-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed
            size={17}
            className="text-amber-400"
          />

          {locationLoading
            ? 'Finding you...'
            : 'My location'}
        </button>
      </div>

      {/* Location error */}

      {locationError && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] flex items-center justify-between gap-3 rounded-xl border border-alert-500/30 bg-graphite-950/95 px-4 py-3 text-xs text-bone shadow-xl backdrop-blur-md">
          <span>{locationError}</span>

          <button
            type="button"
            onClick={() => setLocationError(null)}
            className="text-bone/50 hover:text-bone"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================================
   BAYLINE MARKER
   ========================================================= */

function BayLineMarker({
  branch,
  active,
  selectable,
  onSelect,
}: {
  branch: Branch
  active: boolean
  selectable: boolean
  onSelect?: (branch: Branch) => void
}) {
  const [infoOpen, setInfoOpen] = useState(false)

  const position = {
    lat: Number(branch.latitude),
    lng: Number(branch.longitude),
  }

  const handleMarkerClick = () => {
    setInfoOpen(true)

    onSelect?.(branch)
  }

  /*
   * Open Google Maps directions.
   *
   * We intentionally omit "origin".
   * Google Maps can use the user's current location
   * as the starting point when available.
   */
  const getDirections = () => {
    const destination = `${position.lat},${position.lng}`

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${encodeURIComponent(destination)}` +
      `&travelmode=driving`

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <>
      <AdvancedMarker
        position={position}
        title={branch.name}
        zIndex={active ? 100 : 1}
        onClick={handleMarkerClick}
      >
        <div
          className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-graphite-950 shadow-xl transition-all duration-200"
          style={{
            backgroundColor: active
              ? '#F2A93B'
              : '#E8961F',

            transform: active
              ? 'scale(1.18)'
              : 'scale(1)',
          }}
        >
          <MapPin
            size={21}
            strokeWidth={2.5}
            className="text-graphite-950"
          />

          <span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-graphite-950"
            style={{
              backgroundColor: active
                ? '#5FA3A3'
                : '#F2A93B',
            }}
          />
        </div>
      </AdvancedMarker>

      {infoOpen && (
        <InfoWindow
          position={position}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="min-w-[260px] font-body text-graphite-950">

            {/* Header */}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold leading-tight">
                  {branch.name}
                </h3>

                <p className="mt-1 text-xs font-medium text-graphite-700">
                  {branch.city}, {branch.state}
                </p>
              </div>

              {active && (
                <Check
                  size={17}
                  className="shrink-0 text-emerald-600"
                />
              )}
            </div>

            {/* Address */}

            <div className="mt-3 flex items-start gap-2 text-xs text-graphite-700">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0"
              />

              <span>{branch.address}</span>
            </div>

            {/* Phone */}

            {branch.phone && (
              <div className="mt-2 flex items-center gap-2 text-xs text-graphite-700">
                <Phone size={14} />

                <span>{branch.phone}</span>
              </div>
            )}

            {/* Hours */}

            {(branch.opens_at || branch.closes_at) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-graphite-700">
                <Clock size={14} />

                <span>
                  {branch.opens_at
                    ? branch.opens_at.slice(0, 5)
                    : '--:--'}

                  {' – '}

                  {branch.closes_at
                    ? branch.closes_at.slice(0, 5)
                    : '--:--'}
                </span>
              </div>
            )}

            {/* Actions */}

            <div className="mt-4 grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={getDirections}
                className="flex items-center justify-center gap-2 rounded-lg bg-graphite-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-graphite-800"
              >
                <Navigation size={14} />

                Directions
              </button>

              {selectable && onSelect ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(branch)
                    setInfoOpen(false)
                  }}
                  className="rounded-lg border border-graphite-700 bg-white px-3 py-2.5 text-xs font-semibold text-graphite-950 transition hover:bg-graphite-100"
                >
                  {active
                    ? 'Selected ✓'
                    : 'Select center'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="rounded-lg border border-graphite-700 bg-white px-3 py-2.5 text-xs font-semibold text-graphite-950 transition hover:bg-graphite-100"
                >
                  Close
                </button>
              )}

            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}