import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry } from "three";

export default function CustomObj() {
  const ref = useRef<BufferGeometry>(undefined);

  const trianglesCount = 10;
  const positions = useMemo(() => {
    // We want to create 10 triangles -> we need 3 vertecise for each triangle -> we need 3 coordinate for each vertex
    const positionsCoordinates = new Float32Array(trianglesCount * 3 * 3); // here we did only create an empty array with required slots to get filled later

    for (let i = 0; i < positionsCoordinates.length; i++) {
      // eslint-disable-next-line react-hooks/purity
      positionsCoordinates[i] = Math.random() - 0.5; // random is impure so we need to use a side effect handler like useEffect or disabling eslint heavy sirens
    }
    return positionsCoordinates;
  }, []);

  useEffect(() => {
    ref.current?.computeVertexNormals();
  }, []);

  return (
    <mesh>
      <bufferGeometry ref={ref}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>

      <meshStandardMaterial
        color={"midnightblue"}
        metalness={0.2}
        roughness={0.8}
        side={2}
      />
    </mesh>
  );
}
