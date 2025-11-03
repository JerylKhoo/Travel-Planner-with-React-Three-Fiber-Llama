//addition 0 => added useEffect, useRef and useState
import React, {useEffect, useRef, useState, useMemo} from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
//addition 9 => import css and Itinerary col//
import './TripEditor.css';
import ItineraryColumn from './ItineraryColumn.jsx';
import { buildItineraryDays } from './ItineraryUtils.js';
import ItineraryNav from './ItineraryNav.jsx';
//addition 9 end


//addition 1 start//
//copy useGoogleMaps function from TripPlanner
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
//addition 1 end//
function TripEditor() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);
    //addition 2 start//
  const mapsReady = useGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Change this to whatever current trip data you’d like to focus on.
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [itineraryDays, setItineraryDays] = useState(() =>
    buildItineraryDays(selectedTrip)
  );

  useEffect(() => {
    setItineraryDays(buildItineraryDays(selectedTrip));
  }, [selectedTrip]);
  const handleReorderStop = (sourceDayKey, sourceIndex, targetDayKey, targetIndex) => {
    setItineraryDays((prev) => {
      const next = prev.map(([key, stops]) => [key, [...stops]]);
      const sourceEntry = next.find(([key]) => key === sourceDayKey);
      const targetEntry = next.find(([key]) => key === targetDayKey);

      if (!sourceEntry || !targetEntry) return prev;

      const [moved] = sourceEntry[1].splice(sourceIndex, 1);
      if (!moved) return prev;

      const insertIndex = Math.max(
      0,
      Math.min(targetIndex, targetEntry[1].length),
      );

      targetEntry[1].splice(insertIndex, 0, moved);
      return next;
    });
  };

  const handleAddStop = (dayKey, placeDetails) => {
  setItineraryDays((prev) => {
    return prev.map(([key, stops]) => {
      if (key !== dayKey) return [key, stops];

      const newStop = {
        id: `stop-${Date.now()}`,
        date: key,
        title: placeDetails.name,
        description: placeDetails.address || '',
        destination: placeDetails.name,
        startTime: placeDetails.startTime || '',
        endTime: placeDetails.endTime || '',
        image_url: placeDetails.photoUrl || '',
        location: placeDetails.location,
      };

      return [key, [...stops, newStop]];
    });
  });
  };

  const handleRemoveStop = (dayKey, stopId) => {
  setItineraryDays((prev) =>
    prev.map(([key, stops]) => {
      if (key !== dayKey) return [key, stops];
      return [key, stops.filter((stop) => stop.id !== stopId)];
    }),
  );
  };


  const handleSwapStops = (
  sourceDayKey, 
  sourceIndex, 
  sourceStopId,
  targetDayKey, 
  targetIndex, 
  targetStopId
) => {
  setItineraryDays((prev) => {
    const next = prev.map(([key, stops]) => [key, [...stops]]);
    
    const sourceEntry = next.find(([key]) => key === sourceDayKey);
    const targetEntry = next.find(([key]) => key === targetDayKey);
    
    if (!sourceEntry || !targetEntry) return prev;
    
    // Get the dragged item
    const [draggedStop] = sourceEntry[1].splice(sourceIndex, 1);
    if (!draggedStop) return prev;
    
    // If dropping on a specific stop (not a dropzone), adjust targetIndex
    let insertIndex = targetIndex;
    if (targetStopId && sourceDayKey === targetDayKey) {
      // Same day: if we removed an item before the target, adjust index
      if (sourceIndex < targetIndex) {
        insertIndex = targetIndex - 1;
      }
    }
    
    // Insert the dragged item at the target position
    targetEntry[1].splice(insertIndex, 0, draggedStop);
    
    return next;
  });
};

  const [mapInstance, setMapInstance] = useState(null);
  //addition 2 end//
  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;

  // Remember to set selected Trip 
  //addition 3 start//
  useEffect(() => {
  if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

  mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
    center: { lat: 1.3521, lng: 103.8198 }, // default center (Singapore)
    zoom: 9,
    disableDefaultUI: true,
    styles: [
      { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#39ff41' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#636363' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#383838' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'water', elementType: '', stylers: [{ color: '#141414' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'all', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'administrative.country', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'administrative.province', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'road', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },
    ],
  });
  setMapInstance(mapInstanceRef.current);
  }, [mapsReady]);

  //addition 3 end//

  //addition 5 start => set selected trip//
useEffect(() => {
  if (!mapsReady || !selectedTrip) {
    setSelectedLocation(null);
    return;
  }

  // If the trip already has coordinates, use them immediately
  if (selectedTrip.destination_lat && selectedTrip.destination_lng) {
    setSelectedLocation({
      position: {
        lat: selectedTrip.destination_lat,
        lng: selectedTrip.destination_lng,
      },
      name: selectedTrip.destination || 'Trip Destination',
    });
    return;
  }

  // Fallback: geocode the destination string
  const destinationName = selectedTrip.destination;
  if (!destinationName) {
    setSelectedLocation(null);
    return;
  }

  const geocoder = new window.google.maps.Geocoder();
  geocoder.geocode({ address: destinationName }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const { lat, lng } = results[0].geometry.location;
      setSelectedLocation({
        position: { lat: lat(), lng: lng() },
        name: results[0].formatted_address || destinationName,
      });
    } else {
      console.error('Geocode failed:', status);
      setSelectedLocation(null);
    }
  });
  }, [mapsReady, selectedTrip]);
  //addition 5 end//
  //addition 6 start//
  useEffect(() => {
  if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

  mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
    center: { lat: 1.3521, lng: 103.8198 },
    zoom: 9,
    disableDefaultUI: true,
    styles: [
      { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#39ff41' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#636363' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#383838' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'water', elementType: '', stylers: [{ color: '#141414' }, { visibility: 'on' }, { saturation: 0 }] },
      { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'all', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'administrative.country', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'administrative.province', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'road', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
      { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },
    ],
    });
    }, [mapsReady]);
  //addition 6 end//
    //addition 4 start => zoom and marker//
  useEffect(() => {
  if (!mapsReady || !mapInstanceRef.current || !selectedLocation) return;

  const { position, name } = selectedLocation;

  mapInstanceRef.current.panTo(position);
  mapInstanceRef.current.setZoom(9);

  if (!markerRef.current) {
    markerRef.current = new window.google.maps.Marker({
      map: mapInstanceRef.current,
    });
  }

  markerRef.current.setPosition(position);
  markerRef.current.setTitle(name);
  }, [mapsReady, selectedLocation]);

  //addition 4 end//

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
      {/* PUT YOUR TRIPS PLANNER PORTION HERE */}
      {/* I have added userId, userEmail for you to call the supabase to get the trips*/}
      {/* addition 8 start => columns */}
      <div className="trip-editor-layout">
        <aside className="trip-editor-nav">
          <header className="trip-editor-header">NavBar</header>
          {/* addition 11 start */}
          <ItineraryNav itineraryDays={itineraryDays} />
          {/* addition 11 end */}
          {/* nav content goes here later */}
        </aside>

        <section className="trip-editor-itinerary">
          <header className="trip-editor-header">Itinerary</header>
          {/* additon 7 start*/}
          <ItineraryColumn 
            itineraryDays={itineraryDays}
            selectedTrip={selectedTrip}
            mapInstance={mapInstance}
            mapsReady={mapsReady}
            onReorderStop={handleReorderStop}
            onSwapStops={handleSwapStops}
            onAddStop={handleAddStop}
            onRemoveStop={handleRemoveStop}
          />
          {/* additon 7 end*/}
        </section>

        <section className="trip-editor-map">
          {!mapsReady && (
            <div className='text-white mt-4'>Loading map…</div>
          )}
          <div className="trip-editor-map-inner">
            <div ref={mapContainerRef} className="trip-editor-map-canvas" />
          </div>
        </section>
      </div>
      {/* addition 8 end */}
    </Html>
  )
};

export default TripEditor;