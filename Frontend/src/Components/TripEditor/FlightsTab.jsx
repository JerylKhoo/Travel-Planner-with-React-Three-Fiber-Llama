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
  const [availableAirlines, setAvailableAirlines] = useState([]);

  // Fetch return flights using departure_token (SERP API recommended method)
  const fetchReturnFlightsWithTokens = async (outboundFlights, origin, destination, departureDate, returnDate, originCode, destinationCode) => {
    console.log('=== USING DEPARTURE_TOKEN METHOD ===');
    const roundTripFlights = [];

    // For each outbound flight, fetch its specific return flight options using departure_token
    for (let i = 0; i < outboundFlights.length; i++) {
      const outboundFlight = outboundFlights[i];
      const token = outboundFlight.departure_token;

      if (!token) {
        console.warn(`⚠️ Flight ${i} has no departure_token, skipping`);
        continue;
      }

      try {
        console.log(`Fetching return flights for outbound ${i + 1}/${outboundFlights.length} using token...`);

        // Fetch return flights for this specific outbound using its departure_token
        // IMPORTANT: Even with departure_token, we still need to pass all original search parameters
        const returnParams = new URLSearchParams({
          origin: origin,
          destination: destination,
          departureDate: departureDate,
          returnDate: returnDate,
          departure_token: token
        });

        const response = await fetch(`${BACKEND_URL}/flights?${returnParams}`);
        const data = await response.json();

        if (!response.ok) {
          console.error(`Failed to fetch return flights for token ${i}:`, data.error);
          continue;
        }

        // Extract return flight options from the response
        const returnFlightOptions = [
          ...(data.best_flights || []),
          ...(data.other_flights || [])
        ];

        console.log(`Got ${returnFlightOptions.length} return options for outbound flight ${i + 1}`);

        // Transform outbound flight
        const outboundTransformed = transformSingleFlight(
          outboundFlight,
          origin,
          destination,
          departureDate,
          null,
          originCode,
          destinationCode
        );

        // For each return option, create a combined round-trip flight
        for (const returnOption of returnFlightOptions.slice(0, 3)) { // Take top 3 return options per outbound
          const returnTransformed = transformSingleFlight(
            returnOption,
            destination,
            origin,
            returnDate,
            null,
            destinationCode,
            originCode
          );

          // Create combined round-trip flight
          roundTripFlights.push({
            airline: outboundTransformed.airline,
            airlineLogo: outboundTransformed.airlineLogo,
            price: outboundTransformed.price + returnTransformed.price,
            outboundPrice: outboundTransformed.price,
            returnPrice: returnTransformed.price,
            outbound: outboundTransformed.outbound,
            return: returnTransformed.outbound, // The return flight's "outbound" is our return leg
            originCity: origin,
            destinationCity: destination,
            departureDate: departureDate,
            returnDate: returnDate
          });
        }
      } catch (error) {
        console.error(`Error fetching return for token ${i}:`, error);
      }
    }

    // Sort by total price and return top 15
    roundTripFlights.sort((a, b) => a.price - b.price);
    return roundTripFlights.slice(0, 15);
  };

  // Fetch return flights using origin/destination swap (fallback method)
  const fetchReturnFlightsWithSwap = async (transformedFlights, origin, destination, returnDate, travelers, originCode, destinationCode) => {
    console.log('🔄 Fetching return flights using origin/destination swap...');

    try {
      // Fetch return flights (swap origin and destination)
      const returnParams = new URLSearchParams({
        origin: destination,
        destination: origin,
        departureDate: returnDate,
        adults: travelers
      });

      console.log('Fetching return flights with params:', returnParams.toString());
      const returnResponse = await fetch(`${BACKEND_URL}/flights?${returnParams}`);
      const returnData = await returnResponse.json();

      if (returnResponse.ok) {
        // Transform return flight data
        const returnFlights = transformFlightData(returnData, destination, origin, returnDate, null, destinationCode, originCode);
        console.log(`✅ Fetched ${returnFlights.length} return flights`);

        // Smart match outbound and return flights
        const matched = matchOutboundAndReturnFlights(transformedFlights, returnFlights);
        console.log(`✅ Created ${matched.length} matched round-trip combinations`);
        return matched;
      } else {
        console.warn('⚠️ Failed to fetch return flights:', returnData.error);
        return transformedFlights;
      }
    } catch (returnErr) {
      console.error('❌ Error fetching return flights:', returnErr);
      return transformedFlights;
    }
  };

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

      // Extract airport codes from backend response
      const originCode = data.search_metadata?.origin_code;
      const destinationCode = data.search_metadata?.destination_code;
      console.log('Airport codes from backend:', { originCode, destinationCode });

      // Transform initial flight data
      const transformedFlights = transformFlightData(data, origin, destination, departureDate, returnDate, originCode, destinationCode);

      // Check if we requested round-trip but got one-way results
      const isRoundTripRequest = returnDate && returnDate !== 'null' && returnDate !== 'undefined';
      const hasReturnFlights = transformedFlights.some(f => f.return !== null);

      console.log('=== ROUND-TRIP CHECK ===');
      console.log('Requested round-trip?', isRoundTripRequest);
      console.log('Has return flights?', hasReturnFlights);

      let finalFlights = transformedFlights;

      // If we requested round-trip but didn't get return flights, try to fetch them
      if (isRoundTripRequest && !hasReturnFlights) {
        console.log('🔄 No return flights found in initial response');

        // OPTION 1: Try using departure_token method (SERP API recommended approach)
        const allFlights = [
          ...(data.best_flights || []),
          ...(data.other_flights || [])
        ];

        // Check if departure_token is available in any flights
        const hasDepartureTokens = allFlights.some(f => f.departure_token);

        if (hasDepartureTokens) {
          console.log('✅ Departure tokens found! Using token-based approach...');
          try {
            finalFlights = await fetchReturnFlightsWithTokens(
              allFlights.slice(0, 10),
              origin,
              destination,
              departureDate,
              returnDate,
              originCode,
              destinationCode
            );
            console.log(`✅ Created ${finalFlights.length} round-trip combinations using departure_token`);
          } catch (tokenErr) {
            console.error('❌ Error fetching with tokens, falling back to smart matching:', tokenErr);
            // Fall back to smart matching
            finalFlights = await fetchReturnFlightsWithSwap(
              transformedFlights,
              origin,
              destination,
              returnDate,
              travelers,
              originCode,
              destinationCode
            );
          }
        } else {
          // OPTION 2: Fall back to origin/destination swap method
          console.log('⚠️ No departure tokens available. Using origin/destination swap method...');
          finalFlights = await fetchReturnFlightsWithSwap(
            transformedFlights,
            origin,
            destination,
            returnDate,
            travelers,
            originCode,
            destinationCode
          );
        }
      }

      setAllFlights(finalFlights);
      setFlights(finalFlights);

      // Extract unique airlines
      const airlines = [...new Set(finalFlights.map(f => f.airline))];
      setAvailableAirlines(airlines);
      setSelectedAirlines(new Set(airlines)); // Select all by default
    } catch (err) {
      console.error('Error fetching flights:', err);
      setError(err.message || 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  // Smart matching function to pair outbound and return flights
  const matchOutboundAndReturnFlights = (outboundFlights, returnFlights) => {
    console.log('=== SMART MATCHING ===');
    console.log(`Matching ${outboundFlights.length} outbound flights with ${returnFlights.length} return flights`);

    const matches = [];

    // For each outbound flight, find best matching return flights
    for (const outbound of outboundFlights) {
      // Score each return flight for compatibility with this outbound flight
      const scoredReturns = returnFlights.map(returnFlight => {
        let score = 0;

        // 1. Same airline = +50 points
        if (outbound.airline === returnFlight.airline) {
          score += 50;
        }

        // 2. Similar number of stops = +30 points
        if (outbound.outbound.stops === returnFlight.outbound.stops) {
          score += 30;
        } else if (Math.abs(outbound.outbound.stops - returnFlight.outbound.stops) === 1) {
          score += 15; // Close enough
        }

        // 3. Similar price range = +20 points
        const priceDiff = Math.abs(outbound.price - returnFlight.price);
        if (priceDiff < 100) {
          score += 20;
        } else if (priceDiff < 300) {
          score += 10;
        }

        return { returnFlight, score };
      });

      // Sort by score (highest first) and take top 3 matches
      scoredReturns.sort((a, b) => b.score - a.score);
      const topMatches = scoredReturns.slice(0, 3);

      // Create combined flight objects
      for (const { returnFlight } of topMatches) {
        matches.push({
          airline: outbound.airline,
          airlineLogo: outbound.airlineLogo,
          price: outbound.price + returnFlight.price, // Combined price for sorting
          outboundPrice: outbound.price, // Individual outbound price
          returnPrice: returnFlight.price, // Individual return price
          outbound: outbound.outbound,
          return: returnFlight.outbound, // The return flight's outbound is our return leg
          originCity: outbound.originCity,
          destinationCity: outbound.destinationCity,
          departureDate: outbound.departureDate,
          returnDate: returnFlight.departureDate
        });
      }
    }

    // Sort by combined price and take top 15
    matches.sort((a, b) => a.price - b.price);
    const topCombinations = matches.slice(0, 15);

    console.log(`Created ${topCombinations.length} matched combinations`);
    return topCombinations;
  };

  // Transform a single flight object from SERP API
  const transformSingleFlight = (flight, origin, destination, departureDate, returnDate, originCode, destinationCode) => {
    const flights = flight.flights || [];

    console.log('=== TRANSFORM SINGLE FLIGHT ===');
    console.log('Flight segments:', flights.length);
    console.log('Segments:', flights.map((f, i) => `${i}: ${f.departure_airport?.id} → ${f.arrival_airport?.id}`));

    // For single flight transformation, we only process outbound (one-way)
    const outboundFlights = flights;

    // Helper function to get layover airport codes
    const getLayoverAirports = (flightSegments) => {
      if (flightSegments.length <= 1) return [];
      return flightSegments.slice(0, -1).map(segment => segment.arrival_airport?.id).filter(Boolean);
    };

    // Calculate flight duration (excluding layover time)
    const calculateFlightDuration = (flightSegments) => {
      if (!flightSegments || flightSegments.length === 0) return 0;
      return flightSegments.reduce((total, segment) => total + (segment.duration || 0), 0);
    };

    // Extract time from datetime string
    const extractTime = (datetime) => {
      if (!datetime) return '';
      const parts = datetime.split(' ');
      return parts.length > 1 ? parts[1] : datetime;
    };

    // Format duration
    const formatDuration = (minutes) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
      duration: formatDuration(calculateFlightDuration(outboundFlights)),
      stops: outboundStops,
      layoverAirports: outboundLayovers
    };

    return {
      airline: outboundFirst.airline || 'Unknown',
      airlineLogo: outboundFirst.airline_logo || null,
      price: flight.price || 0,
      outbound,
      return: null,
      originCity: origin,
      destinationCity: destination,
      departureDate,
      returnDate: returnDate || null
    };
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
      console.log('Flight has layovers?', flight.layovers);
      console.log('Flight total_duration from API:', flight.total_duration, 'minutes');
      console.log('Number of segments:', flights.length);
      console.log('Segments:', flights.map((f, i) => `${i}: ${f.departure_airport?.id} → ${f.arrival_airport?.id}`));

      // Determine if this is round-trip by checking if we have a return date
      const isRoundTrip = returnDate && returnDate !== 'null' && returnDate !== 'undefined';
      console.log('=== FLIGHT SPLIT DEBUG ===');
      console.log('Is round trip?', isRoundTrip, 'Return date:', returnDate);
      console.log('Total flight segments:', flights.length);

      // Split flights into outbound and return legs
      let outboundFlights = [];
      let returnFlights = [];

      if (isRoundTrip && flights.length > 1) {
        // NEW LOGIC: Use destination_code to find where outbound ends
        // Outbound ends when we first arrive at the destination airport code
        let splitIndex = -1;

        console.log('Splitting flights with originCode:', originCode, 'destinationCode:', destinationCode);
        console.log('All flight segments:', flights.map((f, i) => `${i}: ${f.departure_airport?.id} → ${f.arrival_airport?.id}`));

        // First, check if this flight actually contains return data
        // A true round-trip should either:
        // 1. End at the origin airport, OR
        // 2. Have a segment that departs from the destination going back
        const lastSegment = flights[flights.length - 1];
        const endsAtOrigin = lastSegment?.arrival_airport?.id === originCode;

        console.log('Last segment arrives at:', lastSegment?.arrival_airport?.id);
        console.log('Does it end at origin?', endsAtOrigin);

        if (!endsAtOrigin) {
          console.warn('⚠️ WARNING: Flight does not return to origin! This appears to be one-way only.');
          console.log('Setting this as one-way flight even though round-trip was searched');
          outboundFlights = flights;
          returnFlights = [];
        } else {
          // Find the first time we arrive at the destination (this is where outbound ends)
          for (let i = 0; i < flights.length; i++) {
            const currentArrival = flights[i].arrival_airport?.id;
            console.log(`Flight ${i}: arrives at ${currentArrival}`);

            // If this flight arrives at the destination, outbound ends here
            if (currentArrival === destinationCode) {
              splitIndex = i + 1; // Split after this flight
              console.log(`✓ Found destination! Splitting at index ${splitIndex}`);
              break;
            }
          }

          if (splitIndex > 0 && splitIndex < flights.length) {
            outboundFlights = flights.slice(0, splitIndex);
            returnFlights = flights.slice(splitIndex);
            console.log(`✓ Split successful - Outbound: ${outboundFlights.length} flights, Return: ${returnFlights.length} flights`);
            console.log('Outbound segments:', outboundFlights.map(f => `${f.departure_airport?.id} → ${f.arrival_airport?.id}`));
            console.log('Return segments:', returnFlights.map(f => `${f.departure_airport?.id} → ${f.arrival_airport?.id}`));
          } else {
            // Fallback: split in half if destination not found properly
            console.warn('⚠️ Could not find proper split point, using fallback split');
            const mid = Math.ceil(flights.length / 2);
            outboundFlights = flights.slice(0, mid);
            returnFlights = flights.slice(mid);
            console.log(`Fallback split - Outbound: ${outboundFlights.length} flights, Return: ${returnFlights.length} flights`);
          }
        }
      } else {
        outboundFlights = flights;
        console.log('One-way flight - no split needed');
      }
      console.log('=== END FLIGHT SPLIT DEBUG ===\n');

      // Helper function to get layover airport codes
      const getLayoverAirports = (flightSegments) => {
        if (flightSegments.length <= 1) return [];
        // Get all intermediate airports (exclude first departure and last arrival)
        return flightSegments.slice(0, -1).map(segment => segment.arrival_airport?.id).filter(Boolean);
      };

      // Calculate ONLY flight duration (NOT including layover time)
      // Layovers are shown separately in the UI
      const calculateFlightDuration = (flightSegments) => {
        if (!flightSegments || flightSegments.length === 0) return 0;

        // Sum up all flight segment durations (actual flying time only)
        const flightTime = flightSegments.reduce((total, segment) => {
          return total + (segment.duration || 0);
        }, 0);

        return flightTime;
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
        duration: formatDuration(calculateFlightDuration(outboundFlights)),
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
          duration: formatDuration(calculateFlightDuration(returnFlights)),
          stops: returnStops,
          layoverAirports: returnLayovers
        };
      }

      const flightData = {
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

      console.log('Final flight object:', {
        airline: flightData.airline,
        price: flightData.price,
        hasReturn: !!flightData.return,
        outbound: `${flightData.outbound.departureAirport} → ${flightData.outbound.arrivalAirport}`,
        return: flightData.return ? `${flightData.return.departureAirport} → ${flightData.return.arrivalAirport}` : 'NONE'
      });

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
  }, [departureTimeMax, durationMax, selectedAirlines, allFlights]);

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
                {/* Header with total price */}
                <div className="flight-card__header">
                  <span className="flight-card__price">
                    ${flight.price}
                    {flight.outboundPrice && flight.returnPrice && (
                      <span className="flight-card__price-breakdown">
                        {' '}(${flight.outboundPrice} + ${flight.returnPrice})
                      </span>
                    )}
                  </span>
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

                {/* Return flight row (if exists) */}
                {flight.return && (
                  <div className="flight-card__row">
                    <div className="flight-card__row-content">
                      {flight.airlineLogo && (
                        <img
                          src={flight.airlineLogo}
                          alt={flight.airline}
                          className="flight-card__airline-logo"
                        />
                      )}
                      <div className="flight-card__time-large">{flight.return.departureTime}</div>
                      <div className="flight-card__airport-code">{flight.return.departureAirport}</div>

                      <div className="flight-card__route-container">
                        <div className="flight-card__duration-text">{flight.return.duration}</div>
                        <div className="flight-card__arrow-line">
                          {flight.return.stops > 0 && <span className="flight-card__stop-dot"></span>}
                        </div>
                        <div className="flight-card__layover-text">
                          {flight.return.stops === 0
                            ? 'Direct'
                            : `${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''} ${flight.return.layoverAirports.join(', ')}`
                          }
                        </div>
                      </div>

                      <div className="flight-card__time-large">{flight.return.arrivalTime}</div>
                      <div className="flight-card__airport-code">{flight.return.arrivalAirport}</div>
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
