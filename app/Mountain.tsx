import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Preload,
  useGLTF,
  useScroll,
  useTexture,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import mountainPath from "@/public/models/cameraPath-custom2.json";
import lookAtPath from "@/public/models/lookAtPath-custom2.json";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  MathUtils,
  PerspectiveCamera as PerspectiveCameraType,
  Vector3,
} from "three";
import { Perf } from "r3f-perf";

export default function Mountain() {
  const { scene } = useGLTF("/models/test32.glb");
  const scroll = useScroll();
  const cameraRef = useRef<PerspectiveCameraType>(null);

  // const texture = useTexture()

  const camCurve = useMemo(() => {
    const points = mountainPath.points.map(
      (point) => new Vector3(point.x, point.y, point.z)
    );
    return new CatmullRomCurve3(points, false);
  }, []);
  const pathCurve = useMemo(() => {
    const points = lookAtPath.points.map(
      (point) => new Vector3(point.x, point.y, point.z)
    );
    return new CatmullRomCurve3(points, false);
  }, []);

  const step1 = new Vector3(-7.8, 10.558431969406817, 10.9);

  const cameraLookAt = new Vector3(0, 0, 0);

  useFrame((state, delta) => {
    const scrollAmount = MathUtils.clamp(scroll.offset, 0, 1);
    camCurve.getPoint(scrollAmount, state.camera.position);
    pathCurve.getPoint(scrollAmount, cameraLookAt);
    state.camera.lookAt(cameraLookAt);
  });

  useEffect(() => {
    scene.traverse((object) => {
      if (object.isMesh) {
        object.material.side = 0;
      }
      if (object.name === "Mountain") {
        object.receiveShadow = true;
      }
      if (object.name === "Back001") {
        object.material.metalness = 0;
        console.log(object.material);
      }
      if (object.name === "ThreeJS") {
        object.material.color = new Color("purple");
        console.log(object.material);
      }
    });
    console.log(scene.children);
  }, [scene]);

  return (
    <>
      {/* ---------- Performance ---------- */}
      <Perf showGraph position="top-left" colorBlind />
      <Preload all />

      {/* ---------- Lights ---------- */}
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={4} castShadow />
      {/* <Environment files="/HDRI/city.exr" background={true} /> */}

      {/* ---------- Cameras ---------- */}
      <PerspectiveCamera
        position={[10, 10, 10]}
        makeDefault
        fov={60}
        ref={cameraRef}
      />

      {/* ---------- Controls ---------- */}
      {/* <OrbitControls   /> */}

      {/* ---------- Objects ---------- */}
      <primitive object={scene} scale={1} />

      {/* ---------- Helpers ---------- */}
      <axesHelper scale={50} />
    </>
  );
}
