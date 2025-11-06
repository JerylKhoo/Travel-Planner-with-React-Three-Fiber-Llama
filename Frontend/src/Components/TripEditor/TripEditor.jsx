//addition 0 => added useEffect, useRef and useState
import React, {useEffect, useRef, useState, useMemo} from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import { supabase } from '../../Config/supabase';
//addition 9 => import css and Itinerary col//
import './TripEditor.css';
import ItineraryColumn from './ItineraryColumn.jsx';
import { buildItineraryDays, buildCompleteItineraryDays } from './ItineraryUtils.js';
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async`;
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

// Helper function to create custom numbered marker icon
function createNumberedMarkerIcon(number) {
  if (!window.google?.maps?.Point) return null;

  return {
    path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
    fillColor: '#0072ff',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 1.2,
    labelOrigin: new window.google.maps.Point(0, -28),
  };
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
  const markersRef = useRef([]);

  // Change this to whatever current trip data you'd like to focus on.
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [itineraryDays, setItineraryDays] = useState(() =>
  buildCompleteItineraryDays(selectedTrip)
  );

  // Track which day is selected for map markers (defaults to first day)
  const [selectedDay, setSelectedDay] = useState(null);

  // Track active tab (needs to be declared before useEffect that uses it)
  const [activeTab, setActiveTab] = useState('itinerary');
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
  const days = buildCompleteItineraryDays(selectedTrip);
  setItineraryDays(days);

  // Don't auto-select any day - let user click to select
  setSelectedDay(null);
  console.log('[MAP DEBUG] Itinerary loaded, no day selected initially');
  }, [selectedTrip]);

  // Clear selected day when switching tabs
  useEffect(() => {
    if (activeTab !== 'itinerary') {
      setSelectedDay(null);
      console.log('[MAP DEBUG] Cleared selected day when leaving itinerary tab');
    }
  }, [activeTab]);

  // Add state for day titles and stop notes, initialized from selectedTrip
  // Data is nested in itinerary_data
const [dayTitles, setDayTitles] = useState(() =>
  selectedTrip?.itinerary_data?.day_titles || {}
);
const [stopNotes, setStopNotes] = useState(() =>
  selectedTrip?.itinerary_data?.activity_notes || {}
);

// Save status state: 'saved', 'saving', or 'error'
const [saveStatus, setSaveStatus] = useState('saved');

// Update states when selectedTrip changes
useEffect(() => {
  const titles = selectedTrip?.itinerary_data?.day_titles || {};
  setDayTitles(titles);

  const notes = selectedTrip?.itinerary_data?.activity_notes || {};
  setStopNotes(notes);
}, [selectedTrip]);

// Unified auto-save function
const autoSave = async () => {
  if (!selectedTrip?.trip_id || selectedTrip.trip_id.startsWith('temp-')) {
    return; // Don't save temporary trips
  }

  setSaveStatus('saving');

  try {
    // Get current itinerary from state
    const currentItinerary = itineraryDays.flatMap(([dayKey, stops]) =>
      stops.map(stop => ({
        ...stop,
        date: dayKey,
      }))
    );

    // Build complete itinerary_data object from current state
    const updatedItineraryData = {
      destination: selectedTrip.itinerary_data?.destination,
      destination_lat: selectedTrip.itinerary_data?.destination_lat,
      destination_lng: selectedTrip.itinerary_data?.destination_lng,
      start_date: selectedTrip.itinerary_data?.start_date,
      end_date: selectedTrip.itinerary_data?.end_date,
      origin: selectedTrip.itinerary_data?.origin,
      budget: selectedTrip.itinerary_data?.budget,
      travelers: selectedTrip.itinerary_data?.travelers,
      remarks: selectedTrip.itinerary_data?.remarks,
      context: selectedTrip.itinerary_data?.context,
      tips: selectedTrip.itinerary_data?.tips,
      itinerary: currentItinerary,
      day_titles: dayTitles,
      activity_notes: stopNotes,
    };

    // Replace the entire itinerary_data in the database
    const { error } = await supabase
      .from('itineraries')
      .update({
        itinerary_data: updatedItineraryData
      })
      .eq('trip_id', selectedTrip.trip_id);

    if (error) {
      console.error('Error auto-saving itinerary:', error);
      setSaveStatus('error');
    } else {
      console.log('Itinerary auto-saved successfully');
      setSaveStatus('saved');
    }
  } catch (error) {
    console.error('Error in auto-save:', error);
    setSaveStatus('error');
  }
};

// Auto-save effect - triggers when itinerary data changes
useEffect(() => {
  // Skip auto-save on initial mount or when selectedTrip changes
  const hasData = itineraryDays.length > 0 || Object.keys(dayTitles).length > 0 || Object.keys(stopNotes).length > 0;

  if (hasData && selectedTrip?.trip_id && !selectedTrip.trip_id.startsWith('temp-')) {
    autoSave();
  }
}, [itineraryDays, dayTitles, stopNotes]); // eslint-disable-line react-hooks/exhaustive-deps

const handleUpdateDayTitle = (dayKey, title) => {
  setDayTitles((prev) => ({
    ...prev,
    [dayKey]: title,
  }));
  // Auto-save will be triggered by useEffect
};

const handleUpdateStopNote = (stopId, note) => {
  setStopNotes((prev) => ({
    ...prev,
    [stopId]: note,
  }));
  // Auto-save will be triggered by useEffect
};

// Handler for when user clicks on an activity - updates selected day for map markers
const handleActivityClick = (dayKey) => {
  setSelectedDay(dayKey);
};

  const handleReorderStop = (sourceDayKey, sourceIndex, targetDayKey, targetIndex) => {
    setItineraryDays((prev) => {
      const next = prev.map(([key, stops]) => [key, [...stops]]);
      const sourceEntry = next.find(([key]) => key === sourceDayKey);
      const targetEntry = next.find(([key]) => key === targetDayKey);

      if (!sourceEntry || !targetEntry) return prev;

      const [moved] = sourceEntry[1].splice(sourceIndex, 1);
      if (!moved) return prev;

      // Update the date of the moved stop if moving to a different day
      if (sourceDayKey !== targetDayKey) {
        moved.date = targetDayKey;
      }

      const insertIndex = Math.max(
        0,
        Math.min(targetIndex, targetEntry[1].length),
      );

      targetEntry[1].splice(insertIndex, 0, moved);

      return next;
    });
    // Auto-save will be triggered by useEffect
  };

  const handleAddStop = (dayKey, placeDetails) => {
  const newStop = {
    id: `stop-${Date.now()}`,
    date: dayKey,
    title: placeDetails.name,
    description: placeDetails.address || '',
    destination: placeDetails.name,
    startTime: placeDetails.startTime || '',
    endTime: placeDetails.endTime || '',
    image_url: placeDetails.photoUrl || '',
    location: placeDetails.location,
  };

  setItineraryDays((prev) => {
    return prev.map(([key, stops]) => {
      if (key !== dayKey) return [key, stops];
      return [key, [...stops, newStop]];
    });
  });
  // Auto-save will be triggered by useEffect
  };

  const handleRemoveStop = (dayKey, stopId) => {
  setItineraryDays((prev) => {
    return prev.map(([key, stops]) => {
      if (key !== dayKey) return [key, stops];
      return [key, stops.filter((stop) => stop.id !== stopId)];
    });
  });
  // Auto-save will be triggered by useEffect
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

    // Update the date of the dragged stop if moving to a different day
    if (sourceDayKey !== targetDayKey) {
      draggedStop.date = targetDayKey;
    }

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
  // Auto-save will be triggered by useEffect
};

  //addition 2 end//
  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;

  // Remember to set selected Trip
  //addition 3 start//
  useEffect(() => {
  console.log('[MAP DEBUG] useEffect triggered:', {
    activeTab,
    mapsReady,
    hasMapContainer: !!mapContainerRef.current,
    hasMapInstance: !!mapInstanceRef.current
  });

  // Only initialize if activeTab is itinerary (when map container is rendered)
  if (activeTab !== 'itinerary') {
    console.log('[MAP DEBUG] Not on itinerary tab, clearing map instance');
    // Clear map instance when leaving itinerary tab so it can be re-initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
      setMapInstance(null);
    }
    return;
  }

  if (!mapsReady) {
    console.log('[MAP DEBUG] Maps API not ready yet');
    return;
  }

  if (!mapContainerRef.current) {
    console.log('[MAP DEBUG] Map container ref not attached yet');
    return;
  }

  if (mapInstanceRef.current) {
    console.log('[MAP DEBUG] Map instance already exists');
    return;
  }

  // Check if Google Maps Map constructor is available
  if (!window.google?.maps?.Map) {
    console.error('Google Maps Map constructor not available yet');
    return;
  }

  console.log('[MAP DEBUG] Initializing map...');
  mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
    center: initialCenter,
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
  console.log('[MAP DEBUG] Map initialized successfully:', mapInstanceRef.current);
  setMapInstance(mapInstanceRef.current);
  }, [mapsReady, activeTab, selectedLocation]);

  //addition 3 end//

  //addition 5 start => set selected trip//
useEffect(() => {
  if (!mapsReady || !selectedTrip) {
    setSelectedLocation(null);
    return;
  }

  // Check for coordinates in nested itinerary_data structure first
  const destLat = selectedTrip.itinerary_data?.destination_lat || selectedTrip.destination_lat;
  const destLng = selectedTrip.itinerary_data?.destination_lng || selectedTrip.destination_lng;
  const destName = selectedTrip.itinerary_data?.destination || selectedTrip.destination;

  // If the trip already has coordinates, use them immediately
  if (destLat && destLng) {
    console.log('[MAP DEBUG] Using coordinates from trip data:', { destLat, destLng, destName });
    setSelectedLocation({
      position: {
        lat: destLat,
        lng: destLng,
      },
      name: destName || 'Trip Destination',
    });
    return;
  }

  // Fallback: geocode the destination string
  if (!destName) {
    setSelectedLocation(null);
    return;
  }

  // Check if Google Maps Geocoder is available
  if (!window.google?.maps?.Geocoder) {
    console.error('Google Maps Geocoder not available yet');
    setSelectedLocation(null);
    return;
  }

  const geocoder = new window.google.maps.Geocoder();
  geocoder.geocode({ address: destName }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const { lat, lng } = results[0].geometry.location;
      console.log('[MAP DEBUG] Geocoding successful:', { lat: lat(), lng: lng() });
      setSelectedLocation({
        position: { lat: lat(), lng: lng() },
        name: results[0].formatted_address || destName,
      });
    } else {
      console.error('[MAP DEBUG] Geocode failed:', status);
      setSelectedLocation(null);
    }
  });
  }, [mapsReady, selectedTrip]);
  //addition 5 end//
  //addition 4 start => zoom and marker//
  useEffect(() => {
    console.log('[MAP DEBUG] Markers useEffect triggered:', {
      activeTab,
      mapsReady,
      hasMapInstance: !!mapInstanceRef.current,
      selectedDay,
      itineraryDaysCount: itineraryDays.length
    });

    // Only run when on itinerary tab
    if (activeTab !== 'itinerary') {
      console.log('[MAP DEBUG] Not on itinerary tab, skipping markers update');
      return;
    }

    if (!mapsReady || !mapInstanceRef.current) {
      console.log('[MAP DEBUG] Markers: Maps not ready or no map instance');
      return;
    }

    // Check if Google Maps constructors are available
    if (!window.google?.maps?.LatLngBounds || !window.google?.maps?.Marker || !window.google?.maps?.InfoWindow) {
      console.error('Google Maps constructors not available yet');
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // If no day is selected, show the destination country/city on map
    if (!selectedDay) {
      console.log('[MAP DEBUG] No day selected, showing destination on map');
      if (selectedLocation) {
        mapInstanceRef.current.panTo(selectedLocation.position);
        mapInstanceRef.current.setZoom(9);
      }
      return;
    }

    // Find the selected day's stops
    const selectedDayData = itineraryDays.find(([dayKey]) => dayKey === selectedDay);
    if (!selectedDayData) {
      console.log('[MAP DEBUG] Selected day data not found:', selectedDay);
      return;
    }

    const [, stops] = selectedDayData;
    console.log('[MAP DEBUG] Creating markers for day:', selectedDay, 'stops:', stops.length);

    // Collect all bounds to fit map view
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Create markers only for the selected day's stops
    stops.forEach((stop, index) => {
      // Only create marker if location exists
      if (!stop.location || !stop.location.lat || !stop.location.lng) {
        console.log('[MAP DEBUG] Stop missing location:', stop.title);
        return;
      }
      console.log('[MAP DEBUG] Creating marker for:', stop.title, stop.location);

      const position = {
        lat: stop.location.lat,
        lng: stop.location.lng,
      };

      // Create numbered marker
      const marker = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: position,
        title: `${stop.title} (Stop ${index + 1})`,
        icon: createNumberedMarkerIcon(index + 1),
          label: {
            text: String(index + 1),
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
          },
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window on click
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px;">${stop.title}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">
                ${stop.startTime || ''} ${stop.endTime ? `- ${stop.endTime}` : ''}
              </p>
              ${stop.description ? `<p style="margin: 4px 0 0 0; font-size: 12px;">${stop.description}</p>` : ''}
            </div>
          `,
        });

        marker.addListener('click', () => {
          // Close all other info windows
          markersRef.current.forEach(m => {
            if (m.infoWindow) m.infoWindow.close();
          });
          infoWindow.open(mapInstanceRef.current, marker);
        });

        // Store info window reference
        marker.infoWindow = infoWindow;

        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidMarkers = true;
    });

    // Fit map to show all markers
    if (hasValidMarkers) {
      console.log('[MAP DEBUG] Fitting bounds to show', markersRef.current.length, 'markers');
      mapInstanceRef.current.fitBounds(bounds);

      // Prevent zooming in too much for single marker
      const listener = window.google.maps.event.addListenerOnce(
        mapInstanceRef.current,
        'bounds_changed',
        () => {
          if (mapInstanceRef.current.getZoom() > 15) {
            mapInstanceRef.current.setZoom(15);
          }
        }
      );
    } else if (selectedLocation) {
      // No markers with valid locations, fall back to trip destination
      mapInstanceRef.current.panTo(selectedLocation.position);
      mapInstanceRef.current.setZoom(9);
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        if (marker.infoWindow) marker.infoWindow.close();
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [mapsReady, itineraryDays, selectedLocation, selectedDay, activeTab]);

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
      <div className="trip-editor-wrapper">
        {/* Tab Navigation Row */}
        <div className="trip-editor-tabs">
          <button
            className={`trip-editor-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            Itinerary
          </button>

          {/* Only show Flights tab if itinerary has been created */}
          {(() => {
            // Check if trip has valid itinerary data
            const hasValidItinerary = selectedTrip?.itinerary_data?.itinerary &&
                                     Array.isArray(selectedTrip.itinerary_data.itinerary) &&
                                     selectedTrip.itinerary_data.itinerary.length > 0;

            const hasOrigin = selectedTrip?.itinerary_data?.origin &&
                            String(selectedTrip.itinerary_data.origin).trim().length > 0;

            const hasDestination = selectedTrip?.itinerary_data?.destination &&
                                  String(selectedTrip.itinerary_data.destination).trim().length > 0;

            const hasStartDate = selectedTrip?.itinerary_data?.start_date &&
                               String(selectedTrip.itinerary_data.start_date).trim().length > 0;

            const hasEndDate = selectedTrip?.itinerary_data?.end_date &&
                              String(selectedTrip.itinerary_data.end_date).trim().length > 0;

            const shouldShowFlightsTab = hasValidItinerary && hasOrigin && hasDestination &&
                                        hasStartDate && hasEndDate;

            return shouldShowFlightsTab ? (
              <button
                className={`trip-editor-tab ${activeTab === 'flights' ? 'active' : ''}`}
                onClick={() => setActiveTab('flights')}
              >
                Flights
              </button>
            ) : null;
          })()}

          <button
            className={`trip-editor-tab ${activeTab === 'hotels' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotels')}
          >
            Hotels
          </button>
        </div>

        <div className={`trip-editor-layout ${activeTab === 'hotels' || activeTab === 'flights' ? 'trip-editor-layout--merged' : ''}`}>
          {activeTab === 'itinerary' && (
            <aside className="trip-editor-nav">
              <header className="trip-editor-header"></header>
              <ItineraryNav itineraryDays={itineraryDays} selectedTrip={selectedTrip} />
            </aside>
          )}

          <section className="trip-editor-itinerary">
            <header className="trip-editor-header"></header>
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
              dayTitles={dayTitles}
              stopNotes={stopNotes}
              onUpdateDayTitle={handleUpdateDayTitle}
              onUpdateStopNote={handleUpdateStopNote}
              saveStatus={saveStatus}
              onActivityClick={handleActivityClick}
              selectedDay={selectedDay}
              activeTab={activeTab}
            />
            {/* additon 7 end*/}
          </section>

          {activeTab === 'itinerary' && (
            <section className="trip-editor-map">
              {!mapsReady ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#39ff41',
                  fontSize: '16px',
                  fontFamily: 'monospace'
                }}>
                  Loading map...
                  {console.log('[MAP DEBUG] Rendering loading state')}
                </div>
              ) : (
                <div className="trip-editor-map-inner">
                  {console.log('[MAP DEBUG] Rendering map container, mapsReady:', mapsReady)}
                  <div
                    ref={(el) => {
                      mapContainerRef.current = el;
                      // Trigger map initialization when ref is attached
                      if (el && !mapInstanceRef.current && mapsReady && activeTab === 'itinerary') {
                        // Check if Google Maps Map constructor is available
                        if (!window.google?.maps?.Map) {
                          console.error('Google Maps Map constructor not available yet');
                          return;
                        }
                        console.log('[MAP DEBUG] Ref attached, initializing map now...');
                        mapInstanceRef.current = new window.google.maps.Map(el, {
                          center: initialCenter,
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
                        console.log('[MAP DEBUG] Map initialized in callback:', mapInstanceRef.current);
                        setMapInstance(mapInstanceRef.current);
                      }
                    }}
                    className="trip-editor-map-canvas"
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {/* addition 8 end */}
    </Html>
  )
};

export default TripEditor;