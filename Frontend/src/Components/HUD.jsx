import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import ItineraryModal from './Globe/Country';
import { showText } from './Showtext';
import { useAuth } from './Login/AuthContext';
import { useStore } from '../Store/useStore';
import { Toaster } from 'react-hot-toast';

export default function HUD({ cameraRef, leftArmClickRef, rightArmClickRef, resetLeftArmRef, resetRightArmRef, homeClickRef, onTripEditHandler }) {
  const [isLoginActive, setIsLoginActive] = useState(false);
  const [isSignupActive, setisSignupActive] = useState(false);

  const { signOut, updatePassword } = useAuth();

  // Get states and setters from Zustand
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const userEmail = useStore((state) => state.userEmail);
  const selectedCity = useStore((state) => state.selectedCity);
  const isDesktop = useStore((state) => state.isDesktop);
  const setShowLoginScreen = useStore((state) => state.setShowLoginScreen);
  const setShowSignupScreen = useStore((state) => state.setShowSignupScreen);
  const setSelectedCity = useStore((state) => state.setSelectedCity);
  //addition 1 start
  const setSelectedTrip = useStore((state) => state.setSelectedTrip);
  //addition 1 end

  
  const [showResetModal, setShowResetModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleRecoverySession = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');

      if (type === 'recovery') {
        localStorage.setItem('rememberMe', 'true');
        setShowResetModal(true);
      }
    };

    handleRecoverySession();
  }, [])

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const newPassword = event.target.elements.newPassword.value;
    const confirmPassword = event.target.elements.confirmPassword.value;

    if (!newPassword || !confirmPassword) {
      setError("Please enter missing value");
      setLoading(false);
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError("Password mismatch");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    setSuccess("Resetting Password");
    const { error } = await updatePassword(newPassword);

    if (error) {
      setSuccess("");
      setError("Please try Resetting Password again");
      setLoading(false);
      setShowResetModal(false);
      return
    }

    setSuccess("Sucessfully Reset Password");
    setTimeout(function() {
      setLoading(false);
      setShowResetModal(false);
    }, 3000);
  }

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
    } else if (button == "Trip Planner") {
      if (isLoginActive) {
        setIsLoginActive(false);
        setShowLoginScreen(false);
        resetLeftArmRef.current();
      }
      if (rightArmClickRef.current) {
        rightArmClickRef.current();
        //addition 2 start
        setSelectedTrip(null);
        //addition 2 end

      }
      setisSignupActive(true);
      setSelectedCity(null);
      animateCameraToSignup();
      setTimeout(() => {
        setShowSignupScreen(true);
      }, 2000);
    } 
    else if (button == "Home") {
      if (homeClickRef.current) {
        homeClickRef.current();
      }
      setIsLoginActive(false);
      setisSignupActive(false);
      setShowLoginScreen(false);
      setShowSignupScreen(false);
      animateCameraToHome();
    } else if (button == "Signout") {
      // Sign out the user (await to ensure completion)
      signOut().then(() => {
        // Reset all states after successful signout
        setIsLoginActive(false);
        setisSignupActive(false);
        setShowLoginScreen(false);
        setShowSignupScreen(false);
        setSelectedCity(null);
        if (leftArmClickRef.current) {
          resetLeftArmRef.current();
        }
        if (rightArmClickRef.current) {
          resetRightArmRef.current();
        }
        animateCameraToHome();
      }).catch((error) => {
      });
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

  // Expose handler for trip edit - navigates to Trip Planner
  const handleTripEdit = () => {
    setIsLoginActive(false);
    setShowLoginScreen(false);
    if (resetLeftArmRef.current) {
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
  };

  // Pass the handler to parent via callback
  React.useEffect(() => {
    if (onTripEditHandler) {
      onTripEditHandler.current = handleTripEdit;
    }
  }, [onTripEditHandler]);

  return (
    <div>
      <div className="fixed top-3 left-1/2 -translate-x-1/2 flex gap-4 z-[1] pointer-events-none
                      sm:top-4 sm:gap-6
                      md:left-4 md:translate-x-0 md:flex-col md:gap-2.5
                      lg:left-5 lg:top-5 lg:gap-3
                      xl:gap-3.5
                      2xl:gap-4">
        <button
          className={`bg-transparent font-mono border-0 py-0 text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative hover:text-red-600 order-1 md:order-1 lg:order-1
            ${!isLoginActive && !isSignupActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => handleButtonClick('Home')}
          disabled={!isLoginActive && !isSignupActive}
        >
          HOME
        </button>

        <button
          className={`bg-transparent font-mono border-0 py-0 text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative hover:text-red-600 order-3
            ${isLoggedIn ? 'md:order-2 lg:order-2' : 'md:order-3 lg:order-3' }
            ${isSignupActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
          onClick={() => handleButtonClick('Trip Planner')}
          disabled={isSignupActive}
        >
          TRIP PLANNER
        </button>
        {!isLoggedIn ? (
          <button
            className={`bg-transparent font-mono border-0 py-0 text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative hover:text-red-600 order-3 md:order-3 lg:order-3
              ${isLoginActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
            onClick={() => handleButtonClick('Login')}
            disabled={isLoginActive}
          >
            LOGIN
          </button>
        ) : (
          <>
            <button
              className={`bg-transparent font-mono border-0 py-0 text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative hover:text-red-600 order-2 md:order-2 lg:order-2
                ${isLoginActive ? 'text-white cursor-not-allowed opacity-60' : 'text-[#39ff41] cursor-pointer opacity-100'}`}
              onClick={() => handleButtonClick('Login')}
              disabled={isLoginActive}
            >
              MY TRIPS
            </button>
            <button
            className={`bg-transparent font-mono border-0 py-0 text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg tracking-wide transition-all duration-300 ease-in-out pointer-events-auto relative hover:text-red-600 order-4 md:order-4 lg:order-4 text-[#39ff41] cursor-pointer opacity-100`}
            onClick={() => handleButtonClick('Signout')}
            >
              SIGNOUT
            </button>

          </>
        )}
      </div>

      <div id='hint' className="fixed left-2 right-2 bottom-3 text-[#39ff41] text-[10px] sm:text-xs md:text-sm lg:text-sm xl:text-base 2xl:text-lg font-mono tracking-wide z-10 text-center
                                   sm:left-3 sm:right-3 sm:bottom-4
                                   md:top-4 md:right-4 md:left-auto md:bottom-auto md:text-right
                                   lg:top-5 lg:right-5
                                   xl:top-6 xl:right-6
                                   2xl:top-7 2xl:right-7"></div>


      {selectedCity && (
        <div className='fixed top-24 right-3 text-[#39ff41] rounded font-mono text-xs tracking-[1px] z-10
                        sm:top-28 sm:right-4
                        md:top-32 md:right-5 md:text-sm
                        lg:top-36 lg:right-6
                        xl:top-40 xl:text-base
                        2xl:top-44 2xl:text-lg'>
          <ItineraryModal city={selectedCity} onClose={() => setSelectedCity(null)} isDesktop={isDesktop} />
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="grid justify-center bg-gray-800/50 rounded-xl px-4 py-4 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
            <p className="flex justify-center text-mono text-base sm:text-lg md:text-xl lg:text-2xl underline text-[#39ff41] pt-3 pb-2">
              Reset Password
            </p>
            {error && <div className="py-2 px-4 rounded-xl mb-2 font-mono bg-red-500/10 text-red-300 text-xs sm:text-sm md:text-base" style={{ border: '0.5px solid', borderColor: 'rgba(239, 68, 68, 0.3)' }}>{error}</div>}
            {success && <div className="py-2 px-4 rounded-xl mb-2 font-mono bg-green-500/10 text-green-300 text-xs sm:text-sm md:text-base" style={{ border: '0.5px solid', borderColor: 'rgba(34, 197, 94, 0.3)' }}>{success}</div>}
            <form onSubmit={resetPassword} className="flex flex-col gap-2">
              <div>
                <label htmlFor="newPassword" className="block text-gray-200 text-xs sm:text-sm md:text-base font-mono mb-1 ml-3">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs sm:text-sm md:text-base opacity-60 pointer-events-none">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-12 py-2.5 bg-[#1e1e1e]/60 rounded-xl text-white transition-all duration-300 placeholder:text-gray-500 overflow-x-visible"
                    style={{ fontSize: '14px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgb(34, 197, 94)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(34, 197, 94, 0.3)';
                      e.target.style.background = 'rgba(30, 30, 30, 0.8)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'rgba(30, 30, 30, 0.6)';
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-4 bg-none border-none cursor-pointer text-xl opacity-60 transition-opacity duration-200 hover:opacity-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-gray-200 text-sm font-mono mb-1 ml-3">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm opacity-60 pointer-events-none">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-12 py-2.5 bg-[#1e1e1e]/60 rounded-xl text-white transition-all duration-300 placeholder:text-gray-500 overflow-x-visible"
                    style={{ fontSize: '14px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgb(34, 197, 94)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(34, 197, 94, 0.3)';
                      e.target.style.background = 'rgba(30, 30, 30, 0.8)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'rgba(30, 30, 30, 0.6)';
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-4 bg-none border-none cursor-pointer text-xl opacity-60 transition-opacity duration-200 hover:opacity-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full my-2 py-2 bg-[#39ff41] border-none text-black font-mono font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:shadow-2xl hover:shadow-green-500/40 active:translate-y-0"
                style={{ fontSize: '14px', borderRadius: '0.75rem' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Reset Password
                    <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[#39ff41] font-mono tracking-wide z-10 lg:bottom-5 lg:left-5 lg:translate-x-0">
          <div className="bg-black/50 px-2 py-1 rounded border border-[#39ff41]/30 flex items-center justify-center">
            {isDesktop ? (
              <div className="text-center">
                <div className="mb-1 text-sm flex justify-left">Logged in as:</div>
                <div className="text-md font-bold">{userEmail.split('@')[0]}</div>
              </div>
            ) : (
               <div className="text-xs whitespace-nowrap">Logged in as: {userEmail.split('@')[0]}</div>
            )}
          </div>
        </div>
      )}

      <Toaster
        position="bottom-right"
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e1e1e',
            color: '#39ff41',
            border: '1px solid #39ff41',
            fontFamily: 'monospace',
            zIndex: 99999,
          },
          success: {
            iconTheme: {
              primary: '#39ff41',
              secondary: '#1e1e1e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4444',
              secondary: '#1e1e1e',
            },
            style: {
              border: '1px solid #ff4444',
              color: '#ff4444',
            },
          },
        }}
      />
    </div>
  )
}