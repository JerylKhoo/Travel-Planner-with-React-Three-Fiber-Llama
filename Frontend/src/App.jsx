import './App.css'
import GlobeHUD from './Components/ThreeCompiler.jsx'
import Login from './pages/Login.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';


function App() {
  const [isDesktop, setDesktop] = useState(window.innerWidth > 900);
  const { user, loading } = useAuth();

  const updateMedia = () => {
    setDesktop(window.innerWidth > 1450);
  };

  useEffect(() => {
    window.addEventListener("resize", updateMedia);
    return () => window.removeEventListener("resize", updateMedia);
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Login Route - Redirect to home if already logged in */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Home/Globe Route - Require authentication */}
      <Route
        path="/"
        element={user ? <GlobeHUD isDesktop={isDesktop} /> : <Navigate to="/login" replace />}
      />

      {/* Catch all - redirect to home */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App
