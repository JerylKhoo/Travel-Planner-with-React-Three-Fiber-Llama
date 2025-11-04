import React, { useEffect, useRef, useState } from 'react';
// import axios from 'axios';
import {
  formatDateLabel,
  makeDaySectionId,
} from './ItineraryUtils';
import './ItineraryColumn.css';

const fallbackImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=60';


export default function ItineraryColumn({ itineraryDays, selectedTrip, mapInstance, mapsReady, onReorderStop, onSwapStops, onAddStop, onRemoveStop, dayTitles, stopNotes, onUpdateDayTitle, onUpdateStopNote }) {
    const [placePhotos, setPlacePhotos] = useState({});
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const placesServiceRef = useRef(null);
    //for drag and drop, search place start
    const dragStateRef = useRef(null);
    const [draggingStopId, setDraggingStopId] = useState(null);
    const [addingForDay, setAddingForDay] = useState(null);
    const [dragOverZone, setDragOverZone] = useState(null); // Track which dropzone is being hovered
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const autocompleteServiceRef = useRef(null);
    const handleDragStart = (dayKey, index, stopId) => (event) => {
        dragStateRef.current = { dayKey, index, stopId};
        setDraggingStopId(stopId);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (dayKey, index) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverZone(`${dayKey}-${index}`); // Set hover state
};

    const handleDrop = (targetDayKey, targetIndex,targetStopId) => (event) => {
        event.preventDefault();
        const dragState = dragStateRef.current;
        if (!dragState) return;

        // Don't do anything if dropping on the same item
        if (dragState.stopId === targetStopId) {
            dragStateRef.current = null;
            setDraggingStopId(null);
            return;
        }
        
        // Call the swap function instead of reorder
        onSwapStops?.(
            dragState.dayKey,
            dragState.index,
            dragState.stopId,
            targetDayKey,
            targetIndex,
            targetStopId
        );
        
        dragStateRef.current = null;
        setDraggingStopId(null);
        setDragOverZone(null); // Clear hover state
        };

    const handleDragEnd = () => {
    dragStateRef.current = null;
    setDraggingStopId(null);
    setDragOverZone(null); // Clear hover state
    };

    const handleDragLeave = () => {
    setDragOverZone(null);
    };

    const openAddPlace = (dayKey) => {
        setAddingForDay(dayKey);
        setSearchQuery('');
        setSuggestions([]);
    };

    const cancelAddPlace = () => {
        setAddingForDay(null);
        setSearchQuery('');
        setSuggestions([]);
    };

    const handleSearchChange = (event, dayKey) => {
    const value = event.target.value;
    setSearchQuery(value);

    if (!autocompleteServiceRef.current || !value.trim()) {
        setSuggestions([]);
        return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
        {
        input: value,
        types: ['establishment', 'geocode'],
        },
        (predictions) => {
            setSuggestions(predictions || []);
        },
    );
    };

    const handleSelectSuggestion = (dayKey, prediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
        {
            placeId: prediction.place_id,
            fields: ['name', 'formatted_address', 'geometry', 'photos'],
        },
        (details, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !details) {
            return;
        }

        const photoUrl =
            details.photos && details.photos.length
                ? details.photos[0].getUrl({ maxWidth: 600, maxHeight: 400 })
                : '';

        onAddStop?.(dayKey, {
            name: details.name,
            address: details.formatted_address,
            location: {
                lat: details.geometry?.location?.lat?.() ?? null,
                lng: details.geometry?.location?.lng?.() ?? null,
            },
            photoUrl,
        });

        cancelAddPlace();
        },
    );
    };


    //for drag and drop end

      // Temporary structure; replace with selectedTrip.itinerary
    // const itineraryDays = useMemo(() => {
    //     if (selectedTrip?.itinerary?.length) {
    //         return groupStopsByDay(selectedTrip.itinerary);
    //     }
    // // fallback example data if trip has no itinerary yet
    //     return groupStopsByDay([
    //     {
    //         id: 'demo-1',
    //         date: '2024-12-22',
    //         title: 'Cu Chi Tunnel',
    //         description:
    //         'Open 7:00–17:00 • Sprawling underground tunnel complex used by Viet Cong soldiers, plus exhibits & war memorials.',
    //         destination: 'Cu Chi Tunnel',
    //         startTime: '09:00',
    //         endTime: '11:30',
    //     },
    //     {
    //         id: 'demo-2',
    //         date: '2024-12-22',
    //         title: 'Cao Dai Temple of Phu Hoa Dong',
    //         description: 'Add notes, links, etc. here.',
    //         destination: 'Cao Dai Temple of Phu Hoa Dong',
    //         startTime: '12:30',
    //         endTime: '14:00',
    //     },
    //     {
    //         id: 'demo-3',
    //         date: '2024-12-23',
    //         title: 'War Remnants Museum',
    //         description:
    //         'Museum containing exhibits relating to the Vietnam War and the first Indochina War involving the French colonialists.',
    //         destination: 'War Remnants Museum',
    //         startTime: '10:00',
    //         endTime: '12:30',
    //     },
    //     ]);
    // }, [selectedTrip]);
    useEffect(() => {
        if (!mapsReady || !mapInstance || placesServiceRef.current) return;

        placesServiceRef.current = new window.google.maps.places.PlacesService(mapInstance);
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }, [mapsReady, mapInstance]);
    useEffect(() => {
  let ignore = false;

  async function fetchPhotos() {
    if (!placesServiceRef.current) return;

    setLoadingPlaces(true);
    const stops = itineraryDays.flatMap(([, dayStops]) => dayStops);

    const requests = stops.map(
      (stop) =>
        new Promise((resolve) => {
          if (!stop.destination) return resolve();

          const request = {
            query: stop.destination,
            fields: ['photos', 'name'],
          };

          placesServiceRef.current.findPlaceFromQuery(request, (results, status) => {
            if (ignore) return resolve();

            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results[0]?.photos?.length
            ) {
              const photoUrl = results[0].photos[0].getUrl({
                maxWidth: 600,
                maxHeight: 400,
              });
              setPlacePhotos((prev) => ({
                ...prev,
                [stop.destination]: photoUrl,
              }));
            } else {
              setPlacePhotos((prev) => ({
                ...prev,
                [stop.destination]: fallbackImage,
              }));
            }
            resolve();
          });
        }),
    );

    await Promise.all(requests);
    if (!ignore) setLoadingPlaces(false);
  }

  if (itineraryDays.length > 0 && placesServiceRef.current) {
    fetchPhotos();
  }

  return () => {
    ignore = true;
  };
}, [itineraryDays, mapsReady, mapInstance]);

  return (
    <div className="itinerary-column">
      <header className="itinerary-column__header">
        <div className="itinerary-column__heading-group">
          <h2>Itinerary</h2>
          {selectedTrip?.start_date && selectedTrip?.end_date && (
            <span className="itinerary-column__date-range">
              {selectedTrip.start_date} – {selectedTrip.end_date}
            </span>
          )}
        </div>
        <button className="itinerary-column__share">Share</button>
      </header>

      <div className="itinerary-column__content">
        {loadingPlaces && (
          <div className="itinerary-column__loading">Loading places…</div>
        )}

        {itineraryDays.map(([day, stops]) => {
  const sectionId = makeDaySectionId(day);

  return (
    <section id={sectionId} key={day} className="itinerary-day">
        <div className="itinerary-day__header">
            <h3>{formatDateLabel(day)}</h3>
            {stops.length === 0 && (
                <span className="itinerary-day__empty-hint">No activities planned</span>
            )}
            <button className="itinerary-day__add">Add subheading</button>
        </div>
        
        {/* Day Title Input */}
        <div className="itinerary-day__title-input">
            <input
            type="text"
            placeholder="Add a title for this day..."
            value={dayTitles[day] || ''}
            onChange={(e) => onUpdateDayTitle?.(day, e.target.value)}
            className="day-title-input"
            />
        </div>
        {/* Budget Display */}
        {selectedTrip?.budget && (
            <div className="itinerary-day__budget">
            <span className="budget-label">Trip Budget:</span>
            <span className="budget-amount">${selectedTrip.budget}</span>
            </div>
        )}
{stops.map((stop, index) => {
  const photo =
    placePhotos[stop.destination] ??
    (stop.image_url || fallbackImage);
  const isDragging = draggingStopId === stop.id;
  return (
    <React.Fragment key={stop.id}>
      {/* Dropzone above each activity */}
      <div
        className={`itinerary-day__dropzone ${dragOverZone === `${day}-${index}` ? 'itinerary-day__dropzone--active' : ''}`}
        onDragOver={handleDragOver(day, index)}
        onDrop={handleDrop(day, index)}
        onDragLeave={handleDragLeave}
      />
      
      <article 
        className={`itinerary-stop${isDragging ? ' itinerary-stop--dragging' : ''}`}
        draggable
        onDragStart={handleDragStart(day, index, stop.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="itinerary-stop__index">{index + 1}</div>
        <div className="itinerary-stop__details">
          <header>
            <h4>{stop.title}</h4>
            <p className="itinerary-stop__time">
              {stop.startTime} – {stop.endTime}
            </p>
          </header>
          <p className="itinerary-stop__description">
            {stop.description || 'Add notes, links, etc. here.'}
          </p>
        </div>
        <figure className="itinerary-stop__photo">
          <img src={photo} alt={stop.destination} loading="lazy" />
        </figure>
        <button
          type="button"
          className="itinerary-stop__delete"
          onClick={() => onRemoveStop?.(day, stop.id)}
        >
          Delete
        </button>
      </article>
      
      {/* Notes Input Below Activity */}
      <div className="itinerary-stop__notes">
        <textarea
          placeholder="Add notes for this activity..."
          value={stopNotes[stop.id] || ''}
          onChange={(e) => onUpdateStopNote?.(stop.id, e.target.value)}
          className="stop-notes-input"
          rows="2"
        />
      </div>
    </React.Fragment>
  );
})}
        <div
            className={`itinerary-day__dropzone ${dragOverZone === `${day}-${stops.length}` ? 'itinerary-day__dropzone--active' : ''}`}
            onDragOver={handleDragOver(day, stops.length)}
            onDrop={handleDrop(day, stops.length)}
            onDragLeave={handleDragLeave}
            />
      {addingForDay === day ? (
  <div className="add-place-panel">
    <input
      type="text"
      className="add-place-input"
      placeholder="Search for a place..."
      value={searchQuery}
      onChange={(event) => handleSearchChange(event, day)}
      autoFocus
    />
    <div className="add-place-actions">
      <button type="button" onClick={cancelAddPlace}>
        Cancel
      </button>
    </div>

    {suggestions.length > 0 && (
      <ul className="add-place-suggestions">
        {suggestions.map((prediction) => (
          <li key={prediction.place_id}>
            <button
              type="button"
              onClick={() => handleSelectSuggestion(day, prediction)}
            >
              <span className="add-place-suggestion-primary">
                {prediction.structured_formatting.main_text}
              </span>
              <span className="add-place-suggestion-secondary">
                {prediction.structured_formatting.secondary_text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
) : (
  <button
    className="itinerary-day__add-place"
    type="button"
    onClick={() => openAddPlace(day)}
  >
    Add a place
  </button>
)}

    </section>
  );
})}
      </div>
    </div>
  );
}
