import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Stars from '../Globe/Stars';
import './TripPlanner.css';


//Load Google Maps API
function useGoogleMaps(apiKey) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    if (window.google && window.google.maps) {
      setReady(true);
      return;
    }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.onload = () => setReady(true);
  document.head.appendChild(script);

  return () => document.head.removeChild(script);
  }, [apiKey]);

  return ready;
}
// Search bar autocomplete suggestion
const TripSearch = ({ onSelectSuggestion }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = (input) => {
    if (!window.google?.maps?.places || !input) {
      setSuggestions([]);
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();
    setLoading(true);
    service.getPlacePredictions(
      { input, types: ['(cities)'] },            // adjust filters as needed
      (predictions = [], status) => {
        setLoading(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          setSuggestions([]);
          return;
        }
        setSuggestions(predictions);
      }
    );
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  return (
    <div style={{ color: '#fff', fontFamily: 'monospace' }}>
      <h2 style={{ margin: 0, marginBottom: '1rem', fontFamily: 'monospace', letterSpacing: '2px', color: '#39ff41' }}>
        Trip Itinerary
      </h2>
      <input
        value={query}
        onChange={handleChange}
        placeholder="Search for a city or attraction"
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '4px',
          border: '1px solid #39ff41',
          background: 'rgba(0, 0, 0, 0.6)',
          color: '#39ff41',
          fontFamily: 'inherit'
        }}
      />
      {loading && <p style={{ marginTop: '0.75rem' }}>Loading…</p>}
      {!loading && suggestions.length > 0 && (
        <ul style={{ marginTop: '0.75rem', listStyle: 'none', padding: 0 }}>
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => {
                setQuery(item.description);
                setSuggestions([]);
                onSelectSuggestion?.(item);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(57, 255, 65, 0.2)'
              }}
            >
              {item.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

//Structure of the page
export default function TripPlanner({ onBack }) {
  const mapsReady = useGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 1.3521, lng: 103.8198 }, // Singapore as default
      zoom: 3,
      disableDefaultUI: true
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !selectedLocation || !mapInstanceRef.current) return;

    const position = selectedLocation.position;
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(11);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current
      });
    }

    markerRef.current.setPosition(position);
    markerRef.current.setTitle(selectedLocation.name);
  }, [mapsReady, selectedLocation]);

  const handlePlaceSelected = (prediction) => {
    if (!window.google?.maps?.places) return;
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));

    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'geometry']
      },
      (result, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          result?.geometry?.location
        ) {
          setSelectedLocation({
            name: result.name,
            position: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            }
          });
        }
      }
    );
  };

  const handleCreateTrip = () => {
    console.log('Creating trip with:', {
      startDate: dateFrom,
      endDate: dateTo,
      location: selectedLocation
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <Canvas
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        camera={{ position: [0, 0, 1] }}
      >
        <Stars />
      </Canvas>

      <div style={{ position: 'relative', display: 'flex', height: '100%', color: '#39ff41' }}>
        <section style={{ flexBasis: '10%', flexGrow: 0, flexShrink: 0, padding: '2rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px' }}></h2>
        </section>
        {/* Middle column */}
        {/* Search Bar */}
        <section style={{ flexBasis: '50%', flexGrow: 0, flexShrink: 0, padding: '2rem', margin: "20px"}}>
          {mapsReady ? (
            <>
            <TripSearch onSelectSuggestion={handlePlaceSelected} />
            {/* Date Select */}
            <div style={{ marginTop: '2rem', color: '#39ff41', fontFamily: 'monospace' }}>
              <h3 style={{ marginBottom: '1rem', letterSpacing: '2px' }}>Trip Dates</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span>From</span>
                  <DatePicker
                    selected={dateFrom}
                    onChange={(date) => {
                      setDateFrom(date);
                      if (date && dateTo && date > dateTo) setDateTo(null);
                    }}
                    selectsStart
                    startDate={dateFrom}
                    endDate={dateTo}
                    maxDate={dateTo ?? undefined}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Select start date"
                    className="trip-date-input"
                    calendarClassName="trip-date-calendar"
                    popperPlacement="bottom-start"
                    showPopperArrow={false}
                    isClearable
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span>To</span>
                  <DatePicker
                    selected={dateTo}
                    onChange={(date) => setDateTo(date)}
                    selectsEnd
                    startDate={dateFrom}
                    endDate={dateTo}
                    minDate={dateFrom ?? undefined}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Select end date"
                    className="trip-date-input"
                    calendarClassName="trip-date-calendar"
                    popperPlacement="bottom-start"
                    showPopperArrow={false}
                    isClearable
                    disabled={!dateFrom}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleCreateTrip}
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid #39ff41',
                  color: '#39ff41',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Create Trip
              </button>
            </div>
          </>
          ) : (
              <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px' }}>
              Loading Maps…
            </h2>
            )}
        </section>

        <section style={{ flexBasis: '40%', flexGrow: 0, flexShrink: 0, padding: '2rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px' }}>Map</h2>
          <div ref={mapContainerRef} className="trip-map-container" />
        </section>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            background: 'transparent',
            border: '1px solid #39ff41',
            color: '#39ff41',
            padding: '0.5rem 1rem',
            fontFamily: 'monospace',
            letterSpacing: '2px',
            cursor: 'pointer'
          }}
        >
          BACK
        </button>
      )}
    </div>
  );
}
