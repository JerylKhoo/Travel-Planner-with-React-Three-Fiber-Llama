import './App.css'
import GlobeHUD from './Components/ThreeCompiler.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import { useEffect } from 'react';
import { useStore } from './Store/useStore';
import { Toaster } from 'react-hot-toast';


function App() {
  const setIsDesktop = useStore((state) => state.setIsDesktop);

  const updateMedia = () => {
    setIsDesktop(window.innerWidth > 1280);
  };

  useEffect(() => {
    updateMedia();
    window.addEventListener("resize", updateMedia);
    return () => window.removeEventListener("resize", updateMedia);
  }, []);

  return (
    <>
      <GlobeHUD />
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
    </>
  )
}

export default App
