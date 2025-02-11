import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const AnimatorMap = () => {
  const mapRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const polylineRef = useRef(null);
  const animationRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw", // Replace with your API key
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 14,
        center: { lat: 28.606649, lng: 77.234826 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        tilt: 45,
        heading: 0,
      });

      setMap(mapInstance);

      const defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(28.0, 76.0),
        new google.maps.LatLng(29.0, 78.0)
      );

      const startAutocomplete = new google.maps.places.Autocomplete(
        startInputRef.current,
        {
          bounds: defaultBounds,
          componentRestrictions: { country: "IN" },
          fields: ["geometry", "name"],
        }
      );

      const endAutocomplete = new google.maps.places.Autocomplete(
        endInputRef.current,
        {
          bounds: defaultBounds,
          componentRestrictions: { country: "IN" },
          fields: ["geometry", "name"],
        }
      );

      initThreeScene();
    };

    initMap();
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const initThreeScene = () => {
    sceneRef.current = new THREE.Scene();

    cameraRef.current = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current.position.set(0, 10, 20);
    cameraRef.current.lookAt(0, 0, 0);

    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setClearColor(0x000000, 0);
    mapRef.current.appendChild(rendererRef.current.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 15, 5);
    directionalLight.castShadow = true;
    sceneRef.current.add(directionalLight);

    const loader = new GLTFLoader();
    loader.load(
      "https://threejs.org/examples/models/gltf/Duck/glTF/Duck.gltf",
      (gltf) => {
        modelRef.current = gltf.scene;
        modelRef.current.scale.set(0.5, 0.5, 0.5);
        modelRef.current.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        sceneRef.current.add(modelRef.current);
      },
      undefined,
      (error) => {
        console.error("Error loading 3D model:", error);
      }
    );

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  const animate = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const updateBikePosition = (position, heading, tilt) => {
    if (modelRef.current) {
      const worldPosition = latLngToWorld(position);
      modelRef.current.position.set(
        worldPosition.x,
        worldPosition.y,
        worldPosition.z
      );

      modelRef.current.rotation.y = THREE.MathUtils.degToRad(heading);
      modelRef.current.rotation.z = THREE.MathUtils.degToRad(tilt);

      cameraRef.current.position.set(
        worldPosition.x,
        worldPosition.y + 5,
        worldPosition.z + 10
      );
      cameraRef.current.lookAt(
        worldPosition.x,
        worldPosition.y,
        worldPosition.z
      );
    }
  };

  const latLngToWorld = (latLng) => {
    const projection = map.getProjection();
    const point = projection.fromLatLngToPoint(latLng);
    return {
      x: point.x * 100 - 50,
      y: 0,
      z: point.y * 100 - 50,
    };
  };

  const calculateCurvature = (p1, p2, p3) => {
    const a = Math.sqrt(
      Math.pow(p2.lat() - p1.lat(), 2) + Math.pow(p2.lng() - p1.lng(), 2)
    );
    const b = Math.sqrt(
      Math.pow(p3.lat() - p2.lat(), 2) + Math.pow(p3.lng() - p2.lng(), 2)
    );
    const c = Math.sqrt(
      Math.pow(p3.lat() - p1.lat(), 2) + Math.pow(p3.lng() - p1.lng(), 2)
    );

    const radius =
      (a * b * c) /
      Math.sqrt((a + b + c) * (-a + b + c) * (a - b + c) * (a + b - c));
    return Math.min(Math.max(-45, radius * 0.1), 45);
  };

  const getIntermediatePoints = (start, end, numPoints) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const lat = start.lat() + (end.lat() - start.lat()) * fraction;
      const lng = start.lng() + (end.lng() - start.lng()) * fraction;
      points.push(new google.maps.LatLng(lat, lng));
    }
    return points;
  };

  const animateMarkerAndLine = (path, startFromStep = 0) => {
    if (!map) return;

    setIsAnimating(true);

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: "#4285F4",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map,
      });
    }

    let step = startFromStep;
    const numSteps = path.length;
    const speed = 80;
    const animatedPath = path.slice(0, startFromStep);

    const moveMarker = () => {
      if (step < numSteps - 1) {
        animatedPath.push(path[step]);

        const nextPoint = path[step + 1];
        const heading = google.maps.geometry.spherical.computeHeading(
          path[step],
          nextPoint
        );

        const tilt =
          step < numSteps - 2
            ? calculateCurvature(path[step], nextPoint, path[step + 2])
            : 0;

        updateBikePosition(nextPoint, heading, tilt);

        const interpolatedPoints = getIntermediatePoints(
          path[step],
          nextPoint,
          5
        );

        polylineRef.current.setPath(animatedPath.concat(interpolatedPoints));

        map.panTo(nextPoint);
        map.setHeading(heading);

        step++;
        animationRef.current = setTimeout(moveMarker, speed);
      } else {
        setIsAnimating(false);
      }
    };

    updateBikePosition(path[startFromStep], 0, 0);
    moveMarker();
  };

  const handleAnimateClick = async () => {
    if (isAnimating) {
      clearTimeout(animationRef.current);
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
      setCurrentPath(path);
      animateMarkerAndLine(path, 0);
    } catch (error) {
      console.error("Error fetching directions:", error);
      alert("Could not calculate route. Please try different locations.");
    }
  };

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-3">
      <h1 className="text-2xl font-bold mb-4">3D Bike Route Animation</h1>
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
            {isAnimating ? "Stop Animation" : "Animate Route"}
          </button>
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
