import './App.css'
import GlobeHUD from './Components/ThreeCompiler.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import { useEffect, useState } from 'react';
import TripPlanner from './Components/Trips/TripPlanner.jsx';
import Itinerary from './Components/Trips/Itinerary.jsx';


function App() {
  const [isDesktop, setDesktop] = useState(window.innerWidth > 900);
  const [view, setView] = useState('globe');
  const [tripDetails, setTripDetails] = useState(null);

  const updateMedia = () => {
    setDesktop(window.innerWidth > 1450);
  };

  useEffect(() => {
    window.addEventListener("resize", updateMedia);
    return () => window.removeEventListener("resize", updateMedia);
  }, []);

  if (view === 'itinerary') {
    return (
      <Itinerary
        trip={tripDetails}
        onBack={() => setView('trip')}
        onExit={() => setView('globe')}
      />
    );
  }

  return view === 'trip'
    ? (
      <TripPlanner
        onBack={() => setView('globe')}
        onCreateItinerary={(details) => {
          setTripDetails(details);
          setView('itinerary');
        }}
      />
    )
    : <GlobeHUD isDesktop={isDesktop} onCreateTrip={() => setView('trip')} />;
}

export default App
