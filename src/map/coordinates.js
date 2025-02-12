// Convert latitude/longitude to scene coordinates
export function convertLatLngToScene(lat, lng) {
  // Scale factors for visualization
  const scale = 100;
  const centerLat = 0;
  const centerLng = 0;

  // Convert to scene coordinates
  const x = (lng - centerLng) * scale;
  const z = -(lat - centerLat) * scale;

  return { x, y: 0, z };
}

// Convert scene coordinates back to lat/lng
export function convertSceneToLatLng(x, z) {
  const scale = 100;
  const centerLat = 0;
  const centerLng = 0;

  const lng = x / scale + centerLng;
  const lat = -(z / scale) + centerLat;

  return { lat, lng };
}
