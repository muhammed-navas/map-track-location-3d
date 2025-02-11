import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const AnimatorMap = () => {
  const mapRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 14,
        center: { lat: 28.606649, lng: 77.234826 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      setMap(mapInstance);
      new google.maps.places.Autocomplete(startInputRef.current);
      new google.maps.places.Autocomplete(endInputRef.current);
    };

    initMap();
  }, []);

  const calculateAndAnimateRoute = () => {
    if (!map || !startInputRef.current || !endInputRef.current) return;

    const directionsService = new google.maps.DirectionsService();

    // Remove existing polyline if it exists
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    directionsService.route(
      {
        origin: startInputRef.current.value,
        destination: endInputRef.current.value,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === "OK" && response) {
          const path = response.routes[0].overview_path;
          animateMarkerAndLine(path);
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
  };

  const animateMarkerAndLine = (path) => {
    if (!map) return;

    // Create new polyline
    polylineRef.current = new google.maps.Polyline({
      path: [],
      geodesic: true,
      strokeColor: "#4285F4",
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: map,
    });

    // Create or update marker
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: path[0],
        map: map,
        icon: {
          url: "https://storage.googleapis.com/indian-truck-drivers-image/scooter_right.png",
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
      });
    } else {
      markerRef.current.setPosition(path[0]);
    }

    let step = 0;
    const numSteps = path.length;
    const speed = 80; // Milliseconds per step
    const animatedPath = [];

    const moveMarker = () => {
      if (step < numSteps - 1) {
        // Add current point to animated path
        animatedPath.push(path[step]);

        const nextPoint = path[step + 1];
        const heading = google.maps.geometry.spherical.computeHeading(
          path[step],
          nextPoint
        );

        // Smooth interpolation between points
        const interpolatedPoints = getIntermediatePoints(
          path[step],
          nextPoint,
          5 // Number of intermediate points
        );

        // Update polyline with all points so far
        polylineRef.current.setPath(animatedPath.concat(interpolatedPoints));

        // Update marker position and rotation
        markerRef.current.setPosition(nextPoint);
        markerRef.current.setIcon({
          url: "https://storage.googleapis.com/indian-truck-drivers-image/scooter_right.png",
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
          rotation: heading,
        });

        // Auto-pan map to keep marker in view
        map.panTo(nextPoint);

        step++;
        setTimeout(moveMarker, speed);
      }
    };

    moveMarker();
  };

  // Helper function to create smooth intermediate points
  const getIntermediatePoints = (p1, p2, numPoints) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      points.push({
        lat: p1.lat() + (p2.lat() - p1.lat()) * fraction,
        lng: p1.lng() + (p2.lng() - p1.lng()) * fraction,
      });
    }
    return points;
  };

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-3">
      <h1 className="text-2xl font-bold mb-4">Animated Map Route</h1>
      <div className="bg-gray-100 p-3 rounded-lg shadow-md">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            ref={startInputRef}
            type="text"
            placeholder="Enter start location"
            className="p-2 border rounded w-full"
          />
          <input
            ref={endInputRef}
            type="text"
            placeholder="Enter end location"
            className="p-2 border rounded w-full"
          />
          <button
            onClick={calculateAndAnimateRoute}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Animate Route
          </button>
        </div>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-lg overflow-hidden"
        />
      </div>
    </div>
  );
};

export default AnimatorMap;
