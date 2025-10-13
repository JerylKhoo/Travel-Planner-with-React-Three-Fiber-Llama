import { create } from 'zustand';

export const useStore = create((set) => ({
  // UI States
  showLoginScreen: false,
  showSignupScreen: false,
  selectedCity: null,
  hoveredCity: null,
  isDesktop: window.innerWidth > 1450,

  // Actions
  setShowLoginScreen: (show) => set({ showLoginScreen: show }),
  setShowSignupScreen: (show) => set({ showSignupScreen: show }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setHoveredCity: (city) => set({ hoveredCity: city }),
  setIsDesktop: (isDesktop) => set({ isDesktop: isDesktop }),
}));
