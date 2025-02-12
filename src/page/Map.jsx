import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const AnimatorMap = () => {
  const mapRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const polylineRef = useRef(null);
  const animationRef = useRef(null);
  const bikeMarkerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speed, setSpeed] = useState(1); // Default speed (1x)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 16,
        center: { lat: 19.076, lng: 72.8777 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
      });

      setMap(mapInstance);

      const defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(8.4, 68.7),
        new google.maps.LatLng(37.6, 97.25)
      );

      new google.maps.places.Autocomplete(startInputRef.current, {
        bounds: defaultBounds,
        componentRestrictions: { country: "IN" },
        fields: ["geometry", "name"],
      });

      new google.maps.places.Autocomplete(endInputRef.current, {
        bounds: defaultBounds,
        componentRestrictions: { country: "IN" },
        fields: ["geometry", "name"],
      });
    };

    initMap();
  }, []);

  const animateRoute = (path, google) => {
    if (!map || !path || path.length < 2) return;
    setIsAnimating(true);
    let currentIndex = 0;
    let startTime;
    const baseDuration = 200; // Base animation speed per segment
    const duration = baseDuration / speed; // Adjust duration based on speed

    // Create bike marker only when animation starts
    if (!bikeMarkerRef.current) {
      bikeMarkerRef.current = new google.maps.Marker({
        position: path[0],
        map: map,
        icon: {
          url: "https://storage.googleapis.com/indian-truck-drivers-image/scooter_right.png",
          scaledSize: new google.maps.Size(50, 50),
          anchor: new google.maps.Point(25, 25),
        },
        zIndex: 2,
      });
    } else {
      bikeMarkerRef.current.setPosition(path[0]);
      bikeMarkerRef.current.setMap(map);
    }

    // Create or clear polyline
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: "#4285F4",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map,
      });
    } else {
      polylineRef.current.setPath([]);
    }

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const fraction = Math.min(elapsed / duration, 1);

      if (currentIndex < path.length - 1) {
        const currentPoint = path[currentIndex];
        const nextPoint = path[currentIndex + 1];

        // Move smoothly along the path
        const position = new google.maps.LatLng(
          currentPoint.lat() +
            (nextPoint.lat() - currentPoint.lat()) * fraction,
          currentPoint.lng() + (nextPoint.lng() - currentPoint.lng()) * fraction
        );

        map.setCenter(position);
        bikeMarkerRef.current.setPosition(position);

        // Update polyline
        const newPath = path.slice(0, currentIndex + 1);
        newPath.push(position);
        polylineRef.current.setPath(newPath);

        if (fraction === 1) {
          currentIndex++;
          startTime = null;
        }

        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        // Zoom out when the bike reaches the end location
        map.setZoom(12); // Adjust the zoom level as needed
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleAnimateClick = async () => {
    if (isAnimating) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      return;
    }

    const startPlace = startInputRef.current.value;
    const endPlace = endInputRef.current.value;
    if (!startPlace || !endPlace) {
      alert("Please enter both start and end locations");
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    try {
      const result = await directionsService.route({
        origin: startPlace,
        destination: endPlace,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const path = result.routes[0].overview_path;
      map.setCenter(path[0]);
      animateRoute(path, google);
    } catch (error) {
      console.error("Error fetching directions:", error);
      alert("Could not calculate route. Please try different locations.");
    }
  };

  const handleSpeedChange = (event) => {
    setSpeed(parseFloat(event.target.value)); // Update speed based on slider value
  };

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-3">
      <h1 className="text-2xl font-bold mb-4">Bike Route Navigation</h1>
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
            onClick={handleAnimateClick}
            className={`p-2 ${
              isAnimating
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white rounded transition-colors`}
          >
            {isAnimating ? "Stop Navigation" : "Start Navigation"}
          </button>
        </div>
        <div className="mb-4">
          <label
            htmlFor="speed"
            className="block text-sm font-medium text-gray-700"
          >
            Animation Speed: {speed}x
          </label>
          <input
            type="range"
            id="speed"
            name="speed"
            min="0.5"
            max="5"
            step="0.5"
            value={speed}
            onChange={handleSpeedChange}
            className="w-full"
          />
        </div>
        <div
          ref={mapRef}
          className="w-full h-[600px] rounded-lg overflow-hidden relative"
        />
      </div>
    </div>
  );
};

export default AnimatorMap;
