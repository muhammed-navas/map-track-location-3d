
import { useRef, forwardRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const Scene = forwardRef(({ route, onAnimationComplete }, ref) => {
  const vehicleRef = useRef();
  const pathRef = useRef();
  const progressRef = useRef(0);
  const curveRef = useRef();

  // Load the vehicle model
  const { scene: vehicleModel } = useGLTF("/assets/3d/duck.glb");

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      if (!route) return;

      // Convert geo coordinates to scene coordinates (simplified)
      const startPos = latLngToVector3(route.start);
      const endPos = latLngToVector3(route.end);

      // Create curve for smooth animation
      curveRef.current = new THREE.CubicBezierCurve3(
        startPos,
        new THREE.Vector3(startPos.x, startPos.y + 2, startPos.z + 2),
        new THREE.Vector3(endPos.x, endPos.y + 2, endPos.z - 2),
        endPos
      );

      // Reset animation
      progressRef.current = 0;

      // Update path geometry
      const points = curveRef.current.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      pathRef.current.geometry = geometry;
    },
  }));

  useFrame((state, delta) => {
    if (!curveRef.current || !route || progressRef.current >= 1) return;

    // Update progress
    progressRef.current += delta * 0.2; // Adjust speed here

    // Get current point on curve
    const point = curveRef.current.getPoint(progressRef.current);

    // Update vehicle position
    if (vehicleRef.current) {
      vehicleRef.current.position.copy(point);

      // Calculate and set rotation to face movement direction
      if (progressRef.current < 1) {
        const tangent = curveRef.current.getTangent(progressRef.current);
        const rotation = new THREE.Euler(
          0,
          Math.atan2(tangent.x, tangent.z),
          0
        );
        vehicleRef.current.rotation.copy(rotation);
      }
    }

    // Animation complete
    if (progressRef.current >= 1) {
      onAnimationComplete();
    }
  });

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#88ccff" />
      </mesh>

      {/* Path line */}
      <line ref={pathRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </line>

      {/* Vehicle */}
      <primitive
        ref={vehicleRef}
        object={vehicleModel}
        scale={0.5}
        castShadow
      />
    </group>
  );
});

// Helper function to convert lat/lng to 3D coordinates (simplified)
function latLngToVector3(coords) {
  const scale = 10; // Adjust scale as needed
  return new THREE.Vector3(
    (coords.lng / 180) * scale,
    0,
    (coords.lat / 90) * scale
  );
}

export default Scene;




















