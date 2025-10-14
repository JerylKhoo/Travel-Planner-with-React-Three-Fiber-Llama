import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import Stars from '../Globe/Stars';
import './TripPlanner.css';

function useGoogleMaps(apiKey) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    if (window.google && window.google.maps) {
      setReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [apiKey]);

  return ready;
}

const formatDate = (date) => {
  if (!date) return '—';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '—';
  return value.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

export default function Itinerary({ trip, onBack, onExit }) {
  const mapsReady = useGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 1.3521, lng: 103.8198 },
      zoom: 9,
      disableDefaultUI: true
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !trip?.location) return;

    const { lat, lng } = trip.location.position;
    const position = { lat, lng };
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(9);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current
      });
    }

    markerRef.current.setPosition(position);
    markerRef.current.setTitle(trip.location.name ?? 'Trip destination');
  }, [mapsReady, trip]);

  const destinationName = trip?.location?.name ?? 'Destination';
  const startDate = formatDate(trip?.dateFrom);
  const endDate = formatDate(trip?.dateTo);
  const durationText = useMemo(() => {
    if (!trip?.dateFrom || !trip?.dateTo) return '—';
    const start = trip.dateFrom instanceof Date ? trip.dateFrom : new Date(trip.dateFrom);
    const end = trip.dateTo instanceof Date ? trip.dateTo : new Date(trip.dateTo);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const raw = Math.floor((end - start) / millisecondsPerDay) + 1;
    const diff = Math.max(1, raw);
    return `${diff} day${diff > 1 ? 's' : ''}`;
  }, [trip]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <Canvas
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        camera={{ position: [0, 0, 1] }}
      >
        <Stars />
      </Canvas>

      <div style={{ position: 'relative', display: 'flex', height: '100%', color: '#39ff41' }}>
        <section style={{ flexBasis: '16.666%', flexGrow: 0, flexShrink: 0, padding: '2rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px' }}></h2>
        </section>

        <section style={{ flexBasis: '50%', flexGrow: 0, flexShrink: 0, padding: '2rem', margin: '20px' }}>
          <h2 style={{ margin: 0, marginBottom: '1.5rem', fontFamily: 'monospace', letterSpacing: '2px', color: '#39ff41' }}>
            Trip Itinerary
          </h2>
          {trip ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'monospace' }}>
              <div>
                <span style={{ display: 'block', opacity: 0.8, letterSpacing: '2px' }}>Destination</span>
                <strong style={{ fontSize: '1.2rem' }}>{destinationName}</strong>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <span style={{ display: 'block', opacity: 0.8, letterSpacing: '2px' }}>From</span>
                  <strong>{startDate}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', opacity: 0.8, letterSpacing: '2px' }}>To</span>
                  <strong>{endDate}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', opacity: 0.8, letterSpacing: '2px' }}>Duration</span>
                  <strong>{durationText}</strong>
                </div>
              </div>
              <div style={{ opacity: 0.7 }}>
                <p>Use this space to outline daily activities, dining ideas, and must-see attractions for your trip.</p>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'monospace', opacity: 0.7 }}>No trip details available. Please create a trip first.</p>
          )}
        </section>

        <section style={{ flexBasis: '33.333%', flexGrow: 0, flexShrink: 0, padding: '2rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px' }}>Map</h2>
          <div ref={mapContainerRef} className="trip-map-container" />
        </section>
      </div>

      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', gap: '1rem' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
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
        {onExit && (
          <button
            onClick={onExit}
            style={{
              background: 'transparent',
              border: '1px solid #39ff41',
              color: '#39ff41',
              padding: '0.5rem 1rem',
              fontFamily: 'monospace',
              letterSpacing: '2px',
              cursor: 'pointer'
            }}
          >
            HOME
          </button>
        )}
      </div>
    </div>
  );
}
