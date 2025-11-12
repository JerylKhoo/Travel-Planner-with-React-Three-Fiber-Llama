import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  formatDateLabel,
  makeDaySectionId,
} from './ItineraryUtils';
import './ItineraryColumn.css';
import FlightsTab from './FlightsTab';
import HotelsTab from './HotelsTab';

const fallbackImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=60';


export default function ItineraryColumn({ itineraryDays, selectedTrip, mapInstance, mapsReady, onReorderStop, onSwapStops, onAddStop, onRemoveStop, dayTitles, stopNotes, onUpdateDayTitle, onUpdateStopNote, saveStatus, onActivityClick, selectedDay, activeTab }) {
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
    const scrollContainerRef = useRef(null);
    const scrollAnimationRef = useRef(null);
    const componentRef = useRef(null);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Handle copy to clipboard
    const handleCopyTripId = async () => {
        if (!selectedTrip?.trip_id) return;

        try {
            await navigator.clipboard.writeText(selectedTrip.trip_id);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
        }
    };

    // Auto-scroll logic using requestAnimationFrame for smooth performance
    const updateAutoScroll = (mouseY) => {
        if (!scrollContainerRef.current) {
            return;
        }

        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();

        // 2-3 cm ≈ 100px on most screens (at 96 DPI)
        const SCROLL_ZONE_SIZE = 100;
        const SCROLL_SPEED = 8;

        // Cancel any existing animation
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        // Check if mouse is within 100px of the bottom edge
        const distanceFromBottom = rect.bottom - mouseY;
        const distanceFromTop = mouseY - rect.top;

        if (distanceFromBottom > 0 && distanceFromBottom < SCROLL_ZONE_SIZE) {
            // Near bottom - scroll down
            const scrollDown = () => {
                if (!scrollContainerRef.current) return;

                const container = scrollContainerRef.current;
                const maxScroll = container.scrollHeight - container.clientHeight;

                if (container.scrollTop < maxScroll) {
                    container.scrollTop += SCROLL_SPEED;
                    scrollAnimationRef.current = requestAnimationFrame(scrollDown);
                }
            };
            scrollAnimationRef.current = requestAnimationFrame(scrollDown);
        }
        else if (distanceFromTop > 0 && distanceFromTop < SCROLL_ZONE_SIZE) {
            // Near top - scroll up
            const scrollUp = () => {
                if (!scrollContainerRef.current) return;

                const container = scrollContainerRef.current;

                if (container.scrollTop > 0) {
                    container.scrollTop -= SCROLL_SPEED;
                    scrollAnimationRef.current = requestAnimationFrame(scrollUp);
                }
            };
            scrollAnimationRef.current = requestAnimationFrame(scrollUp);
        }
    };

    const stopAutoScroll = () => {
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }
    };

    const handleDragStart = (dayKey, index, stopId) => (event) => {
        dragStateRef.current = { dayKey, index, stopId};
        setDraggingStopId(stopId);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (dayKey, index) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverZone(`${dayKey}-${index}`); // Set hover state
    updateAutoScroll(event.clientY); // Update scroll based on mouse position
};

    const handleDrop = (targetDayKey, targetIndex,targetStopId) => (event) => {
        event.preventDefault();
        stopAutoScroll(); // Stop scrolling when dropped
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
    stopAutoScroll(); // Stop scrolling when drag ends
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

    useEffect(() => {
        if (!mapsReady || !mapInstance || placesServiceRef.current) return;

        // Check if Google Maps Places API is available
        if (!window.google?.maps?.places?.PlacesService || !window.google?.maps?.places?.AutocompleteService) {
            return;
        }

        placesServiceRef.current = new window.google.maps.places.PlacesService(mapInstance);
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }, [mapsReady, mapInstance]);

    // Find the actual scrollable parent element
    useEffect(() => {
        if (!componentRef.current) return;

        // Find the closest ancestor with overflow-y: auto or scroll
        let element = componentRef.current.parentElement;
        while (element) {
            const style = window.getComputedStyle(element);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                scrollContainerRef.current = element;
                break;
            }
            element = element.parentElement;
        }
    }, []);

    // Cleanup auto-scroll on unmount
    useEffect(() => {
        return () => {
            stopAutoScroll();
        };
    }, []);

    useEffect(() => {
  let ignore = false;

  async function fetchPhotos() {
    setLoadingPlaces(true);
    const stops = itineraryDays.flatMap(([, dayStops]) => dayStops);

    const requests = stops.map(async (stop) => {
      if (!stop.destination) return;
      if (ignore) return;

      try {
        // Use the /destination-images API to fetch images
        const response = await axios.get("/destination-images", {
          params: {
            destination: stop.destination
          }
        });

        // Get the first image from results
        const imageUrl = response.data.hits?.[0]?.webformatURL;

        if (imageUrl) {
          setPlacePhotos((prev) => ({
            ...prev,
            [stop.destination]: imageUrl,
          }));
        } else {
          setPlacePhotos((prev) => ({
            ...prev,
            [stop.destination]: fallbackImage,
          }));
        }
      } catch (error) {
        setPlacePhotos((prev) => ({
          ...prev,
          [stop.destination]: fallbackImage,
        }));
      }
    });

    await Promise.all(requests);
    if (!ignore) setLoadingPlaces(false);
  }

  if (itineraryDays.length > 0) {
    fetchPhotos();
  }

  return () => {
    ignore = true;
  };
}, [itineraryDays, mapsReady, mapInstance]);

  return (
    <div className="itinerary-column" ref={componentRef}>
      {activeTab === 'itinerary' && (
        <div className="itinerary-column__content">
      <header className="itinerary-column__header">
        <div className="itinerary-column__heading-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>Itinerary</h2>
            {saveStatus && (
              <span style={{
                fontSize: '14px',
                color: saveStatus === 'saving' ? '#fbbf24' : saveStatus === 'saved' ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error saving'}
              </span>
            )}
          </div>
          {selectedTrip?.start_date && selectedTrip?.end_date && (
            <span className="itinerary-column__date-range">
              {selectedTrip.start_date} – {selectedTrip.end_date}
            </span>
          )}
        </div>
        <button
          className="itinerary-column__share"
          onClick={() => setShowShareModal(true)}
        >
          Share
        </button>
      </header>

      <div className="itinerary-column__content">
        {loadingPlaces && (
          <div className="itinerary-column__loading">Loading places…</div>
        )}

        {itineraryDays.map(([day, stops]) => {
  const sectionId = makeDaySectionId(day);
  const isSelectedDay = day === selectedDay;

  return (
    <section id={sectionId} key={day} className="itinerary-day" style={{
      border: isSelectedDay ? '2px solid #10b981' : '1px solid transparent',
      borderRadius: '8px',
      padding: '8px'
    }}>
        <div className="itinerary-day__header">
            <h3>{formatDateLabel(day)}{isSelectedDay && <span style={{ marginLeft: '8px', fontSize: '14px', color: '#10b981' }}>(Showing on map)</span>}</h3>
            {stops.length === 0 && (
                <span className="itinerary-day__empty-hint">No activities planned</span>
            )}
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
        onDrop={handleDrop(day, index, null)}
        onDragLeave={handleDragLeave}
      />
      
      <article
        className={`itinerary-stop${isDragging ? ' itinerary-stop--dragging' : ''}`}
        draggable
        onDragStart={handleDragStart(day, index, stop.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onActivityClick?.(day)}
        style={{ cursor: 'pointer' }}
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
            onDrop={handleDrop(day, stops.length, null)}
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
      )}

      {activeTab === 'flights' && <FlightsTab selectedTrip={selectedTrip} />}

      {activeTab === 'hotels' && <HotelsTab selectedTrip={selectedTrip} />}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#2a2a2a',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#ffffff', fontSize: '20px' }}>
                Share Trip
              </h2>
              <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                Share this Trip ID with others to collaborate
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '14px' }}>
                Trip ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#1a1a1a',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #444',
              }}>
                <input
                  type="text"
                  value={selectedTrip?.trip_id || ''}
                  readOnly
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={handleCopyTripId}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: copySuccess ? '#10b981' : '#0072ff',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.backgroundColor = '#0056d6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.backgroundColor = '#0072ff';
                    }
                  }}
                >
                  {copySuccess ? (
                    <>
                      <span>✓</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#555';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#444';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
