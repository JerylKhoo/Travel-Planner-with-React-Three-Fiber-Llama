import React, { useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Arms } from './Arms';
import HUD from './HUD';
import Stars from './Globe/Stars';
import Globe3D from './Globe/Globe';
import Login from './Login/Login';
import TripPlanner from './TripPlanner/TripPlanner';
import { useAuth } from './Login/AuthContext';

function Scene({ leftArmClickRef, rightArmClickRef, resetLeftArmRef, resetRightArmRef, homeClickRef, showLoginScreen, showSignupScreen, onPinClick, onPinHover, isDesktop, hoveredCity, isLoggedIn, userId }) {
  const globeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isDragging: false });

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
              <TripPlanner isDesktop={isDesktop} />
            ) : (
              <Login isDesktop={isDesktop}/>
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
              <TripPlanner isDesktop={isDesktop} />
            ) : (
              <Login isDesktop={isDesktop}/>
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
            />
            {/* Empty - Trip Planner feature under development */}
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
            />
            {/* Empty - Trip Planner feature under development */}
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

export default function GlobeHUD({ isDesktop }) {
  const cameraRef = useRef(null);
  const leftArmClickRef = useRef(null);
  const rightArmClickRef = useRef(null);
  const resetLeftArmRef = useRef(null);
  const resetRightArmRef = useRef(null);
  const homeClickRef = useRef(null);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignupScreen, setShowSignupScreen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  const [hoveredCity, setHoveredCity] = useState(null);

  const { isLoggedIn, userId, userEmail } = useAuth();

  // Sync state with URL on mount and when URL changes
  React.useEffect(() => {
    const syncStateWithURL = () => {
      const path = window.location.pathname;
      console.log('🔄 Browser navigation detected - URL changed to:', path);

      if (path === '/mytrips' || path === '/login') {
        // Trigger left arm animation
        console.log('⬅️ Triggering LEFT arm animation');
        if (leftArmClickRef.current) {
          leftArmClickRef.current();
        }
        setTimeout(() => {
          setShowLoginScreen(true);
          setShowSignupScreen(false);
        }, 2000);
      } else if (path === '/tripplanner') {
        // Trigger right arm animation
        console.log('➡️ Triggering RIGHT arm animation');
        if (rightArmClickRef.current) {
          rightArmClickRef.current();
        }
        setTimeout(() => {
          setShowLoginScreen(false);
          setShowSignupScreen(true);
        }, 2000);
      } else if (path === '/') {
        // Trigger home animation (return to earth)
        console.log('🏠 Triggering HOME animation');
        if (homeClickRef.current) {
          homeClickRef.current();
        }
        setShowLoginScreen(false);
        setShowSignupScreen(false);
      }
    };

    // Initial sync (no animation on mount)
    const path = window.location.pathname;
    if (path === '/mytrips' || path === '/login') {
      setShowLoginScreen(true);
      setShowSignupScreen(false);
    } else if (path === '/tripplanner') {
      setShowLoginScreen(false);
      setShowSignupScreen(true);
    } else if (path === '/') {
      setShowLoginScreen(false);
      setShowSignupScreen(false);
    }

    // Listen for browser back/forward buttons
    window.addEventListener('popstate', syncStateWithURL);

    return () => {
      window.removeEventListener('popstate', syncStateWithURL);
    };
  }, []);

  // Automatically hide login screen when user logs in (but allow Trip Planner to remain)
  React.useEffect(() => {
    if (isLoggedIn && showLoginScreen && window.location.pathname === '/login') {
      setShowLoginScreen(false);
      window.history.pushState({}, '', '/');
      console.log('User logged in with ID:', userId);
    }
  }, [isLoggedIn, userId, showLoginScreen]);

  const handlePinClick = (city) => {
    setSelectedCity(city);
  };

  const handlePinHover = (city) => {
    setHoveredCity(city);
  };

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
          showLoginScreen={showLoginScreen}
          showSignupScreen={showSignupScreen}
          onPinClick={handlePinClick}
          onPinHover={handlePinHover}
          isDesktop={isDesktop}
          hoveredCity={hoveredCity}
          isLoggedIn={isLoggedIn}
          userId={userId}
        />
      </Canvas>
      <HUD
        cameraRef={cameraRef}
        leftArmClickRef={leftArmClickRef}
        rightArmClickRef={rightArmClickRef}
        resetLeftArmRef={resetLeftArmRef}
        resetRightArmRef={resetRightArmRef}
        homeClickRef={homeClickRef}
        setShowLoginScreen={setShowLoginScreen}
        showLoginScreen={showLoginScreen}
        setShowSignupScreen={setShowSignupScreen}
        showSignupScreen={showSignupScreen}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        hoveredCity={hoveredCity}
        isDesktop={isDesktop}
        isLoggedIn={isLoggedIn}
        userId={userId}
        userEmail={userEmail}
      />
    </div>
  );
}
