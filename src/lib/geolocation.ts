export interface GeoFix {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
}

/**
 * Reads the browser's real GPS/network fix.
 *
 * Rejects with a message meant for the user. The secure-context check matters:
 * `navigator.geolocation` exists on plain http:// pages served from a LAN IP, but
 * every call fails there, which otherwise looks like the button doing nothing.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    if (!window.isSecureContext) {
      reject(
        new Error(
          "Location needs a secure page. Open this app over https, or on localhost, and try again."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
        });
      },
      (error) => reject(new Error(geolocationMessage(error))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options }
    );
  });
}

function geolocationMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was blocked. Allow it for this site in your browser's address bar, then try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your device could not get a location fix. Check that location services are on.";
    case error.TIMEOUT:
      return "Timed out waiting for a location fix. Try again, ideally near a window.";
    default:
      return error.message || "Unable to retrieve your location.";
  }
}
