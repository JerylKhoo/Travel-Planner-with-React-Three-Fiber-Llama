import { useRef, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Convert latitude/longitude to 3D coordinates on sphere
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

function CityPin({ city, onPinClick, onPinHover, hoveredCity}) {
  const pinRef = useRef();
  const [hovered, setHovered] = useState(false);
  const isThisCityHovered = hoveredCity && hoveredCity.name === city.name;

  const position = useMemo(
    () => latLonToVector3(city.position.lat, city.position.lon, 1.0),
    [city.position.lat, city.position.lon]
  );

  // Calculate rotation to point outward from earth center (0,0,0)
  const rotation = useMemo(() => {
    // Create a quaternion that rotates the pin to point outward
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0); // Default up direction

    // Make the pin point in the direction of its position (away from origin)
    const direction = position.clone().normalize();
    quaternion.setFromUnitVectors(up, direction);

    return new THREE.Euler().setFromQuaternion(quaternion);
  }, [position]);

  return (
    <group
      ref={pinRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onPinClick(city);
      }}
      onPointerOver={() => {
        setHovered(true);
        onPinHover(city);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Pin needle */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 8]} />
        <meshPhongMaterial color="#888888" />
      </mesh>
      {/* Pin head */}
      <mesh position={[0, 0.095, 0]}>
        <sphereGeometry args={[hovered ? 0.02 : 0.015, 16, 16]} />
        <meshPhongMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* City name label - only show on mobile when this city is hovered */}
      {isThisCityHovered && (() => {
        const fontSize = 0.05;
        const padding = 0.015;
        const charWidth = fontSize * 0.6; // Approximate character width
        const planeWidth = city.name.length * charWidth + padding * 2;
        const planeHeight = fontSize + padding;

        return (
          <Billboard position={[0, 0.15, 0]}>
            <mesh>
              <planeGeometry args={[planeWidth, planeHeight]} />
              <meshBasicMaterial color="#000000" opacity={0.7} transparent />
            </mesh>
            <Text
              position={[0, 0, 0.001]}
              fontSize={fontSize}
              color="#39ff41"
              anchorX="center"
              anchorY="middle"
            >
              {city.name}
            </Text>
          </Billboard>
        );
      })()}
    </group>
  );
}

function Earth({ cities, onPinClick, onPinHover, globeGroupRef, isDesktop, hoveredCity }) {
  const earthRef = useRef();
  const cloudsRef = useRef();

  // Load textures
  const [earthMap, earthBump, earthClouds] = useLoader(
    THREE.TextureLoader,
    [
      '/texture/earthmap.jpeg',
      '/texture/earthbump.jpeg',
      '/texture/earthCloud.png',
    ]
  );

  // Subtle cloud rotation
  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0003;
    }
  });

  return (
    <>
      {/* Earth group that will be rotated by controls */}
      <group ref={globeGroupRef}>
        {/* Earth */}
        <mesh ref={earthRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshPhongMaterial
            map={earthMap}
            bumpMap={earthBump}
            bumpScale={0.05}
          />
        </mesh>

        {/* Clouds */}
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[1.01, 64, 64]} />
          <meshPhongMaterial
            map={earthClouds}
            transparent={true}
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>

        {/* Preload font - hidden text to load the font on mount */}
        <Text position={[1000, 1000, 1000]} fontSize={0.02} visible={false}>
          Preload
        </Text>

        {/* City pins */}
        <group>
          {cities.map((city, idx) => (
            <CityPin key={idx} city={city} onPinClick={onPinClick} onPinHover={onPinHover} isDesktop={isDesktop} hoveredCity={hoveredCity} />
          ))}
        </group>
      </group>
    </>
  );
}

export default function Globe3D({ globeRef, onPinClick, onPinHover, isDesktop, hoveredCity }) {
  const cities = useMemo(
    () => [
      {
        position: {
          lat: 40.7128,
          lon: -74.006,
        },
        name: 'New York'
      },
      {
        position: {
          lat: 51.5074,
          lon: -0.1278,
        },
        name: 'London'
      },
      {
        position: {
          lat: -33.8688,
          lon: 151.2093
        },
        name: 'Sydney'
      },
      {
        position: {
          lat: 48.8566,
          lon: 2.3522
        },
        name: 'Paris'
      },
      {
        position: {
          lat: -23.5505,
          lon: -46.6333
        },
        name: 'São Paulo'
      },
      {
        position: {
          lat: 55.7558,
          lon: 37.6173
        },
        name: 'Moscow'
      },
      {
        position: {
          lat: 19.4326,
          lon: -99.1332
        },
        name: 'Mexico City'
      }
    ],
    []
  );

  return (
      <group scale={3}>
        <Earth cities={cities} onPinClick={onPinClick} onPinHover={onPinHover} globeGroupRef={globeRef} isDesktop={isDesktop} hoveredCity={hoveredCity} />
      </group>

  );
}