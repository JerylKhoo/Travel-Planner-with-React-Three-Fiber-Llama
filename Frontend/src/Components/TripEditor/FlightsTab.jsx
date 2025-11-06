import React, { useState, useEffect } from 'react';
import './FlightsTab.css';

const BACKEND_URL = 'http://localhost:3000';
const isCompactViewport = () => (typeof window !== 'undefined' ? window.innerWidth <= 1023 : false);

export default function FlightsTab({ selectedTrip }) {
  // Tab state
  const [activeTab, setActiveTab] = useState('outbound'); // 'outbound' or 'return'

  // Separate flight data for each direction
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [allOutboundFlights, setAllOutboundFlights] = useState([]);
  const [allReturnFlights, setAllReturnFlights] = useState([]);

  // Loading and error states
  const [loadingOutbound, setLoadingOutbound] = useState(false);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [error, setError] = useState(null);

  const [isCompactLayout, setIsCompactLayout] = useState(() => isCompactViewport());
  const [filtersExpanded, setFiltersExpanded] = useState(() => !isCompactViewport());
  const toggleFilters = () => setFiltersExpanded((prev) => !prev);

  // Shared filter states across both tabs
  const [departureTimeMax, setDepartureTimeMax] = useState(1440); // Max departure time in minutes
  const [durationMax, setDurationMax] = useState(2000); // Max duration in minutes
  const [selectedAirlines, setSelectedAirlines] = useState(new Set());
  const [availableAirlines, setAvailableAirlines] = useState([]);

  // Search OUTBOUND flights (origin → destination on departure date)
  const searchOutboundFlights = async () => {
    if (!selectedTrip) {
      setError('No trip selected');
      return;
    }

    const origin = selectedTrip.origin || selectedTrip.itinerary_data?.origin;
    const destination = selectedTrip.destination || selectedTrip.itinerary_data?.destination;
    const departureDate = selectedTrip.start_date || selectedTrip.itinerary_data?.start_date;
    const returnDate = selectedTrip.end_date || selectedTrip.itinerary_data?.end_date;
    const travelers = selectedTrip.travellers || selectedTrip.itinerary_data?.travelers || 1;

    if (!origin || !destination || !departureDate) {
      setError('Missing required trip information (origin, destination, or start date)');
      return;
    }

    setLoadingOutbound(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        origin,
        destination,
        departureDate,
        adults: travelers
      });
      // DO NOT include returnDate - we want one-way pricing

      console.log('🛫 Fetching OUTBOUND flights:', `${origin} → ${destination} on ${departureDate}`);
      const response = await fetch(`${BACKEND_URL}/flights?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch flights');
      }

      // Extract airport codes from backend response
      const originCode = data.search_metadata?.origin_code;
      const destinationCode = data.search_metadata?.destination_code;
      console.log('Airport codes:', { originCode, destinationCode });

      // Transform flight data for outbound
      const transformedFlights = transformFlightData(data, origin, destination, departureDate, returnDate, originCode, destinationCode);

      console.log(`✅ Found ${transformedFlights.length} outbound flights`);

      setAllOutboundFlights(transformedFlights);
      setOutboundFlights(transformedFlights);

      // Extract unique airlines for filters
      const airlines = [...new Set(transformedFlights.map(f => f.airline))];
      setAvailableAirlines(airlines);
      setSelectedAirlines(new Set(airlines)); // Select all by default
    } catch (err) {
      console.error('Error fetching outbound flights:', err);
      setError(err.message || 'Failed to fetch outbound flights');
    } finally {
      setLoadingOutbound(false);
    }
  };

  // Search RETURN flights (destination → origin on return date)
  const searchReturnFlights = async () => {
    if (!selectedTrip) {
      setError('No trip selected');
      return;
    }

    const origin = selectedTrip.origin || selectedTrip.itinerary_data?.origin;
    const destination = selectedTrip.destination || selectedTrip.itinerary_data?.destination;
    const returnDate = selectedTrip.end_date || selectedTrip.itinerary_data?.end_date;
    const travelers = selectedTrip.travellers || selectedTrip.itinerary_data?.travelers || 1;

    if (!origin || !destination || !returnDate) {
      setError('Missing required trip information for return flights');
      return;
    }

    setLoadingReturn(true);
    setError(null);

    try {
      // SWAP: Return flight is destination → origin
      const params = new URLSearchParams({
        origin: destination, // SWAPPED
        destination: origin, // SWAPPED
        departureDate: returnDate, // Use return date as departure
        adults: travelers
      });
      // DO NOT include returnDate parameter - we want one-way pricing

      console.log('🛬 Fetching RETURN flights:', `${destination} → ${origin} on ${returnDate}`);
      const response = await fetch(`${BACKEND_URL}/flights?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch flights');
      }

      // Extract airport codes from backend response
      const originCode = data.search_metadata?.origin_code;
      const destinationCode = data.search_metadata?.destination_code;
      console.log('Airport codes:', { originCode, destinationCode });

      // Transform flight data for return (destination → origin)
      const transformedFlights = transformFlightData(data, destination, origin, returnDate, null, originCode, destinationCode);

      console.log(`✅ Found ${transformedFlights.length} return flights`);

      setAllReturnFlights(transformedFlights);
      setReturnFlights(transformedFlights);

      // Merge airlines with existing ones for filters
      const airlines = [...new Set([
        ...availableAirlines,
        ...transformedFlights.map(f => f.airline)
      ])];
      setAvailableAirlines(airlines);
      setSelectedAirlines(new Set(airlines)); // Select all by default
    } catch (err) {
      console.error('Error fetching return flights:', err);
      setError(err.message || 'Failed to fetch return flights');
    } finally {
      setLoadingReturn(false);
    }
  };

  const transformFlightData = (serpData, origin, destination, departureDate, returnDate, originCode, destinationCode) => {
    // SERP API returns flight data in 'best_flights' or 'other_flights'
    const allFlights = [
      ...(serpData.best_flights || []),
      ...(serpData.other_flights || [])
    ];

    return allFlights.slice(0, 15).map((flight, flightIndex) => {
      // All segments are outbound - layovers are part of the same direction
      const flights = flight.flights || [];

      console.log(`\n=== OUTBOUND FLIGHT ${flightIndex + 1} ===`);
      console.log('Segments:', flights.map((f, i) => `${i}: ${f.departure_airport?.id} → ${f.arrival_airport?.id}`));

      // All segments belong to outbound flight
      const outboundFlights = flights;

      // Helper function to get layover airport codes
      const getLayoverAirports = (flightSegments) => {
        if (flightSegments.length <= 1) return [];
        // Get all intermediate airports (exclude first departure and last arrival)
        return flightSegments.slice(0, -1).map(segment => segment.arrival_airport?.id).filter(Boolean);
      };

      // Calculate total journey duration (including layover time)
      // This matches Google Flights display: from departure to arrival time
      const calculateTotalJourneyDuration = (flightSegments) => {
        if (!flightSegments || flightSegments.length === 0) return 0;

        const firstSegment = flightSegments[0];
        const lastSegment = flightSegments[flightSegments.length - 1];

        // Parse departure and arrival times
        const departureTime = firstSegment.departure_airport?.time; // e.g., "2025-11-06 17:10"
        const arrivalTime = lastSegment.arrival_airport?.time;       // e.g., "2025-11-07 05:50"

        if (!departureTime || !arrivalTime) return 0;

        // Convert to Date objects for calculation
        const depDate = new Date(departureTime.replace(' ', 'T'));
        const arrDate = new Date(arrivalTime.replace(' ', 'T'));

        // Calculate difference in minutes
        const diffMs = arrDate - depDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        return diffMinutes;
      };

      // Extract outbound flight info
      const outboundFirst = outboundFlights[0] || {};
      const outboundLast = outboundFlights[outboundFlights.length - 1] || {};
      const outboundStops = outboundFlights.length - 1;
      const outboundLayovers = getLayoverAirports(outboundFlights);

      const outbound = {
        departureTime: extractTime(outboundFirst.departure_airport?.time),
        departureAirport: outboundFirst.departure_airport?.id || '',
        arrivalTime: extractTime(outboundLast.arrival_airport?.time),
        arrivalAirport: outboundLast.arrival_airport?.id || '',
        // Use SERP API's total_duration which accounts for timezones and layovers
        duration: formatDuration(flight.total_duration || calculateTotalJourneyDuration(outboundFlights)),
        stops: outboundStops,
        layoverAirports: outboundLayovers
      };

      const flightData = {
        airline: outboundFirst.airline || 'Unknown',
        airlineLogo: outboundFirst.airline_logo || null,
        price: flight.price || 0,
        outbound,
        originCity: origin,
        destinationCity: destination,
        departureDate,
        returnDate: returnDate || null
      };

      console.log(`✓ Flight ${flightIndex + 1}: ${flightData.airline}`);
      console.log(`  Route: ${flightData.outbound.departureAirport} → ${flightData.outbound.arrivalAirport}`);
      console.log(`  Price: $${flightData.price} (from SERP API flight.price field)`);
      console.log(`  Duration: ${flightData.outbound.duration} (from SERP API flight.total_duration: ${flight.total_duration} minutes)`);
      console.log(`  Stops: ${flightData.outbound.stops}`);

      return flightData;
    });
  };

  // Extract time from datetime string (e.g., "2025-11-06 17:10" -> "17:10")
  const extractTime = (datetime) => {
    if (!datetime) return '';
    const parts = datetime.split(' ');
    return parts.length > 1 ? parts[1] : datetime;
  };

  // Calculate total duration from flight segments
  const calculateDuration = (flightSegments) => {
    if (!flightSegments || flightSegments.length === 0) return 0;

    // Sum up duration of each segment
    return flightSegments.reduce((total, segment) => {
      return total + (segment.duration || 0);
    }, 0);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Build Google Flights URL with pre-filled parameters (one-way searches)
  const buildGoogleFlightsUrl = (flight) => {
    const baseUrl = 'https://www.google.com/travel/flights';

    if (!selectedTrip) return baseUrl;

    const departureDate = selectedTrip.start_date || selectedTrip.itinerary_data?.start_date;
    const returnDate = selectedTrip.end_date || selectedTrip.itinerary_data?.end_date;

    // Get airport codes from flight data
    const fromCode = flight.outbound.departureAirport;
    const toCode = flight.outbound.arrivalAirport;

    if (!fromCode || !toCode) return baseUrl;

    // Determine which date to use based on active tab
    const searchDate = activeTab === 'outbound' ? departureDate : returnDate;
    if (!searchDate) return baseUrl;

    const formattedDate = searchDate.split('T')[0];

    // ONE-WAY search URL - using simple query format with explicit "one way" specification
    // This format ensures Google Flights opens in one-way mode, not round-trip
    return `${baseUrl}?hl=en&gl=sg&curr=SGD&q=${fromCode}+to+${toCode}+one+way+${formattedDate}`;
  };

  // Convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert duration string (e.g., "11h 40m") to minutes
  const durationToMinutes = (durationStr) => {
    const hourMatch = durationStr.match(/(\d+)h/);
    const minMatch = durationStr.match(/(\d+)m/);
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const mins = minMatch ? parseInt(minMatch[1]) : 0;
    return hours * 60 + mins;
  };

  // Apply filters to flights based on active tab
  const applyFilters = () => {
    const allFlights = activeTab === 'outbound' ? allOutboundFlights : allReturnFlights;
    const setFlights = activeTab === 'outbound' ? setOutboundFlights : setReturnFlights;

    let filtered = [...allFlights];

    // Filter by departure time (0 to departureTimeMax)
    filtered = filtered.filter(flight => {
      const depTime = timeToMinutes(flight.outbound.departureTime);
      return depTime <= departureTimeMax;
    });

    // Filter by duration (0 to durationMax)
    filtered = filtered.filter(flight => {
      const duration = durationToMinutes(flight.outbound.duration);
      return duration <= durationMax;
    });

    // Filter by airlines
    filtered = filtered.filter(flight => selectedAirlines.has(flight.airline));

    setFlights(filtered);
  };

  // Toggle airline selection
  const toggleAirline = (airline) => {
    const newSelected = new Set(selectedAirlines);
    if (newSelected.has(airline)) {
      newSelected.delete(airline);
    } else {
      newSelected.add(airline);
    }
    setSelectedAirlines(newSelected);
  };

  // Auto-load outbound flights when component mounts
  useEffect(() => {
    if (selectedTrip) {
      searchOutboundFlights();
    }
  }, [selectedTrip]);

  // Handle tab switching - load return flights if not already loaded
  useEffect(() => {
    if (activeTab === 'return' && allReturnFlights.length === 0 && selectedTrip) {
      searchReturnFlights();
    }
  }, [activeTab]);

  // Apply filters whenever filter values, active tab, or flight data changes
  useEffect(() => {
    const allFlights = activeTab === 'outbound' ? allOutboundFlights : allReturnFlights;
    if (allFlights.length > 0) {
      applyFilters();
    }
  }, [departureTimeMax, durationMax, selectedAirlines, allOutboundFlights, allReturnFlights, activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsCompactLayout(isCompactViewport());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setFiltersExpanded(isCompactLayout ? false : true);
  }, [isCompactLayout]);

  if (!selectedTrip) {
    return (
      <div className="flights-tab">
        <div className="flights-tab__empty">No trip selected</div>
      </div>
    );
  }

  // Get current display values based on active tab
  const origin = selectedTrip.origin || selectedTrip.itinerary_data?.origin;
  const destination = selectedTrip.destination || selectedTrip.itinerary_data?.destination;
  const currentFlights = activeTab === 'outbound' ? outboundFlights : returnFlights;
  const currentLoading = activeTab === 'outbound' ? loadingOutbound : loadingReturn;
  const currentSubtitle = activeTab === 'outbound'
    ? `${origin} → ${destination}`
    : `${destination} → ${origin}`;

  return (
    <div className="flights-tab">
      <div className="flights-tab__header">
        <div className="flights-tab__title-section">
          <h2>Flights</h2>
          <p className="flights-tab__subtitle">{currentSubtitle}</p>
        </div>

        {/* Tab Buttons */}
        <div className="flights-tab__tabs">
          <button
            className={`flights-tab__tab-btn ${activeTab === 'outbound' ? 'active' : ''}`}
            onClick={() => setActiveTab('outbound')}
          >
            OUTBOUND
          </button>
          <button
            className={`flights-tab__tab-btn ${activeTab === 'return' ? 'active' : ''}`}
            onClick={() => setActiveTab('return')}
          >
            RETURN
          </button>
        </div>
      </div>

      <div className="flights-tab__body">

      {currentLoading && (
        <div className="flights-tab__loading">
          <div className="flights-tab__spinner"></div>
          <p>Searching for flights...</p>
        </div>
      )}

        {/* Filters Sidebar - Always show when not loading */}
        {!currentLoading && (
          <aside className={`flights-tab__filters ${filtersExpanded ? 'expanded' : 'collapsed'}`}>
            <button
              type="button"
              className="flights-tab__filter-toggle"
              onClick={toggleFilters}
              aria-expanded={filtersExpanded}
              aria-controls="flight-filters-content"
            >
              <span>Filters</span>
              <span className="flights-tab__filter-toggle-icon">{filtersExpanded ? '−' : '+'}</span>
            </button>

            <h3 className="flights-tab__filters-title">Filters</h3>

            {filtersExpanded && (
              <div id="flight-filters-content">

                {/* Departure Time Filter */}
                <div className="filter-group">
                  <label className="filter-label">Departure Time</label>
                  <div className="filter-value">
                    00:00 - {Math.floor(departureTimeMax / 60).toString().padStart(2, '0')}:{(departureTimeMax % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="range-slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="1440"
                      value={departureTimeMax}
                      onChange={(e) => setDepartureTimeMax(parseInt(e.target.value))}
                      className="range-slider"
                      style={{
                        background: `linear-gradient(to right, #39ff41 0%, #39ff41 ${(departureTimeMax / 1440) * 100}%, #333 ${(departureTimeMax / 1440) * 100}%, #333 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Duration Filter */}
                <div className="filter-group">
                  <label className="filter-label">Journey Duration</label>
                  <div className="filter-value">
                    0h 0m - {Math.floor(durationMax / 60)}h {durationMax % 60}m
                  </div>
                  <div className="range-slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      value={durationMax}
                      onChange={(e) => setDurationMax(parseInt(e.target.value))}
                      className="range-slider"
                      style={{
                        background: `linear-gradient(to right, #39ff41 0%, #39ff41 ${(durationMax / 2000) * 100}%, #333 ${(durationMax / 2000) * 100}%, #333 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Airlines Filter */}
                <div className="filter-group">
                  <label className="filter-label">Airlines</label>
                  <div className="airlines-filter">
                    {availableAirlines.map(airline => (
                      <label key={airline} className="airline-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedAirlines.has(airline)}
                          onChange={() => toggleAirline(airline)}
                        />
                        <span className="airline-name">{airline}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

      {!currentLoading && currentFlights.length > 0 && (
        <div className="flights-tab__results">
          <h3 className="flights-tab__results-title">
            {currentFlights.length} Flight{currentFlights.length !== 1 ? 's' : ''} Found
          </h3>
          <div className="flights-tab__list">
            {currentFlights.map((flight, index) => (
              <div key={index} className="flight-card">
                {/* Header with price */}
                <div className="flight-card__header">
                  <span className="flight-card__price">SGD {flight.price}</span>
                </div>

                {/* Outbound flight row */}
                <div className="flight-card__row">
                  <div className="flight-card__row-content">
                    {flight.airlineLogo && (
                      <img
                        src={flight.airlineLogo}
                        alt={flight.airline}
                        className="flight-card__airline-logo"
                      />
                    )}
                    <div className="flight-card__time-large">{flight.outbound.departureTime}</div>
                    <div className="flight-card__airport-code">{flight.outbound.departureAirport}</div>

                    <div className="flight-card__route-container">
                      <div className="flight-card__duration-text">{flight.outbound.duration}</div>
                      <div className="flight-card__arrow-line">
                        {flight.outbound.stops > 0 && <span className="flight-card__stop-dot"></span>}
                      </div>
                      <div className="flight-card__layover-text">
                        {flight.outbound.stops === 0
                          ? 'Direct'
                          : `${flight.outbound.stops} stop${flight.outbound.stops > 1 ? 's' : ''} ${flight.outbound.layoverAirports.join(', ')}`
                        }
                      </div>
                    </div>

                    <div className="flight-card__time-large">{flight.outbound.arrivalTime}</div>
                    <div className="flight-card__airport-code">{flight.outbound.arrivalAirport}</div>
                  </div>
                </div>

                {/* Footer with booking button */}
                <div className="flight-card__footer">
                  <a
                    href={buildGoogleFlightsUrl(flight)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flight-card__btn"
                  >
                    BOOK ON GOOGLE FLIGHTS
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {!currentLoading && currentFlights.length === 0 && (
          <div className="flights-tab__empty">
            <p>No flights found</p>
          </div>
        )}
      </div>
    </div>
  );
}
