import React, { useState, useEffect } from 'react';
import './FlightsTab.css';

const BACKEND_URL = 'http://localhost:3000';

export default function FlightsTab({ selectedTrip }) {
  const [flights, setFlights] = useState([]);
  const [allFlights, setAllFlights] = useState([]); // Store all flights for filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [departureTimeMax, setDepartureTimeMax] = useState(1440); // Max departure time in minutes
  const [durationMax, setDurationMax] = useState(2000); // Max duration in minutes
  const [selectedAirlines, setSelectedAirlines] = useState(new Set());
  const [tripType, setTripType] = useState('round-trip'); // 'round-trip', 'one-way', 'multi-city'
  const [availableAirlines, setAvailableAirlines] = useState([]);

  const searchFlights = async () => {
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

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        origin,
        destination,
        departureDate,
        adults: travelers
      });

      if (returnDate) {
        params.append('returnDate', returnDate);
      }

      console.log('Fetching flights with params:', params.toString());
      const response = await fetch(`${BACKEND_URL}/flights?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch flights');
      }

      // Transform SERP API response to our flight card format
      // Extract airport codes from backend response
      const originCode = data.search_metadata?.origin_code;
      const destinationCode = data.search_metadata?.destination_code;
      console.log('Airport codes from backend:', { originCode, destinationCode });

      const transformedFlights = transformFlightData(data, origin, destination, departureDate, returnDate, originCode, destinationCode);
      setAllFlights(transformedFlights);
      setFlights(transformedFlights);

      // Extract unique airlines
      const airlines = [...new Set(transformedFlights.map(f => f.airline))];
      setAvailableAirlines(airlines);
      setSelectedAirlines(new Set(airlines)); // Select all by default
    } catch (err) {
      console.error('Error fetching flights:', err);
      setError(err.message || 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  const transformFlightData = (serpData, origin, destination, departureDate, returnDate, originCode, destinationCode) => {
    // SERP API returns flight data in 'best_flights' or 'other_flights'
    const allFlights = [
      ...(serpData.best_flights || []),
      ...(serpData.other_flights || [])
    ];

    return allFlights.slice(0, 10).map((flight, flightIndex) => {
      // For round-trip flights, SERP API includes both outbound and return flights
      const flights = flight.flights || [];

      // DEBUG: Log the entire flight object structure
      console.log(`\n=== FLIGHT ${flightIndex} DEBUG ===`);
      console.log('Flight object:', flight);
      console.log('Number of segments:', flights.length);
      console.log('Segments:', flights.map((f, i) => `${i}: ${f.departure_airport?.id} → ${f.arrival_airport?.id}`));

      // Determine if this is round-trip by checking if we have a return date
      const isRoundTrip = returnDate && returnDate !== 'null' && returnDate !== 'undefined';
      console.log('Is round trip?', isRoundTrip, 'Return date:', returnDate);

      // Split flights into outbound and return legs
      let outboundFlights = [];
      let returnFlights = [];

      if (isRoundTrip && flights.length > 1) {
        // NEW LOGIC: Use destination_code to find where outbound ends
        // Outbound ends when we first arrive at the destination airport code
        let splitIndex = -1;

        console.log('Splitting flights with destinationCode:', destinationCode);

        // Find the first time we arrive at the destination
        for (let i = 0; i < flights.length; i++) {
          const currentArrival = flights[i].arrival_airport?.id;
          console.log(`Flight ${i}: arrives at ${currentArrival}`);

          // If this flight arrives at the destination, outbound ends here
          if (currentArrival === destinationCode) {
            splitIndex = i + 1; // Split after this flight
            console.log(`Found destination! Splitting at index ${splitIndex}`);
            break;
          }
        }

        if (splitIndex > 0) {
          outboundFlights = flights.slice(0, splitIndex);
          returnFlights = flights.slice(splitIndex);
          console.log(`Outbound: ${outboundFlights.length} flights, Return: ${returnFlights.length} flights`);
        } else {
          // Fallback: split in half if destination not found
          console.warn('Destination code not found in flights, using fallback split');
          const mid = Math.ceil(flights.length / 2);
          outboundFlights = flights.slice(0, mid);
          returnFlights = flights.slice(mid);
        }
      } else {
        outboundFlights = flights;
      }

      // Helper function to get layover airport codes
      const getLayoverAirports = (flightSegments) => {
        if (flightSegments.length <= 1) return [];
        // Get all intermediate airports (exclude first departure and last arrival)
        return flightSegments.slice(0, -1).map(segment => segment.arrival_airport?.id).filter(Boolean);
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
        duration: formatDuration(calculateDuration(outboundFlights)),
        stops: outboundStops,
        layoverAirports: outboundLayovers
      };

      // Extract return flight info if exists
      let returnFlight = null;
      if (returnFlights.length > 0) {
        const returnFirst = returnFlights[0] || {};
        const returnLast = returnFlights[returnFlights.length - 1] || {};
        const returnStops = returnFlights.length - 1;
        const returnLayovers = getLayoverAirports(returnFlights);

        returnFlight = {
          departureTime: extractTime(returnFirst.departure_airport?.time),
          departureAirport: returnFirst.departure_airport?.id || '',
          arrivalTime: extractTime(returnLast.arrival_airport?.time),
          arrivalAirport: returnLast.arrival_airport?.id || '',
          duration: formatDuration(calculateDuration(returnFlights)),
          stops: returnStops,
          layoverAirports: returnLayovers
        };
      }

      return {
        airline: outboundFirst.airline || 'Unknown',
        airlineLogo: outboundFirst.airline_logo || null,
        price: flight.price || 0,
        outbound,
        return: returnFlight,
        // Store original data for Google Flights link
        originCity: origin,
        destinationCity: destination,
        departureDate,
        returnDate: isRoundTrip ? returnDate : null
      };
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

  // Build Google Flights URL with pre-filled parameters
  const buildGoogleFlightsUrl = (flight) => {
    const from = flight.outbound.departureAirport;
    const to = flight.outbound.arrivalAirport;
    const depDate = flight.departureDate;
    const retDate = flight.returnDate;

    // Google Flights doesn't have a stable URL format for pre-filling
    // Just link to the main flights page - users will need to manually enter details
    return 'https://www.google.com/travel/flights';
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

  // Apply filters to flights
  const applyFilters = () => {
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

    // Filter by trip type
    if (tripType === 'one-way') {
      filtered = filtered.filter(flight => !flight.return);
    } else if (tripType === 'round-trip') {
      filtered = filtered.filter(flight => flight.return);
    }
    // multi-city: show all for now

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

  useEffect(() => {
    // Automatically search for flights when component mounts
    if (selectedTrip) {
      searchFlights();
    }
  }, [selectedTrip]);

  // Apply filters whenever filter values change
  useEffect(() => {
    if (allFlights.length > 0) {
      applyFilters();
    }
  }, [departureTimeMax, durationMax, selectedAirlines, tripType, allFlights]);

  if (!selectedTrip) {
    return (
      <div className="flights-tab">
        <div className="flights-tab__empty">No trip selected</div>
      </div>
    );
  }

  return (
    <div className="flights-tab">
      <div className="flights-tab__header">
        <div className="flights-tab__title-section">
          <h2>Flights</h2>
          <p className="flights-tab__subtitle">
            {selectedTrip.origin || selectedTrip.itinerary_data?.origin} → {selectedTrip.destination || selectedTrip.itinerary_data?.destination}
          </p>
        </div>
        <div className="flights-tab__actions">
          <button
            className="flights-tab__btn flights-tab__btn--primary"
            onClick={searchFlights}
            disabled={loading}
          >
            {loading ? 'SEARCHING...' : 'SEARCH FLIGHTS'}
          </button>
        </div>
      </div>

      <div className="flights-tab__body">

      {error && (
        <div className="flights-tab__error" style={{
          padding: '1rem',
          margin: '1rem 0',
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="flights-tab__loading">
          <div className="flights-tab__spinner"></div>
          <p>Searching for flights...</p>
        </div>
      )}

        {/* Filters Sidebar - Only show when flights are loaded */}
        {!loading && allFlights.length > 0 && (
          <aside className="flights-tab__filters">
            <h3 className="flights-tab__filters-title">Filters</h3>

            {/* Trip Type Filter */}
            <div className="filter-group">
              <label className="filter-label">Trip Type</label>
              <div className="trip-type-selector">
                <button
                  className={`trip-type-btn ${tripType === 'round-trip' ? 'active' : ''}`}
                  onClick={() => setTripType('round-trip')}
                >
                  Round Trip
                </button>
                <button
                  className={`trip-type-btn ${tripType === 'one-way' ? 'active' : ''}`}
                  onClick={() => setTripType('one-way')}
                >
                  One Way
                </button>
                <button
                  className={`trip-type-btn ${tripType === 'multi-city' ? 'active' : ''}`}
                  onClick={() => setTripType('multi-city')}
                >
                  Multi-City
                </button>
              </div>
            </div>

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
          </aside>
        )}

      {!loading && flights.length > 0 && (
        <div className="flights-tab__results">
          <h3 className="flights-tab__results-title">
            {flights.length} Flight{flights.length !== 1 ? 's' : ''} Found
          </h3>
          <div className="flights-tab__list">
            {flights.map((flight, index) => (
              <div key={index} className="flight-card">
                {/* Header with airline and price */}
                <div className="flight-card__header">
                  <div className="flight-card__airline-info">
                    {flight.airlineLogo && (
                      <img
                        src={flight.airlineLogo}
                        alt={flight.airline}
                        className="flight-card__airline-logo"
                      />
                    )}
                    <span className="flight-card__airline">{flight.airline}</span>
                  </div>
                  <span className="flight-card__price">${flight.price}</span>
                </div>

                {/* Outbound flight */}
                <div className="flight-card__leg">
                  <div className="flight-card__leg-label">OUTBOUND</div>
                  <div className="flight-card__timeline">
                    <div className="flight-card__endpoint">
                      <div className="flight-card__time">{flight.outbound.departureTime}</div>
                      <div className="flight-card__airport">{flight.outbound.departureAirport}</div>
                    </div>

                    <div className="flight-card__route">
                      <div className="flight-card__route-info">
                        <div className="flight-card__duration">{flight.outbound.duration}</div>
                        <div className={`flight-card__line ${flight.outbound.stops > 0 ? 'has-stop' : ''}`}>
                          {flight.outbound.stops > 0 && <span className="flight-card__line-dot"></span>}
                        </div>
                        <div className="flight-card__stops">
                          {flight.outbound.stops === 0
                            ? 'Direct'
                            : `${flight.outbound.stops} stop${flight.outbound.stops > 1 ? 's' : ''} ${flight.outbound.layoverAirports.join(', ')}`
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flight-card__endpoint">
                      <div className="flight-card__time">{flight.outbound.arrivalTime}</div>
                      <div className="flight-card__airport">{flight.outbound.arrivalAirport}</div>
                    </div>
                  </div>
                </div>

                {/* Return flight (if exists) */}
                {flight.return && (
                  <div className="flight-card__leg">
                    <div className="flight-card__leg-label">RETURN</div>
                    <div className="flight-card__timeline">
                      <div className="flight-card__endpoint">
                        <div className="flight-card__time">{flight.return.departureTime}</div>
                        <div className="flight-card__airport">{flight.return.departureAirport}</div>
                      </div>

                      <div className="flight-card__route">
                        <div className="flight-card__route-info">
                          <div className="flight-card__duration">{flight.return.duration}</div>
                          <div className={`flight-card__line ${flight.return.stops > 0 ? 'has-stop' : ''}`}>
                            {flight.return.stops > 0 && <span className="flight-card__line-dot"></span>}
                          </div>
                          <div className="flight-card__stops">
                            {flight.return.stops === 0
                              ? 'Direct'
                              : `${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''} ${flight.return.layoverAirports.join(', ')}`
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flight-card__endpoint">
                        <div className="flight-card__time">{flight.return.arrivalTime}</div>
                        <div className="flight-card__airport">{flight.return.arrivalAirport}</div>
                      </div>
                    </div>
                  </div>
                )}

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

        {!loading && flights.length === 0 && !error && (
          <div className="flights-tab__empty">
            <p>No flights found. Click "SEARCH FLIGHTS" to start searching.</p>
          </div>
        )}
      </div>
    </div>
  );
}
