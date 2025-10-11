import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Html } from '@react-three/drei';

function Login({ isDesktop }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Calculate pixel dimensions
  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Sign up
      const { error } = await signUp(email, password, { full_name: fullName });

      if (error) {
        setError(error.message);
      }
      // isLoggedIn will be automatically set to true by AuthContext
    } else {
      // Sign in
      const { error } = await signIn(email, password, rememberMe);

      if (error) {
        setError(error.message);
      }
      // isLoggedIn will be automatically set to true by AuthContext
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  return (
    <Html
      transform
      wrapperClass="screen-wrapper"
      distanceFactor={0.5}
      position={[0, 0, 0.01]}
      className={`w-[${pixelWidth}px] h-[${pixelHeight}px] bg-transparent shadow-lg overflow-auto`}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
    >
      <div className="bg-transparent flex flex-col items-center justify-center">
        <div className="grid grid-cols-2 justify-center mb-2 bg-gray-800/50 mt-3 rounded-xl">
          <button
            className={`flex-1 px-6 py-3 border-none text-gray-400 font-mono cursor-pointer ${
              !isSignUp 
                ? 'bg-[#39ff41] text-black' 
                : 'hover:text-white hover:bg-white/5'
            }`}
            style={{ fontSize: '14px', borderTopLeftRadius: '0.75rem', borderBottomLeftRadius: '0.75rem' }}
            onClick={() => {
              setIsSignUp(false);
              setError('');
              setSuccess('');
            }}
          >
            Log In
          </button>
          <button
            className={`flex-1 px-6 py-3 border-none text-gray-400 font-mono cursor-pointer ${
              isSignUp 
                ? 'bg-[#39ff41] text-black' 
                : 'hover:text-white hover:bg-white/5'
            }`}
            style={{ fontSize: '14px', borderTopRightRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}
            onClick={() => {
              setIsSignUp(true);
              setError('');
              setSuccess('');
            }}
          >
            Register
          </button>
        </div>
        <div className="flex flex-col items-center justify-center mt-2">
          {error && <div className="py-2 px-4 rounded-xl mb-2 font-mono bg-red-500/10 text-red-300" style={{ fontSize: '12px', border: '0.5px solid', borderColor: 'rgba(239, 68, 68, 0.3)' }}>{error}</div>}
          {success && <div className="py-2 px-4 rounded-xl mb-2 font-mono bg-green-500/10 text-green-300" style={{ fontSize: '12px', border: '0.5px solid', borderColor: 'rgba(34, 197, 94, 0.3)' }}>{success}</div>}
        
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-gray-200 text-xs font-mono mb-2">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs opacity-60 pointer-events-none">👤</span>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full pl-12 pr-4 py-1.5 bg-[#1e1e1e]/60 rounded-xl text-white transition-all duration-300 placeholder:text-gray-500 "
                    style={{ fontSize: '12px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
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
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-gray-200 text-xs font-mono mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-lg opacity-60 pointer-events-none">✉️</span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full pl-12 pr-4 py-1.5 bg-[#1e1e1e]/60 rounded-xl text-white text-base transition-all duration-300 placeholder:text-gray-500"
                  style={{ fontSize: '12px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
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
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-200 text-xs font-mono mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-lg opacity-60 pointer-events-none">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-1.5 bg-[#1e1e1e]/60 rounded-xl text-white text-base transition-all duration-300 placeholder:text-gray-500"
                  style={{ fontSize: '12px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
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

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-gray-200 text-xs font-mono mb-2">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-lg opacity-60 pointer-events-none">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-4 py-1.5 bg-[#1e1e1e]/60 rounded-xl text-white text-base transition-all duration-300 placeholder:text-gray-500"
                    style={{ fontSize: '12px', outline: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
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
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className='grid grid-cols-2 justify-center mx-2' style={{ alignItems: 'center', height: '24px' }}>
                <label className="flex" style={{ alignItems: 'center', height: '100%' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4.5 h-4.5 cursor-pointer accent-indigo-500"
                    style={{ verticalAlign: 'middle' }}
                  />
                  <span className="text-gray-400 text-xs pl-1" style={{ lineHeight: '24px', verticalAlign: 'middle' }}>
                    Remember me
                  </span>
                </label>
                <button 
                  type="button" 
                  className="bg-none border-none text-indigo-400 text-xs cursor-pointer p-0 transition-colors duration-200 hover:text-indigo-300 hover:underline"
                  style={{ fontSize: '12px', lineHeight: '24px', verticalAlign: 'middle' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full my-2 py-2 bg-[#39ff41] border-none text-black font-mono font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:shadow-2xl hover:shadow-green-500/40 active:translate-y-0"
              style={{ fontSize: '12px', borderRadius: '0.75rem' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center text-center w-full my-1">
            <div className="flex-1" style={{ border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.1)' }}></div>
            <span className="px-4 text-[#39ff41]" style={{ fontSize: '12px' }}>Or continue with</span>
            <div className="flex-1" style={{ border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.1)' }}></div>
          </div>

          <button
            type="button"
            className="w-full mt-1 py-2.5 px-4 bg-[#1e1e1e]/60 border border-white/10 rounded-xl text-gray-200 text-sm font-medium cursor-pointer flex items-center justify-center gap-3 transition-all duration-300 hover:bg-[#282828]/80 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 active:translate-y-0"
            onClick={handleGoogleSignIn}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

        </div>
      </div>
    </Html>
  );
}

export default Login;
