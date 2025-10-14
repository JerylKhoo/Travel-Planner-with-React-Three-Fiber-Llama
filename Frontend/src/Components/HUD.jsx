import React, { useState, useEffect } from 'react';
import gsap from 'gsap'
import ItineraryModal from './Globe/Country'
import { showText } from './Showtext';

export default function HUD({ cameraRef, leftArmClickRef, rightArmClickRef, resetLeftArmRef, resetRightArmRef, homeClickRef, setShowLoginScreen, showLoginScreen, setShowSignupScreen, showSignupScreen, selectedCity, setSelectedCity, hoveredCity, isDesktop, onCreateTrip }) {
  const [isLoginActive, setIsLoginActive] = useState(false);
  const [isSignupActive, setisSignupActive] = useState(false);

  const hints = [
    "Click on a city pin to view details",
    "Drag to rotate the globe",
    "Scroll to zoom in and out",
    "Hover over pins to see city names",
    "Explore different destinations around the world"
  ];

  useEffect(() => {
    const showRandomHint = () => {
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      const hintElement = document.getElementById('hint');
      if (hintElement) {
        hintElement.textContent = '';
        showText('hint', randomHint, 0, 50);
      }
    };

    // Show first hint immediately
    showRandomHint();

    // Show new hint every 30 seconds
    const interval = setInterval(showRandomHint, 15000);

    return () => clearInterval(interval);
  }, []);



  const handleButtonClick = (button) => {
    if (button == "Login") {
      if (isSignupActive) {
        setisSignupActive(false);
        setShowSignupScreen(false);
        resetRightArmRef.current();
      }
      if (leftArmClickRef.current) {
        leftArmClickRef.current();
      }
      setIsLoginActive(true);
      setSelectedCity(null);
      animateCameraToLogin();
      setTimeout(() => {
        setShowLoginScreen(true);
      }, 2000);
    } else if (button == "Signup") {
      if (isLoginActive) {
        setIsLoginActive(false);
        setShowLoginScreen(false);
        resetLeftArmRef.current();
      }
      if (rightArmClickRef.current) {
        rightArmClickRef.current();
      }
      setisSignupActive(true);
      setSelectedCity(null);
      animateCameraToSignup();
      setTimeout(() => {
        setShowSignupScreen(true);
      }, 2000);
    } else if (button == "Home") {
      if (homeClickRef.current) {
        homeClickRef.current();
      }
      setIsLoginActive(false);
      setisSignupActive(false);
      setShowLoginScreen(false);
      setShowSignupScreen(false);
      animateCameraToHome();
    }
  };

  const animateCameraToLogin = () => {
    const camera = cameraRef.current;

    // Use GSAP to animate camera rotation
    gsap.to(camera.rotation, {
      y: Math.PI / 2, // 90 degrees to the left
      duration: 2,
      ease: "power2.inOut"
    });

    gsap.to(camera.position, {
      x: -1.9,
      y: 0,
      z: 7.5,
      duration: 2,
      ease: "power2.inOut"
    });
  };

  const animateCameraToSignup = () => {
    const camera = cameraRef.current;

    // Use GSAP to animate camera rotation
    gsap.to(camera.rotation, {
      y: -Math.PI / 2, // 90 degrees to the right
      duration: 2,
      ease: "power2.inOut"
    });

    gsap.to(camera.position, {
      x: 1.9,
      y: 0,
      z: 7.5,
      duration: 2,
      ease: "power2.inOut"
    });
  };

  // Animate camera back to home view (original position)
  const animateCameraToHome = () => {
    const camera = cameraRef.current;
    
    // Use GSAP to animate back to original rotation
    gsap.to(camera.rotation, {
      y: 0,
      duration: 2,
      ease: "power2.inOut"
    });

    // Move camera back to original position
    gsap.to(camera.position, {
      x: 0,
      y: 0,
      z: 8,
      duration: 2,
      ease: "power2.inOut"
    });
  };

  return (
    <div>
      <div className="fixed top-5 left-1/2 -translate-x-1/2 flex gap-10 z-[1] pointer-events-none lg:left-5 lg:translate-x-0 lg:flex-col lg:pl-5 lg:gap-3">
        <button
          className={`bg-transparent font-mono border-0 py-0 text-sm tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative overflow-hidden hover:text-red-600 order-none lg:order-2
            ${isLoginActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => handleButtonClick('Login')}
          disabled={isLoginActive}
        >
          LOGIN
        </button>
        <button
          className={`bg-transparent font-mono border-0 py-0 text-sm tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative overflow-hidden hover:text-red-600 order-none lg:order-1
            ${!isLoginActive && !isSignupActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => handleButtonClick('Home')}
          disabled={!isLoginActive && !isSignupActive}
        >
          HOME
        </button>
        <button
          className={`bg-transparent font-mono border-0 py-0 text-sm tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative overflow-hidden hover:text-red-600 order-none lg:order-3
            ${isSignupActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => handleButtonClick('Signup')}
          disabled={isSignupActive}
        >
          SIGNUP
        </button>
        <button
          className={`bg-transparent font-mono border-0 py-0 text-sm tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative overflow-hidden hover:text-red-600 order-none lg:order-3
            ${isSignupActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => {handleButtonClick('Home')
          onCreateTrip?.();
          }}
          
          disabled={isSignupActive}
        >
          CREATE A TRIP
        </button>
      </div>
      
      <div id='hint' className="fixed left-3 right-3 bottom-5 text-[#39ff41] text-sm font-mono tracking-wide z-10 text-center lg:top-5 lg:right-5 lg:left-auto lg:bottom-auto lg:px-0 lg:pb-0"></div>
      
      {selectedCity && (
        <div className='fixed top-30 right-5 text-[#39ff41] rounded font-mono text-sm tracking-[1px] z-10'>
          <ItineraryModal city={selectedCity} onClose={() => setSelectedCity(null)} isDesktop={isDesktop} />
        </div>
      )}
    </div>
  )
}