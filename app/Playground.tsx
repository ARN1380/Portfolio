import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Mesh, Vector3 } from "three";
import CustomObj from "./CustomObj";
import curvePath from "@/public/models/testCurve2.json";

export default function Playground() {
  const cubeRef = useRef<Mesh>(undefined);
  const cameraRef = useRef(0);

  const curve = useMemo(() => {
    const points = curvePath.points.map((p) => new Vector3(p.x, p.y, p.z));
    return new CatmullRomCurve3(points, false);
  }, []);

  console.log(curve);

  useFrame((state, delta) => {
    if (curve) {
      if (cameraRef.current >= 1) cameraRef.current = 0;

      cameraRef.current = Math.min(cameraRef.current + delta * 0.1, 1);
      state.camera.position.copy(curve.getPointAt(cameraRef.current));

      state.camera.lookAt(new Vector3(0, 0, 0));
    }

    if (cubeRef.current) {
      cubeRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      <OrbitControls />
      <axesHelper />
      <ambientLight intensity={0.5} />
      <directionalLight position={[-5, 5, -4]} intensity={1.5} />
      <CustomObj />
      <mesh position={[-2, 0, 0]} scale={1.5} ref={cubeRef}>
        <boxGeometry />
        <meshStandardMaterial color={"mediumpurple"} />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <sphereGeometry />
        <meshStandardMaterial color={"orange"} />
      </mesh>
      <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, -1, 0]} scale={10}>
        <planeGeometry />
        <meshStandardMaterial color={"greenyellow"} />
      </mesh>
    </>
  );
}
