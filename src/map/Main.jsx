"use client";

import { useState, useRef, useEffect } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Canvas } from "@react-three/fiber";
import UI from "./UI";
import MapOverlay from "./MapOverlay";
import { convertLatLngToScene } from "./coordinates";


function Main() {
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 28.6139, lng: 77.209 },
        zoom: 12,
        mapId: "90f87356969d889c",
        disableDefaultUI: true,
        heading: 0,
        tilt: 45,
      });

      setMap(mapInstance);
    };

    initMap();
  }, []);

  const handleRouteCalculation = async (startPlace, endPlace) => {
    if (!map || !startPlace || !endPlace) return;

    const directionsService = new window.google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: startPlace.geometry.location,
        destination: endPlace.geometry.location,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      // Extract route points
      const path = result.routes[0].overview_path;
      const points = path.map((point) => ({
        lat: point.lat(),
        lng: point.lng(),
      }));

      // Convert to scene coordinates
      const scenePoints = points.map((point) =>
        convertLatLngToScene(point.lat, point.lng)
      );

      setRoute({
        points: scenePoints,
        rawPoints: points,
      });

      // Fit map bounds
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds);

      setIsAnimating(true);
      if (overlayRef.current) {
        overlayRef.current.startAnimation();
      }
    } catch (error) {
      console.error("Route calculation failed:", error);
      alert("Could not calculate route");
    }
  };

  return (
    <div className="w-full h-screen relative">
      <UI
        map={map}
        onRouteCalculation={handleRouteCalculation}
        isAnimating={isAnimating}
      />
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none">
        <Canvas>
          <MapOverlay
            ref={overlayRef}
            route={route}
            onAnimationComplete={() => setIsAnimating(false)}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default Main;
