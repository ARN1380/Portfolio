import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
  useScroll,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import mountainPath from "@/public/models/cameraPath-custom2.json";
import lookAtPath from "@/public/models/lookAtPath-custom2.json";
import { useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  MathUtils,
  PerspectiveCamera as PerspectiveCameraType,
  Vector3,
} from "three";

export default function Mountain() {
  const { scene } = useGLTF("/models/test10.glb");
  const scroll = useScroll();
  const elapsedTime = useRef(0);
  const cameraRef = useRef<PerspectiveCameraType>(null);

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

  const step1 = new Vector3(
    -7.8,
    10.558431969406817,
    10.9
  );

  const cameraLookAt = new Vector3(0,0,0)

  useFrame((state, delta) => {
    camCurve.getPoint(scroll.offset, state.camera.position)
    pathCurve.getPoint(scroll.offset, cameraLookAt)
    state.camera.lookAt(cameraLookAt)


    // elapsedTime.current = Math.min(0.47, scroll.offset);
    // // console.log(elapsedTime.current);
    // // console.log(state.camera.position);

    // if (curve) {
    //   state.camera.position.copy(curve.getPointAt(elapsedTime.current));
      
    //     const lookAtStep1 = new Vector3(
    //       MathUtils.damp(state.camera.position.x, step1.x, 5, delta),
    //       MathUtils.damp(state.camera.position.y, step1.y, 5, delta),
    //       MathUtils.damp(state.camera.position.z, step1.z, 5, delta)
    //     );
    //     state.camera.lookAt(lookAtStep1);      
    // }

  });

  return (
    <>
      {/* <OrbitControls /> */}
      <PerspectiveCamera
        position={[10, 10, 10]}
        makeDefault
        fov={80}
        ref={cameraRef}
      />
      <primitive object={scene} scale={1} />

      <axesHelper scale={500}/>
      <Environment files="/HDRI/passendorf_snow_1k.exr" background={true} />
    </>
  );
}
