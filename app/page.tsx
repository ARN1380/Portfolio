"use client";

import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import * as THREE from "three";
import Mountain from "./Mountain";
import { HDRLoader } from "three/examples/jsm/Addons.js";
import { ScrollControls } from "@react-three/drei";

const Playground = dynamic(() => import("@/app/Playground"), { ssr: false });

export default function Home() {
  // const HDRI = useLoader(HDRLoader, "./HDRI/forest.exr");

  return (
    <div className="h-dvh w-dvw">
      <Canvas
        // dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: 4,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 45, near: 0.01, far: 1000, position: [4, 2, -5] }}
      >
        <color args={["white"]} attach="background" />
        {/* <Playground /> */}

        <ScrollControls  pages={30}>
          <Mountain />
        </ScrollControls>
      </Canvas>
    </div>
  );
}
