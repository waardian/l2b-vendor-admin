"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Roughly the geographic centre of India — where the map opens when a vendor
 *  has no pin yet and nothing better is known. */
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 };
const PINNED_ZOOM = 16;
const UNPINNED_ZOOM = 5;

export interface LatLng {
  lat: number;
  lng: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type GMaps = any;

interface MapsLibraries {
  Map: new (container: HTMLElement, options: GMaps) => GMaps;
  Geocoder: new () => GMaps;
}

declare global {
  interface Window {
    google?: { maps?: { Map?: GMaps; Geocoder?: GMaps } };
  }
}

let mapsLibrariesPromise: Promise<MapsLibraries> | null = null;

const MAPS_READY_CALLBACK = "__l2bGoogleMapsReady";

/** The Maps namespace, loaded once for the whole console.
 *
 *  Resolved from the `callback` parameter rather than the script tag's `onload`.
 *  What that tag fetches is only a bootstrap — it fetches `main.js`, which is
 *  what actually defines `Map`, `Geocoder` and `importLibrary`. `onload` fires
 *  before that second fetch lands, so touching `google.maps.Map` there is what
 *  produced "maps.Map is not a constructor". The callback is the API's own
 *  signal that the namespace and every requested library are ready.
 *
 *  Cached as one promise because the API throws if its script is included twice,
 *  and cleared on failure so a later mount can retry rather than inheriting a
 *  rejection forever. */
function loadMapsLibraries(): Promise<MapsLibraries> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is browser-only"));
  }
  if (mapsLibrariesPromise) return mapsLibrariesPromise;

  mapsLibrariesPromise = new Promise<MapsLibraries>((resolve, reject) => {
    const fail = (message: string) => {
      mapsLibrariesPromise = null;
      reject(new Error(message));
    };

    if (!MAPS_API_KEY) {
      fail("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
      return;
    }

    const settle = () => {
      const namespace = window.google?.maps;
      if (namespace?.Map && namespace?.Geocoder) {
        resolve({ Map: namespace.Map, Geocoder: namespace.Geocoder });
      } else {
        fail("Google Maps loaded without the maps library");
      }
    };

    // A hot reload can leave the API already resident; re-injecting would throw.
    if (window.google?.maps?.Map) {
      settle();
      return;
    }

    (window as unknown as Record<string, unknown>)[MAPS_READY_CALLBACK] = () => {
      delete (window as unknown as Record<string, unknown>)[MAPS_READY_CALLBACK];
      settle();
    };

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}` +
      `&libraries=geocoding&loading=async&callback=${MAPS_READY_CALLBACK}`;
    script.async = true;
    script.onerror = () => fail("Google Maps failed to load");
    document.head.appendChild(script);
  });

  return mapsLibrariesPromise;
}

export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export default function WarehouseMapPicker({
  value,
  onChange,
  onAddressResolved,
  disabled = false,
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  onAddressResolved?: (address: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GMaps>(null);
  const geocoderRef = useRef<GMaps>(null);
  // The map recentres itself as the user pans, which would fight the `value`
  // prop echoing straight back in. This marks centre changes we caused so the
  // sync effect can ignore them.
  const selfMoveRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  const reverseGeocode = useCallback(
    (point: LatLng) => {
      if (!geocoderRef.current || !onAddressResolved) return;
      geocoderRef.current.geocode({ location: point }, (results: GMaps, gStatus: string) => {
        if (gStatus === "OK" && results?.[0]) onAddressResolved(results[0].formatted_address);
      });
    },
    [onAddressResolved]
  );

  useEffect(() => {
    let cancelled = false;

    loadMapsLibraries()
      .then(({ Map, Geocoder }) => {
        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          center: value ?? FALLBACK_CENTER,
          zoom: value ? PINNED_ZOOM : UNPINNED_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });

        mapRef.current = map;
        geocoderRef.current = new Geocoder();

        // The pin is a fixed overlay at the centre of the viewport rather than a
        // marker object: dragging the map *is* moving the pin, which is the
        // gesture people already know from every ride-hailing app, and it keeps
        // the selected point and what is under the crosshair impossible to
        // disagree about.
        map.addListener("idle", () => {
          const center = map.getCenter();
          if (!center) return;
          selfMoveRef.current = true;
          onChange({ lat: center.lat(), lng: center.lng() });
        });

        map.addListener("click", (event: GMaps) => {
          if (!event.latLng) return;
          map.panTo(event.latLng);
        });

        setStatus("ready");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setErrorMessage(error.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // Mount-only: `value` is read for the initial camera and thereafter synced by
    // the effect below, and re-running this would rebuild the map on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !value) return;
    if (selfMoveRef.current) {
      selfMoveRef.current = false;
      return;
    }
    mapRef.current.setCenter(value);
    if (mapRef.current.getZoom() < PINNED_ZOOM) mapRef.current.setZoom(PINNED_ZOOM);
  }, [value, status]);

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (!query || !geocoderRef.current || !mapRef.current) return;

    setSearching(true);
    geocoderRef.current.geocode({ address: query }, (results: GMaps, gStatus: string) => {
      setSearching(false);
      if (gStatus !== "OK" || !results?.[0]) {
        setErrorMessage(`No place matched “${query}”.`);
        return;
      }
      setErrorMessage(null);
      const location = results[0].geometry.location;
      mapRef.current.setCenter(location);
      mapRef.current.setZoom(PINNED_ZOOM);
      onAddressResolved?.(results[0].formatted_address);
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        mapRef.current.setCenter(point);
        mapRef.current.setZoom(PINNED_ZOOM);
        reverseGeocode(point);
      },
      () => setErrorMessage("Your browser would not share a location.")
    );
  };

  if (status === "error") {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <span className="rounded-full bg-amber-50 p-3 text-amber-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </span>
        <p className="text-sm font-bold text-slate-900">Map unavailable</p>
        <p className="max-w-sm text-xs font-medium text-slate-500">
          {errorMessage ?? "Google Maps could not be loaded."} You can still set the pin by typing
          coordinates below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={runSearch} className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search an address, locality or landmark…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-24 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={disabled || searching || !search.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-amber-400 transition-colors hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-amber-400 hover:text-amber-600 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2m0 16v2m10-10h-2M4 12H2" />
          </svg>
          My location
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
        <div ref={containerRef} className="h-[420px] w-full bg-slate-100" />

        {/* The crosshair sits dead centre and never moves — the map slides beneath it. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="-translate-y-4">
            <svg className="h-10 w-10 drop-shadow-lg" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22s7-6.03 7-11a7 7 0 10-14 0c0 4.97 7 11 7 11z"
                fill="#f59e0b"
                stroke="#78350f"
                strokeWidth="1.4"
              />
              <circle cx="12" cy="11" r="2.6" fill="#78350f" />
            </svg>
          </div>
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <span className="text-[11px] font-bold text-slate-500">Loading map…</span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-amber-400 shadow-lg">
          {value ? `${formatCoordinate(value.lat)}, ${formatCoordinate(value.lng)}` : "Drag to place the pin"}
        </div>
      </div>

      {errorMessage && status === "ready" && (
        <p className="text-[11px] font-semibold text-rose-600">{errorMessage}</p>
      )}
    </div>
  );
}
