// @ts-nocheck

import {
  PerspectiveCamera,
  Preload,
  useAnimations,
  useGLTF,
  useScroll,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import mountainPath from "@/public/models/cameraPath.json";
import lookAtPath from "@/public/models/lookatPath.json";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CatmullRomCurve3,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  PerspectiveCamera as PerspectiveCameraType,
  Vector3,
} from "three";

const alwaysOnAnimations = ["WindSockAction"];

const proximityAnimations = [
  "cssLogo",
  "htmlLogo",
  "jsLogo",
  "LaptopAction",
  "MBP13.001_MBP13_0Action",
  "myIphoneAction",
  "myIpadAction",
];

export default function Mountain() {
  const { scene, animations, nodes } = useGLTF("/models/test48.glb");
  const { actions, mixer } = useAnimations(animations, scene);
  const scroll = useScroll();
  const cameraRef = useRef<PerspectiveCameraType>(null);
  const firedRef = useRef(new Set<string>());

  // Start always-on looping animations with keyframe times shifted to 0
  useEffect(() => {
    alwaysOnAnimations.forEach((name) => {
      const clip = animations.find((c) => c.name === name);
      if (!clip || !actions[name]) return;
      clip.tracks.forEach((track) => {
        const times = track.times;
        const offset = times[0];
        for (let i = 0; i < times.length; i++) {
          times[i] -= offset;
        }
      });
      actions[name].reset().setLoop(LoopRepeat, Infinity).play();
    });
  }, [actions, animations]);

  // Parse GLB JSON to get correct animation→node index mapping
  const [animTargets, setAnimTargets] = useState<
    { animName: string; nodeName: string }[]
  >([]);

  useEffect(() => {
    fetch("/models/test48.glb")
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        const dv = new DataView(buf);
        const jsonLen = dv.getUint32(12, true);
        const jsonStr = new TextDecoder().decode(
          new Uint8Array(buf, 20, jsonLen)
        );
        const json = JSON.parse(jsonStr);
        const targets: { animName: string; nodeName: string }[] = [];
        json.animations.forEach((anim: any) => {
          const nodeIdx = anim.channels[0].target.node;
          const nodeName = json.nodes[nodeIdx]?.name;
          if (nodeName) targets.push({ animName: anim.name, nodeName });
        });
        setAnimTargets(targets);
      });
  }, []);

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

  const cameraLookAt = new Vector3(0, 0, 0);

  const triggerRadius = 15;

  const animationTriggers = useMemo(() => {
    const triggers: { actionName: string; triggerT: number }[] = [];
    const tempPos = new Vector3();
    const tempCurvePos = new Vector3();
    const samples = 300;

    const filteredTargets = animTargets.filter((t) =>
      proximityAnimations.includes(t.animName)
    );

    filteredTargets.forEach(({ animName, nodeName }) => {
      const targetNode = nodes[nodeName.replace(/\./g, "")];
      if (!targetNode) return;

      targetNode.getWorldPosition(tempPos);

      let triggerT = -1;
      let closestDist = Infinity;
      let closestT = 0;

      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        camCurve.getPoint(t, tempCurvePos);
        const dist = tempCurvePos.distanceTo(tempPos);

        if (dist < closestDist) {
          closestDist = dist;
          closestT = t;
        }

        if (dist < triggerRadius && triggerT === -1) {
          triggerT = t;
        }
      }

      triggers.push({
        actionName: animName,
        triggerT: triggerT === -1 ? closestT : triggerT,
      });
    });

    triggers.sort((a, b) => a.triggerT - b.triggerT);
    return triggers;
  }, [animTargets, nodes, camCurve]);

  useFrame((state, delta) => {
    const scrollAmount = MathUtils.clamp(scroll.offset, 0, 1);
    camCurve.getPoint(scrollAmount, state.camera.position);
    pathCurve.getPoint(scrollAmount, cameraLookAt);
    state.camera.lookAt(cameraLookAt);

    animationTriggers.forEach(({ actionName, triggerT }) => {
      if (scrollAmount >= triggerT && !firedRef.current.has(actionName)) {
        firedRef.current.add(actionName);
        const action = actions[actionName];
        if (action) {
          action.reset();
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
        }
      }
    });

    // apex camera fov change animation
    if (scrollAmount >= 0.99 && cameraRef.current) {
      cameraRef.current.fov = MathUtils.lerp(cameraRef.current.fov, 60, 0.01);
      cameraRef.current?.updateProjectionMatrix();
    } else if (cameraRef.current) {
      cameraRef.current.fov = MathUtils.lerp(cameraRef.current.fov, 80, 0.1);
      cameraRef.current?.updateProjectionMatrix();
    }
  });

  useEffect(() => {
    scene.traverse((object) => {
      if (object.isMesh) {
        object.material.side = 0;
      }
      // if (object.name === "Mountain") {
      //   object.receiveShadow = true;
      // }
      // if (object.name === "Back001") {
      //   object.material.metalness = 0;
      // }
      // if (object.name === "ThreeJS") {
      //   object.material.color = new Color("purple");
      // }
    });
  }, [scene]);

  return (
    <>
      {/* ---------- Performance ---------- */}
      {/* <Perf showGraph position="top-left" colorBlind /> */}
      <Preload all />

      {/* ---------- Lights ---------- */}
      <ambientLight intensity={1.1} />
      <directionalLight position={[10, 10, 10]} intensity={4} castShadow />
      {/* <Environment
        files="/HDRI/passendorf_snow_1k.exr"
        background={true}
        environmentIntensity={0}
      /> */}

      {/* ---------- Cameras ---------- */}
      <PerspectiveCamera
        position={[10, 10, 10]}
        makeDefault
        fov={80}
        ref={cameraRef}
      />

      {/* ---------- Controls ---------- */}
      {/* <OrbitControls   /> */}

      {/* ---------- Objects ---------- */}
      <primitive object={scene} scale={1} />

      {/* ---------- Helpers ---------- */}
      {/* <axesHelper scale={50} /> */}
    </>
  );
}
