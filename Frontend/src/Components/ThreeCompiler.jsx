import React, { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Arms } from './Arms';
import HUD from './HUD';
import Stars from './Globe/Stars';
import Globe3D from './Globe/Globe';
import Login from './Login/Login';
import { useStore } from '../Store/useStore';
import MyTrips from './Trips/MyTrips';
import TripPlanner from './TripPlanner/TripPlanner';
import TripEditor from './TripEditor/TripEditor';

function Scene({ leftArmClickRef, rightArmClickRef, resetLeftArmRef, resetRightArmRef, homeClickRef, onPinClick, onPinHover, tripEditHandlerRef }) {
  const globeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isDragging: false });

  // Get states from Zustand
  const showLoginScreen = useStore((state) => state.showLoginScreen);
  const showSignupScreen = useStore((state) => state.showSignupScreen);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);
  const hoveredCity = useStore((state) => state.hoveredCity);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const userId = useStore((state) => state.userId);

  // Mouse interaction handlers
  const handleMouseDown = (e) => {
    mouseRef.current.isDragging = true;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.isDragging || !globeRef.current) return;

    const deltaX = e.clientX - mouseRef.current.x;
    const deltaY = e.clientY - mouseRef.current.y;

    globeRef.current.rotation.y += deltaX * 0.005;
    globeRef.current.rotation.x += deltaY * 0.005;

    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDragging = false;
  };

  React.useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4a90e2" />
      <CameraLight />

      {/* Globe */}
      <Globe3D globeRef={globeRef} onPinClick={onPinClick} onPinHover={onPinHover} isDesktop={isDesktop} hoveredCity={hoveredCity} />

      {/* Login Screen / My Trips Screen */}
      {showLoginScreen && (
        isDesktop ? (
          <mesh position={[-2.55, 0, 7.5]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[1.2, 0.7]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={0.1}
            />
            {isLoggedIn ? (
              <>
                <MyTrips onTripEditHandler={tripEditHandlerRef} />
              </>
            ) : (
              <Login />
            )}
          </mesh>
        ) : (
          <mesh position={[-2.55, 0, 7.5]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.5, 0.7]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={0.1}
            />{isLoggedIn ? (
              <>
                <MyTrips onTripEditHandler={tripEditHandlerRef} />
              </>
            ) : (
              <Login />
            )}
          </mesh>
        )
      )}

      {showSignupScreen && (
        isDesktop ? (
          <mesh position={[2.55, 0, 7.5]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.2, 0.7]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={0.1}
            />{selectedTrip ? (
              <TripEditor />
            ) : (
              <TripPlanner />
            )}
          </mesh>
        ) : (
          <mesh position={[2.55, 0, 7.5]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[0.5, 0.7]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={0.1}
            />{selectedTrip ? (
              <TripEditor />
            ) : (
              <TripPlanner />
            )}
          </mesh>
        )
      )}
      {/* Stars */}
      <Stars />

      {/* Arms */}
      <Arms position={[0, -1, 3.3]} rotation-z={Math.PI} rotation-x={-Math.PI/2} scale={140} onLeftArmClickRef={leftArmClickRef} onRightArmClickRef={rightArmClickRef} onResetLeftArmRef={resetLeftArmRef} onResetRightArmRef={resetRightArmRef} onHomeClickRef={homeClickRef} />

      {/* Auto-rotate cube */}
      <AutoRotate globeRef={globeRef} mouseRef={mouseRef} />
    </>
  );
}

function CameraLight() {
  const { camera } = useThree();
  const lightRef = useRef();

  React.useEffect(() => {
    if (lightRef.current) {
      // Make the light look downwards
      lightRef.current.target.position.set(
        camera.position.x,
        camera.position.y - 10,
        camera.position.z
      );
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[camera.position.x, camera.position.y + 2, camera.position.z]}
      intensity={1}
    />
  );
}

function AutoRotate({ globeRef, mouseRef }) {
  React.useEffect(() => {
    const animate = () => {
      if (globeRef.current && !mouseRef.current.isDragging) {
        globeRef.current.rotation.y += 0.0003;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return null;
}

export default function GlobeHUD() {
  const cameraRef = useRef(null);
  const leftArmClickRef = useRef(null);
  const rightArmClickRef = useRef(null);
  const resetLeftArmRef = useRef(null);
  const resetRightArmRef = useRef(null);
  const homeClickRef = useRef(null);
  const tripEditHandlerRef = useRef(null);

  // Get setters from Zustand
  const setSelectedCity = useStore((state) => state.setSelectedCity);
  const setHoveredCity = useStore((state) => state.setHoveredCity);

  const handlePinClick = (city) => {
    setSelectedCity(city);
  };

  const handlePinHover = (city) => {
    setHoveredCity(city);
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
        }}
      >
        <Scene
          leftArmClickRef={leftArmClickRef}
          rightArmClickRef={rightArmClickRef}
          resetLeftArmRef={resetLeftArmRef}
          resetRightArmRef={resetRightArmRef}
          homeClickRef={homeClickRef}
          onPinClick={handlePinClick}
          onPinHover={handlePinHover}
          tripEditHandlerRef={tripEditHandlerRef}
        />
      </Canvas>
      <HUD
        cameraRef={cameraRef}
        leftArmClickRef={leftArmClickRef}
        rightArmClickRef={rightArmClickRef}
        resetLeftArmRef={resetLeftArmRef}
        resetRightArmRef={resetRightArmRef}
        homeClickRef={homeClickRef}
        onTripEditHandler={tripEditHandlerRef}
      />
    </div>
  );
}
