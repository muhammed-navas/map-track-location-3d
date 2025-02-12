import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const AnimatorMap = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const [map, setMap] = useState(null);
  const animationFrameRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 28.6139, lng: 77.209 }, // Default center (Delhi)
        mapTypeId: "terrain",
        tilt: 45,
        heading: 0,
        mapId: "90f87356969d889c",
      });

      setMap(mapInstance);

      // Initialize autocomplete for start and end locations
      const startAutocomplete = new google.maps.places.Autocomplete(
        startInputRef.current,
        {
          fields: ["geometry", "name"],
        }
      );
      const endAutocomplete = new google.maps.places.Autocomplete(
        endInputRef.current,
        {
          fields: ["geometry", "name"],
        }
      );

      startAutocomplete.addListener("place_changed", () => {
        const place = startAutocomplete.getPlace();
        if (place.geometry) {
          setStartLocation(place.geometry.location);
        }
      });

      endAutocomplete.addListener("place_changed", () => {
        const place = endAutocomplete.getPlace();
        if (place.geometry) {
          setEndLocation(place.geometry.location);
        }
      });
    };

    initMap();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const initializeRouteServices = (google, mapInstance, start, end) => {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true,
      preserveViewport: true,
    });

    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
        const path = result.routes[0].overview_path;
        const points = path.map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        }));
        setRoutePoints(points);
        initializeMarker(google, mapInstance, points[0]);
        initializePolyline(google, mapInstance);
      }
    });
  };

  const initializeMarker = (google, mapInstance, position) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new google.maps.Marker({
      position: position,
      map: mapInstance,
      icon: {
        url: "https://storage.googleapis.com/indian-truck-drivers-image/scooter_right.png",
        scaledSize: new google.maps.Size(50, 50), // Adjust size as needed
        anchor: new google.maps.Point(25, 25), // Center of the image
      },
    });
  };

  const initializePolyline = (google, mapInstance) => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      map: mapInstance,
      strokeColor: "#4285F4",
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });
  };

  const animateRoute = () => {
    if (!map || !routePoints.length || isAnimating) return;

    setIsAnimating(true);
    let currentIndex = 0;
    const numPoints = routePoints.length;
    const duration = 10000; // 10 seconds for full animation
    const google = window.google;

    const animate = (timestamp) => {
      if (!animationFrameRef.current) {
        animationFrameRef.current = timestamp;
      }

      const progress = (timestamp - animationFrameRef.current) / duration;
      const pointIndex = Math.min(
        Math.floor(progress * numPoints),
        numPoints - 1
      );

      if (pointIndex !== currentIndex) {
        const currentPoint = routePoints[pointIndex];
        const nextPoint = routePoints[Math.min(pointIndex + 1, numPoints - 1)];

        // Interpolate between points for smoother animation
        const interpolate = (start, end, factor) => {
          return start + (end - start) * factor;
        };

        const factor = (progress * numPoints) % 1;
        const interpolatedLat = interpolate(
          currentPoint.lat,
          nextPoint.lat,
          factor
        );
        const interpolatedLng = interpolate(
          currentPoint.lng,
          nextPoint.lng,
          factor
        );

        // Update marker position
        const position = new google.maps.LatLng(
          interpolatedLat,
          interpolatedLng
        );
        markerRef.current.setPosition(position);

        // Update polyline path
        const path = polylineRef.current.getPath();
        path.push(position);
        polylineRef.current.setPath(path);

        // Calculate heading for marker rotation
        const heading = google.maps.geometry.spherical.computeHeading(
          position,
          new google.maps.LatLng(nextPoint.lat, nextPoint.lng)
        );

        // Update marker rotation
        markerRef.current.setIcon({
          ...markerRef.current.getIcon(),
          rotation: heading,
        });

        // Smooth camera follow with zoom-in and zoom-out
        const zoomLevel = progress < 0.1 || progress > 0.9 ? 15 : 17; // Zoom out at start and end
        const cameraPosition = google.maps.geometry.spherical.computeOffset(
          position,
          200, // Follow distance
          heading - 180 // Camera angle
        );

        map.moveCamera({
          center: cameraPosition,
          zoom: zoomLevel,
          tilt: 45,
          heading: heading,
        });

        currentIndex = pointIndex;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleStartAnimation = () => {
    if (!startLocation || !endLocation) {
      alert("Please select both start and end locations.");
      return;
    }

    const google = window.google;
    initializeRouteServices(google, map, startLocation, endLocation);
    polylineRef.current.setPath([]); // Clear previous polyline path
    animateRoute();
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold mb-4">3D Route Animation</h1>
        <div className="flex gap-4 mb-4">
          <input
            ref={startInputRef}
            type="text"
            placeholder="Enter start location"
            className="flex-1 p-2 border rounded-lg"
          />
          <input
            ref={endInputRef}
            type="text"
            placeholder="Enter end location"
            className="flex-1 p-2 border rounded-lg"
          />
        </div>
        <button
          onClick={handleStartAnimation}
          disabled={isAnimating}
          className={`px-4 py-2 rounded-lg ${
            isAnimating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isAnimating ? "Animating..." : "Start Animation"}
        </button>
      </div>
      <div ref={mapRef} className="flex-1 w-full" />
    </div>
  );
};

export default AnimatorMap;
