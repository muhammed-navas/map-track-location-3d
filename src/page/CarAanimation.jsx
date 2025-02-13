import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as YUKA from 'yuka';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const AutoCar = () => {
  const mountRef = useRef(null);
  const vehicleRef = useRef(null);
  const [startPoint, setStartPoint] = useState('1');
  const [endPoint, setEndPoint] = useState('2');
  const [pointPositions, setPointPositions] = useState({});
  
  // Define the fixed points
  const points = {
    '1': new YUKA.Vector3(-10, 0, -10),
    '2': new YUKA.Vector3(10, 0, -10),
    '3': new YUKA.Vector3(10, 0, 10),
    '4': new YUKA.Vector3(-10, 0, 10),
  };

  useEffect(() => {
    let vehicle, entityManager, scene, camera, renderer;

    const containerWidth = mountRef.current.clientWidth;
    const containerHeight = mountRef.current.clientHeight;

    // Initialize Three.js renderer, scene, and camera
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    mountRef.current.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    renderer.setClearColor(0xA3A3A3);

    camera = new THREE.PerspectiveCamera(
      45,
      containerWidth / containerHeight,
      0.1,
      1000
    );
    // Modified camera position for side view
    camera.position.set(40, 10, 0); // Moved camera to the right side
    camera.lookAt(0, 0, 0); // Looking at the center of the scene

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xC0C0C0, // Changed to gray color
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create vehicle
    vehicle = new YUKA.Vehicle();
    vehicleRef.current = vehicle;
    
    function sync(entity, renderComponent) {
      renderComponent.matrix.copy(entity.worldMatrix);
    }

    entityManager = new YUKA.EntityManager();
    entityManager.add(vehicle);

    // Load 3D model
    const loader = new GLTFLoader();
    loader.load('/SUV.glb', (glb) => {
      const model = glb.scene;
      
      scene.add(model);
      model.matrixAutoUpdate = false;
      vehicle.scale = new YUKA.Vector3(1.0, 1.0,1.0);
      vehicle.setRenderComponent(model, sync);
      
      // Set initial position to point 1
      vehicle.position.copy(points['1']);
    });

    // Create visual markers for points
    const newPointPositions = {};
    Object.entries(points).forEach(([key, point]) => {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(point.x, point.y, point.z);
      scene.add(sphere);

      // Store the 2D coordinates for the HTML labels
      const vector = new THREE.Vector3(point.x, point.y + 2, point.z);
      vector.project(camera);
      
      const x = (vector.x * 0.5 + 0.5) * containerWidth;
      const y = (-vector.y * 0.5 + 0.5) * containerHeight;
      
      newPointPositions[key] = { x, y };
    });
    setPointPositions(newPointPositions);

    // Time management
    const time = new YUKA.Time();

    // Animation
    function animate() {
      const delta = time.update().getDelta();
      entityManager.update(delta);
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    // Handle window resizing
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);

      // Update point label positions
      Object.entries(points).forEach(([key, point]) => {
        const vector = new THREE.Vector3(point.x, point.y + 2, point.z);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * newWidth;
        const y = (-vector.y * 0.5 + 0.5) * newHeight;
        
        setPointPositions(prev => ({
          ...prev,
          [key]: { x, y }
        }));
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const handleMove = () => {
    if (!vehicleRef.current) return;

    const start = points[startPoint];
    const end = points[endPoint];
    
    // Create a new path between selected points
    const path = new YUKA.Path();
    path.add(start);
    path.add(end);
    
    // Reset vehicle position to start
    vehicleRef.current.position.copy(start);
    
    // Clear existing behaviors
    vehicleRef.current.steering.clear();
    
    // Add new path following behavior
    const followPathBehavior = new YUKA.FollowPathBehavior(path, 3);
    vehicleRef.current.steering.add(followPathBehavior);
    
    // Set vehicle properties
    vehicleRef.current.maxSpeed = 5;
  };

  return (
    <div className="flex w-full h-screen bg-gray-100">
      {/* Left Side - Control Panel */}
      <div className="w-1/4 h-full bg-white p-6 shadow-lg">
        <div className="h-full flex flex-col">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Car Controls</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Point</label>
              <select 
                className="w-full p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              >
                {Object.keys(points).map(point => (
                  <option key={point} value={point}>Point {point}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Point</label>
              <select 
                className="w-full p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              >
                {Object.keys(points).map(point => (
                  <option key={point} value={point}>Point {point}</option>
                ))}
              </select>
            </div>
            <button
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors"
              onClick={handleMove}
            >
              Move Car
            </button>
          </div>
          <div className="mt-auto">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Select a starting point</li>
                <li>Select an end point</li>
                <li>Click "Move Car" to start animation</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - 3D Animation */}
      <div className="w-3/4 h-full relative">
        <div ref={mountRef} className="w-full h-full" />
        {/* Point Labels */}
        {Object.entries(pointPositions).map(([key, position]) => (
          <div
            key={key}
            className="absolute z-10 bg-white px-2 py-1 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: ${position.x}px,
              top: ${position.y}px,
            }}
          >
            Point {key}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoCar;