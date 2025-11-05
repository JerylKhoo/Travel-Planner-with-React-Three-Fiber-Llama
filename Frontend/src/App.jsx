import './App.css'
import GlobeHUD from './Components/ThreeCompiler.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import { useEffect } from 'react';
import { useStore } from './Store/useStore';


function App() {
  const setIsDesktop = useStore((state) => state.setIsDesktop);

  const updateMedia = () => {
    setIsDesktop(window.innerWidth > 1280);
  };

  useEffect(() => {
    window.addEventListener("resize", updateMedia);
    return () => window.removeEventListener("resize", updateMedia);
  }, []);

  return (
    <>
      <GlobeHUD />
    </>
  )
}

export default App
