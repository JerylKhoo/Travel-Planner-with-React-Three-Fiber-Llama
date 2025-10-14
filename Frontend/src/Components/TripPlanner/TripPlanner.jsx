import React, { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import Button from '@mui/material/Button';
import axios from 'axios';

function useGoogleMaps(apiKey) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setReady(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script is already loading, wait for the global callback
      const checkReady = setInterval(() => {
        if (window.google && window.google.maps) {
          setReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      return () => clearInterval(checkReady);
    }

    // Create a global callback that persists
    if (!window.initGoogleMaps) {
      window.initGoogleMaps = () => {
        // Callback will be called by Google Maps when ready
      };
    }

    // Set up a check interval to detect when maps is ready
    const checkReady = setInterval(() => {
      if (window.google && window.google.maps) {
        setReady(true);
        clearInterval(checkReady);
      }
    }, 100);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      clearInterval(checkReady);
    };
    document.head.appendChild(script);

    // Cleanup interval on unmount
    return () => {
      clearInterval(checkReady);
    };
  }, [apiKey]);

  return ready;
}


function TripPlanner() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);

  const mapsReady = useGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [budget, setBudget] = useState(2500);
  const [pax, setPax] = useState(1);
  const selectedCity = useStore((state) => state.selectedCity);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const searchInitializedRef = useRef(false);

  // Initialize selectedLocation from selectedCity when it changes
  useEffect(() => {
    if (selectedCity) {
      setSelectedLocation(selectedCity);
    }
  }, [selectedCity]);

  // Initialize the search autocomplete elements when Google Maps is ready
  useEffect(() => {
    async function initSearch() {
      if (!mapsReady || searchInitializedRef.current) return;

      const originSearchElement = document.getElementById("origin-search");
      const destinationSearchElement = document.getElementById("destination-search");

      if (!originSearchElement || !destinationSearchElement) return;

      try {
        // Request needed libraries
        await google.maps.importLibrary("places");

        // Create the ORIGIN place autocomplete element
        const originAutocomplete = new google.maps.places.PlaceAutocompleteElement({
          includedPrimaryTypes: ['country', 'locality'],
        });

        originSearchElement.appendChild(originAutocomplete);

        // Add the gmp-placeselect listener for ORIGIN
        originAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

          setOrigin(place.Dg.displayName);
        });

        // Create the DESTINATION place autocomplete element
        const destinationAutocomplete = new google.maps.places.PlaceAutocompleteElement({
          includedPrimaryTypes: ['country', 'locality'],
        });

        destinationSearchElement.appendChild(destinationAutocomplete);

        // Add the gmp-placeselect listener for DESTINATION
        destinationAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

          const newLocation = {
            position: {
              lat: place.Dg.location.lat,
              lon: place.Dg.location.lng
            },
            name: place.Dg.displayName
          };

          setSelectedLocation(newLocation);
        });

        searchInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize search:', error);
      }
    }

    initSearch();
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 1.3521, lng: 103.8198 }, // Singapore as default
      zoom: 9,
      disableDefaultUI: true
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !selectedLocation || !mapInstanceRef.current) return;

    const position = selectedLocation.position;
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(9);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current
      });
    }

    markerRef.current.setPosition(position);
    markerRef.current.setTitle(selectedLocation.name);
  }, [mapsReady, selectedLocation]);

  const handleCreateTrip = () => {
    if (!selectedLocation || !dateFrom || !dateTo || !origin) {
      alert('Please choose a destination and both start/end dates before creating your trip.');
      return;
    }


  };

  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550; 

  const increment = () => {
    if (pax < 11) {
      setPax(pax + 1);
    }
  };

  const decrement = () => {
    if (pax > 1) {
      setPax(pax - 1);
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
      <div className="flex flex-col gap-3 mb-6">
        <div className='grid grid-cols-10 gap-3'>
          {/* Left column - Inputs section (60% width) */}
          <div className='col-span-6 flex flex-col gap-3'>
            {/* Origin & Destination row */}
            <div className='grid grid-cols-2 gap-3 mx-4 mt-4'>
              <div>
                <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Origin Country/City</label>
                <div id='origin-search' />
              </div>
              <div>
                <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Destination Country/City</label>
                <div id='destination-search' />
              </div>
            </div>
            
            {/* Additional inputs below */}
            <div className='grid grid-cols-2 gap-3 mx-4'>
              <div>
                <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Start Date</label>
                <input type="date" className="w-full p-2 border border-[#39ff41] bg-transparent text-white rounded text-xs" style={{ fontSize: '12px' }} />
              </div>
              <div>
                <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">End Date</label>
                <input type="date" className="w-full p-2 border border-[#39ff41] bg-transparent text-white rounded" style={{ fontSize: '12px' }} />
              </div>
            </div>
            
            {/* More inputs can go here */}
            <div className='mx-4'>
              <label className="block text-xs text-[#39ff41] font-mono">Budget: ${budget}</label>
              <Box>
                <Slider
                  sx={{color: '#39ff41'}}
                  value={budget}
                  onChange={(event, newValue) => setBudget(newValue)}
                  aria-label="Small"
                  valueLabelDisplay="auto"
                  min={500}
                  max={7000}
                />
              </Box>
            </div>

            <div className='mx-4'>
              <div className='grid grid-cols-10 gap-2'>
                <div className='flex flex-col items-center col-span-4'>
                  <label className="mb-2 text-xs text-[#39ff41] font-mono">Number of Travellers: {pax < 11 ? pax : '10+'}</label>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <IconButton sx={{color: '#39ff41'}} onClick={increment}>
                      <AddCircleIcon />
                    </IconButton>
                    <IconButton sx={{color: '#39ff41'}} onClick={decrement}>
                      <RemoveCircleIcon />
                    </IconButton>
                  </Stack>
                </div>
                <div className='flex col-span-6 items-center justify-center text-mono text-md text-[##39ff41]'>
                  <img src={`/travellers/${pax}.png`} alt={`${pax} travellers`} />
                </div>
              </div>
            </div>

            <div className='mx-4'>
              <label className="block mb-2 text-xs text-[#39ff41] font-mono">Additional Preferences</label>
              <textarea className="w-full p-2 border border-[#39ff41] bg-transparent text-white rounded h-17" style={{ fontSize: '12px' }} />
            </div>

            <div className='flex align-center justify-center'>
              <Button
                variant="outlined"
                size="medium"
                sx={{
                  color: '#39ff41',
                  borderColor: '#39ff41',
                  '&:hover': {
                    borderColor: '#39ff41',
                    backgroundColor: 'rgba(57, 255, 65, 0.1)',
                  },
                }}
                onClick={handleCreateTrip}
              >
                Create Itinerary
              </Button>
            </div>
          </div>
          
          {/* Right column - Map section (40% width) */}
          <div className='col-span-4'>
            <div className="h-full min-h-[400px] border border-[#39ff41] rounded-lg flex items-center justify-center bg-gray-900">
              {/* Your map component will go here */}
              <span className="text-[#39ff41] font-mono">Map Component</span>
            </div>
          </div>
        </div>
      </div>
    </Html>
  )
};

export default TripPlanner;