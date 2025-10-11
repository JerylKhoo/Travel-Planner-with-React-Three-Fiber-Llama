import './App.css'
import GlobeHUD from './Components/ThreeCompiler.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import { useEffect, useState } from 'react';


function App() {
  const [isDesktop, setDesktop] = useState(window.innerWidth > 900);

  const updateMedia = () => {
    setDesktop(window.innerWidth > 1450);
  };

  useEffect(() => {
    window.addEventListener("resize", updateMedia);
    return () => window.removeEventListener("resize", updateMedia);
  }, []);

  return (
    <>
      <GlobeHUD isDesktop={isDesktop} />
    </>
  )
}

export default App
