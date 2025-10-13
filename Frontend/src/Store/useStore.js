import { create } from 'zustand';

export const useStore = create((set) => ({
  // UI States
  showLoginScreen: false,
  showSignupScreen: false,
  selectedCity: null,
  hoveredCity: null,
  isDesktop: window.innerWidth > 1450,

  // Auth States
  userId: null,
  userEmail: null,
  isLoggedIn: false,

  // Actions
  setShowLoginScreen: (show) => set({ showLoginScreen: show }),
  setShowSignupScreen: (show) => set({ showSignupScreen: show }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setHoveredCity: (city) => set({ hoveredCity: city }),
  setIsDesktop: (isDesktop) => set({ isDesktop: isDesktop }),

  // Auth Actions
  setUserId: (userId) => set({ userId: userId }),
  setUserEmail: (userEmail) => set({ userEmail: userEmail }),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn: isLoggedIn }),
}));
