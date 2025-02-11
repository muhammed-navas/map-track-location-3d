import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const AnimatorMap = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  const [map, setMap] = useState(null);
  const animationFrameRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: 28.6139, lng: 77.209 }, // Delhi coordinates
        mapTypeId: "terrain",
        tilt: 45,
        heading: 0,
        mapId: "90f87356969d889c",
      });

      setMap(mapInstance);
      initializeRouteServices(google, mapInstance);
    };

    initMap();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const initializeRouteServices = (google, mapInstance) => {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: "#4285F4",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    // Example route - Replace with your desired coordinates
    const start = { lat: 28.6139, lng: 77.209 }; // Delhi
    const end = { lat: 28.7041, lng: 77.1025 }; // New Delhi

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
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#FFFFFF",
        rotation: 0,
      },
    });
  };

  const animateRoute = () => {
    if (!map || !routePoints.length || isAnimating) return;

    setIsAnimating(true);
    let currentIndex = 0;
    const numPoints = routePoints.length;
    const duration = 10000; // 5 seconds for full animation
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

        // Update marker position
        const position = new google.maps.LatLng(
          currentPoint.lat,
          currentPoint.lng
        );
        markerRef.current.setPosition(position);

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

        // Smooth camera follow
        const cameraPosition = google.maps.geometry.spherical.computeOffset(
          position,
          200, // Follow distance
          heading - 180 // Camera angle
        );

        map.moveCamera({
          center: cameraPosition,
          zoom: 17,
          tilt: 45,
          heading: heading,
        });

        currentIndex = pointIndex;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold mb-4">3D Route Animation</h1>
        <button
          onClick={animateRoute}
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
