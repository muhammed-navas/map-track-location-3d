
import { useRef, forwardRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MapOverlay = forwardRef(({ route, onAnimationComplete }, ref) => {
  const vehicleRef = useRef();
  const pathRef = useRef();
  const progressRef = useRef(0);
  const curveRef = useRef();

  // Load the vehicle model
  const { scene: vehicleModel } = useGLTF(
    "https://huggingface.co/spaces/rajkumar1611/01-3DModel-GradioDemo/resolve/33428b234bf914ac88ec47c61d502464ebda3e7b/files/Duck.glb"
  );

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      if (!route?.points?.length) return;

      // Create smooth curve through all route points
      const curvePoints = route.points.map(
        (point) => new THREE.Vector3(point.x, point.y + 0.5, point.z)
      );

      curveRef.current = new THREE.CatmullRomCurve3(curvePoints);

      // Reset animation
      progressRef.current = 0;

      // Update path geometry
      const points = curveRef.current.getPoints(100);
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
      {/* Animated path line */}
      <line ref={pathRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#4285f4" linewidth={3} />
      </line>

      {/* Vehicle */}
      <primitive ref={vehicleRef} object={vehicleModel} scale={0.2} />
    </group>
  );
});

export default MapOverlay;
