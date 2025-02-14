import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowRight, Car, Search } from "lucide-react";

// Replace with your actual Mapbox token
mapboxgl.accessToken =
  "pk.eyJ1IjoiYWxlbmpvc2VwaCIsImEiOiJjbTc0emVvdmMwY2VzMmtzY3RmbWg1ZTZlIn0.EHquBjE0wqvheFvHZaeKtg";

const TravelAnimation = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [77.209, 28.6139], // Default to New Delhi
        zoom: 5,
        pitch: 45, // Add 3D perspective
        bearing: 0,
      });

      map.current.on("load", () => {
        // Add 3D building layer
        map.current.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        });
      });
    }
  }, []);

  const animateRoute = async () => {
    try {
      setIsAnimating(true);

      // Get coordinates for start and end locations
      const [startCoords, endCoords] = await Promise.all([
        getCoordinates(startLocation),
        getCoordinates(endLocation),
      ]);

      // Create a route using the Mapbox Directions API
      const route = await getRoute(startCoords, endCoords);

      // Add the route line
      if (map.current.getSource("route")) {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      }

      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.geometry.coordinates,
          },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ff0000",
          "line-width": 4,
        },
      });

      // Create and animate marker
      if (!marker.current) {
        const el = document.createElement("div");
        el.className = "marker";
        el.innerHTML =
          '<div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"><Car className="text-white" size={20} /></div>';
        marker.current = new mapboxgl.Marker(el);
      }

      // Animate along the route
      let step = 0;
      const numSteps = route.geometry.coordinates.length;

      function animate() {
        if (step >= numSteps) {
          setIsAnimating(false);
          return;
        }

        const currentPoint = route.geometry.coordinates[step];
        marker.current.setLngLat(currentPoint).addTo(map.current);

        // Update camera
        map.current.easeTo({
          center: currentPoint,
          zoom: 12,
          bearing: step % 2 === 0 ? 0 : 20, // Add some bearing variation
          pitch: 50,
          duration: 1000,
        });

        step++;
        requestAnimationFrame(animate);
      }

      animate();
    } catch (error) {
      console.error("Animation error:", error);
      setIsAnimating(false);
    }
  };

  const getCoordinates = async (location) => {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        location
      )}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    return data.features[0].center;
  };

  const getRoute = async (start, end) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    return data.routes[0];
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="p-4 bg-white shadow-lg z-10">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Start Location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <ArrowRight className="text-gray-400" />
          <input
            type="text"
            placeholder="End Location"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={animateRoute}
            disabled={isAnimating || !startLocation || !endLocation}
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 disabled:bg-gray-300"
          >
            <Search size={16} />
            {isAnimating ? "Animating..." : "Search"}
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="flex-1" />
    </div>
  );
};

export default TravelAnimation;
