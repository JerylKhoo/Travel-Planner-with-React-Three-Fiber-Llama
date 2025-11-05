import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import { CircleLoader } from "react-spinners";
import './FlightSearch.css';

function FlightSearch({ origin, destination, dateFrom, dateTo, pax }) {
  const [flights, setFlights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredFlights, setFilteredFlights] = useState(null);

  // Filter states
  const [departureTimeFilter, setDepartureTimeFilter] = useState([0, 1439]); // 0-1439 minutes (00:00-23:59)
  const [returnTimeFilter, setReturnTimeFilter] = useState([0, 1439]);
  const [durationFilter, setDurationFilter] = useState([0, 2000]); // 0-2000 minutes
  const [selectedAirlines, setSelectedAirlines] = useState([]);

  // Mock data for testing/preview
  const mockFlightData = {
    best_flights: [
      {
        flights: [
          {
            departure_airport: {
              name: "Singapore Changi Airport",
              id: "SIN",
              time: "2025-12-01 23:45"
            },
            arrival_airport: {
              name: "Dubai International Airport",
              id: "DXB",
              time: "2025-12-02 03:15"
            },
            duration: 450,
            airplane: "Boeing 777",
            airline: "Emirates",
            travel_class: "Economy",
            flight_number: "EK 404"
          }
        ],
        layovers: [],
        total_duration: 450,
        price: 1245,
        type: "Round trip",
        booking_token: "mock_token_1"
      },
      {
        flights: [
          {
            departure_airport: {
              name: "Singapore Changi Airport",
              id: "SIN",
              time: "2025-12-01 14:30"
            },
            arrival_airport: {
              name: "Kuala Lumpur International Airport",
              id: "KUL",
              time: "2025-12-01 15:30"
            },
            duration: 60,
            airplane: "Airbus A330",
            airline: "Malaysia Airlines",
            travel_class: "Economy",
            flight_number: "MH 602"
          },
          {
            departure_airport: {
              name: "Kuala Lumpur International Airport",
              id: "KUL",
              time: "2025-12-01 18:45"
            },
            arrival_airport: {
              name: "Dubai International Airport",
              id: "DXB",
              time: "2025-12-01 22:00"
            },
            duration: 435,
            airplane: "Airbus A350",
            airline: "Malaysia Airlines",
            travel_class: "Economy",
            flight_number: "MH 172"
          }
        ],
        layovers: [
          {
            duration: 195,
            name: "Kuala Lumpur International Airport",
            id: "KUL"
          }
        ],
        total_duration: 690,
        price: 890,
        type: "Round trip",
        booking_token: "mock_token_2"
      }
    ],
    other_flights: [
      {
        flights: [
          {
            departure_airport: {
              name: "Singapore Changi Airport",
              id: "SIN",
              time: "2025-12-01 08:00"
            },
            arrival_airport: {
              name: "Dubai International Airport",
              id: "DXB",
              time: "2025-12-01 11:30"
            },
            duration: 450,
            airplane: "Airbus A380",
            airline: "Emirates",
            travel_class: "Economy",
            flight_number: "EK 348"
          }
        ],
        layovers: [],
        total_duration: 450,
        price: 1580,
        type: "Round trip",
        booking_token: "mock_token_3"
      },
      {
        flights: [
          {
            departure_airport: {
              name: "Singapore Changi Airport",
              id: "SIN",
              time: "2025-12-01 16:20"
            },
            arrival_airport: {
              name: "Bangkok Suvarnabhumi Airport",
              id: "BKK",
              time: "2025-12-01 17:45"
            },
            duration: 145,
            airplane: "Boeing 787",
            airline: "Thai Airways",
            travel_class: "Economy",
            flight_number: "TG 414"
          },
          {
            departure_airport: {
              name: "Bangkok Suvarnabhumi Airport",
              id: "BKK",
              time: "2025-12-01 21:30"
            },
            arrival_airport: {
              name: "Dubai International Airport",
              id: "DXB",
              time: "2025-12-02 00:45"
            },
            duration: 375,
            airplane: "Boeing 777",
            airline: "Emirates",
            travel_class: "Economy",
            flight_number: "EK 384"
          }
        ],
        layovers: [
          {
            duration: 225,
            name: "Bangkok Suvarnabhumi Airport",
            id: "BKK"
          }
        ],
        total_duration: 745,
        price: 1120,
        type: "Round trip",
        booking_token: "mock_token_4"
      }
    ]
  };

  // Airline logo mapping
  const getAirlineLogo = (airlineName) => {
    const logos = {
      'Emirates': 'https://www.gstatic.com/flights/airline_logos/70px/EK.png',
      'Singapore Airlines': 'https://www.gstatic.com/flights/airline_logos/70px/SQ.png',
      'Malaysia Airlines': 'https://www.gstatic.com/flights/airline_logos/70px/MH.png',
      'Thai Airways': 'https://www.gstatic.com/flights/airline_logos/70px/TG.png',
      'Cathay Pacific': 'https://www.gstatic.com/flights/airline_logos/70px/CX.png',
      'Qatar Airways': 'https://www.gstatic.com/flights/airline_logos/70px/QR.png',
      'Etihad Airways': 'https://www.gstatic.com/flights/airline_logos/70px/EY.png',
      'Turkish Airlines': 'https://www.gstatic.com/flights/airline_logos/70px/TK.png',
      'Lufthansa': 'https://www.gstatic.com/flights/airline_logos/70px/LH.png',
      'British Airways': 'https://www.gstatic.com/flights/airline_logos/70px/BA.png',
      'Air France': 'https://www.gstatic.com/flights/airline_logos/70px/AF.png',
      'KLM': 'https://www.gstatic.com/flights/airline_logos/70px/KL.png',
      'United': 'https://www.gstatic.com/flights/airline_logos/70px/UA.png',
      'American Airlines': 'https://www.gstatic.com/flights/airline_logos/70px/AA.png',
      'Delta': 'https://www.gstatic.com/flights/airline_logos/70px/DL.png',
      'ANA': 'https://www.gstatic.com/flights/airline_logos/70px/NH.png',
      'JAL': 'https://www.gstatic.com/flights/airline_logos/70px/JL.png',
      'Air India': 'https://www.gstatic.com/flights/airline_logos/70px/AI.png',
      'Korean Air': 'https://www.gstatic.com/flights/airline_logos/70px/KE.png',
      'Asiana': 'https://www.gstatic.com/flights/airline_logos/70px/OZ.png'
    };
    return logos[airlineName] || null;
  };

  // Function to convert city name to airport code
  const getAirportCode = (cityName) => {
    // Common city to airport code mappings
    const airportCodes = {
      'Singapore': 'SIN',
      'Dubai': 'DXB',
      'London': 'LON',
      'New York': 'NYC',
      'Tokyo': 'TYO',
      'Paris': 'PAR',
      'Sydney': 'SYD',
      'Hong Kong': 'HKG',
      'Bangkok': 'BKK',
      'Seoul': 'SEL',
      'Shanghai': 'SHA',
      'Los Angeles': 'LAX',
      'San Francisco': 'SFO',
      'Chicago': 'CHI',
      'Toronto': 'YTO',
      'Amsterdam': 'AMS',
      'Frankfurt': 'FRA',
      'Munich': 'MUC',
      'Rome': 'ROM',
      'Madrid': 'MAD',
      'Barcelona': 'BCN',
      'Milan': 'MIL',
      'Zurich': 'ZRH',
      'Vienna': 'VIE',
      'Istanbul': 'IST',
      'Moscow': 'MOW',
      'Beijing': 'BJS',
      'Delhi': 'DEL',
      'Mumbai': 'BOM',
      'Bangalore': 'BLR',
      'Kuala Lumpur': 'KUL',
      'Jakarta': 'JKT',
      'Manila': 'MNL',
      'Melbourne': 'MEL',
      'Brisbane': 'BNE',
      'Auckland': 'AKL',
      'Doha': 'DOH',
      'Abu Dhabi': 'AUH',
      'Riyadh': 'RUH',
      'Jeddah': 'JED',
      'Cairo': 'CAI',
      'Cape Town': 'CPT',
      'Johannesburg': 'JNB',
      'Nairobi': 'NBO',
      'Lagos': 'LOS',
      'Casablanca': 'CAS',
      'Buenos Aires': 'BUE',
      'Sao Paulo': 'SAO',
      'Rio de Janeiro': 'RIO',
      'Mexico City': 'MEX',
      'Lima': 'LIM',
      'Santiago': 'SCL',
      'Bogota': 'BOG',
      'Caracas': 'CCS'
    };

    return airportCodes[cityName] || cityName;
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format duration from minutes to hours and minutes
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format time from datetime string
  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Convert time string to minutes since midnight
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Auto-load mock data on component mount
  useEffect(() => {
    handleLoadMockData();
  }, []);

  // Initialize selected airlines with all airlines when flights load
  useEffect(() => {
    if (flights && selectedAirlines.length === 0) {
      const allAirlines = getUniqueAirlines();
      setSelectedAirlines(allAirlines);
    }
  }, [flights]);

  // Get Google Flights booking link with pre-filled parameters
  const getBookingLink = (flight) => {
    const firstFlight = flight.flights[0];
    const lastFlight = flight.flights[flight.flights.length - 1];
    const originCode = firstFlight?.departure_airport?.id || getAirportCode(origin);
    const destCode = lastFlight?.arrival_airport?.id || getAirportCode(destination);

    // Format dates for Google Flights (YYYY-MM-DD)
    const outboundDate = formatDate(dateFrom) || '2025-12-01';
    const returnDate = formatDate(dateTo) || '2025-12-10';

    // Build proper Google Flights URL with search parameters
    // Google Flights expects format: /flights?hl=en&gl=us&curr=USD with proper flight search structure
    const url = new URL('https://www.google.com/travel/flights');

    // Add the main search parameters
    url.searchParams.set('hl', 'en');
    url.searchParams.set('curr', 'USD');

    // Build the flight search query in the format Google expects
    // This will auto-fill the origin, destination, and dates
    const flightQuery = `Flights from ${originCode} to ${destCode} on ${outboundDate} returning ${returnDate}`;
    url.searchParams.set('q', flightQuery);

    return url.toString();
  };

  const handleSearchFlights = async () => {
    if (!origin || !destination || !dateFrom || !dateTo) {
      setError('Please fill in all required fields in the Itinerary tab first');
      return;
    }

    setLoading(true);
    setError(null);
    setFlights(null);

    try {
      const originCode = getAirportCode(origin);
      const destCode = getAirportCode(destination);
      const outbound = formatDate(dateFrom);
      const returnDate = formatDate(dateTo);

      console.log('Searching flights:', { originCode, destCode, outbound, returnDate, pax });

      const response = await axios.get('/flights', {
        params: {
          origin: originCode,
          destination: destCode,
          outbound_date: outbound,
          return_date: returnDate,
          adults: pax
        }
      });

      setFlights(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error searching flights:', err);
      setError(err.response?.data?.error || 'Failed to search flights. Please try again.');
      setLoading(false);
    }
  };

  const handleLoadMockData = () => {
    setLoading(true);
    setError(null);

    // Simulate API delay
    setTimeout(() => {
      setFlights(mockFlightData);
      setLoading(false);
    }, 1000);
  };

  const openBookingLink = (flight) => {
    const link = getBookingLink(flight);
    window.open(link, '_blank');
  };

  // Filter flights based on selected criteria
  useEffect(() => {
    if (!flights) {
      setFilteredFlights(null);
      return;
    }

    const allFlights = [
      ...(flights.best_flights || []),
      ...(flights.other_flights || [])
    ];

    const filtered = allFlights.filter(flight => {
      const firstFlight = flight.flights[0];
      const lastFlight = flight.flights[flight.flights.length - 1];

      // Get departure time in minutes
      const departureTime = timeToMinutes(formatTime(firstFlight?.departure_airport?.time));

      // Check departure time filter
      if (departureTime < departureTimeFilter[0] || departureTime > departureTimeFilter[1]) {
        return false;
      }

      // Check duration filter
      if (flight.total_duration < durationFilter[0] || flight.total_duration > durationFilter[1]) {
        return false;
      }

      // Check airline filter - only filter if some airlines are unchecked
      const allAirlines = getUniqueAirlines();
      if (selectedAirlines.length > 0 && selectedAirlines.length < allAirlines.length) {
        const flightAirlines = flight.flights.map(f => f.airline);
        const hasSelectedAirline = flightAirlines.some(airline => selectedAirlines.includes(airline));
        if (!hasSelectedAirline) {
          return false;
        }
      }

      return true;
    });

    setFilteredFlights({ flights: filtered });
  }, [flights, departureTimeFilter, returnTimeFilter, durationFilter, selectedAirlines]);

  // Get unique airlines from all flights
  const getUniqueAirlines = () => {
    if (!flights) return [];
    const allFlights = [
      ...(flights.best_flights || []),
      ...(flights.other_flights || [])
    ];
    const airlines = new Set();
    allFlights.forEach(flight => {
      flight.flights.forEach(f => airlines.add(f.airline));
    });
    return Array.from(airlines).sort();
  };

  const toggleAirline = (airline) => {
    setSelectedAirlines(prev => {
      if (prev.includes(airline)) {
        return prev.filter(a => a !== airline);
      } else {
        return [...prev, airline];
      }
    });
  };

  const renderFlight = (flight, index) => {
    const outboundFlights = flight.flights || [];
    const stops = flight.layovers?.length || 0;
    const firstFlight = outboundFlights[0];
    const lastFlight = outboundFlights[outboundFlights.length - 1];

    return (
      <div key={index} className='flight-card border border-[#39ff41] rounded-lg p-4 mb-3 bg-black bg-opacity-50'>
        {/* Airline and Price Row */}
        <div className='flex justify-between items-center mb-3'>
          <div className='flex items-center gap-2'>
            {getAirlineLogo(firstFlight?.airline) && (
              <img
                src={getAirlineLogo(firstFlight?.airline)}
                alt={firstFlight?.airline}
                className='w-8 h-8 object-contain'
              />
            )}
            <div className='text-[#39ff41] font-mono text-sm'>
              {firstFlight?.airline || 'Airline'}
            </div>
          </div>
          <div className='text-[#39ff41] font-mono text-lg font-bold'>
            ${flight.price}
          </div>
        </div>

        {/* Flight Details */}
        <div className='grid grid-cols-12 gap-2 items-center mb-3'>
          {/* Departure */}
          <div className='col-span-3 text-center'>
            <div className='text-white font-mono text-xl font-bold'>
              {formatTime(firstFlight?.departure_airport?.time)}
            </div>
            <div className='text-gray-400 font-mono text-xs'>
              {firstFlight?.departure_airport?.id}
            </div>
          </div>

          {/* Duration and Stops */}
          <div className='col-span-6 text-center'>
            <div className='text-gray-400 font-mono text-xs mb-1'>
              {formatDuration(flight.total_duration)}
            </div>
            <div className='relative'>
              <div className='h-0.5 bg-[#39ff41] w-full'></div>
              {stops > 0 && (
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2'>
                  <div className='text-[#39ff41] font-mono text-xs'>
                    {stops} stop{stops > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
            <div className='text-gray-400 font-mono text-xs mt-1'>
              {stops === 0 ? 'Direct' : `via ${flight.layovers?.map(l => l.id).join(', ')}`}
            </div>
          </div>

          {/* Arrival */}
          <div className='col-span-3 text-center'>
            <div className='text-white font-mono text-xl font-bold'>
              {formatTime(lastFlight?.arrival_airport?.time)}
            </div>
            <div className='text-gray-400 font-mono text-xs'>
              {lastFlight?.arrival_airport?.id}
            </div>
          </div>
        </div>

        {/* Book Button */}
        <div className='flex justify-end'>
          <Button
            variant="outlined"
            size="small"
            sx={{
              color: '#39ff41',
              borderColor: '#39ff41',
              fontSize: '11px',
              padding: '4px 12px',
              '&:hover': {
                borderColor: '#39ff41',
                backgroundColor: 'rgba(57, 255, 65, 0.1)',
              },
            }}
            onClick={() => openBookingLink(flight)}
          >
            Book on Google Flights
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className='h-full flex'>
      {/* Left Sidebar - Filters */}
      {flights && (
        <div className='w-64 border-r border-[#39ff41] px-4 py-4 overflow-auto'>
          {/* Departure Time Filter */}
          <div className='mb-6'>
            <div className='text-[#39ff41] font-mono text-sm font-bold mb-3'>Departure Time</div>
            <div className='text-gray-400 font-mono text-xs mb-2'>
              {Math.floor(departureTimeFilter[0] / 60).toString().padStart(2, '0')}:{(departureTimeFilter[0] % 60).toString().padStart(2, '0')} - {Math.floor(departureTimeFilter[1] / 60).toString().padStart(2, '0')}:{(departureTimeFilter[1] % 60).toString().padStart(2, '0')}
            </div>
            <Slider
              value={departureTimeFilter}
              onChange={(e, newValue) => setDepartureTimeFilter(newValue)}
              min={0}
              max={1439}
              sx={{
                color: '#39ff41',
                '& .MuiSlider-thumb': {
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(57, 255, 65, 0.16)',
                  },
                },
              }}
            />
          </div>

          {/* Journey Duration Filter */}
          <div className='mb-6'>
            <div className='text-[#39ff41] font-mono text-sm font-bold mb-3'>Journey Duration</div>
            <div className='text-gray-400 font-mono text-xs mb-2'>
              {Math.floor(durationFilter[0] / 60)}h {durationFilter[0] % 60}m - {Math.floor(durationFilter[1] / 60)}h {durationFilter[1] % 60}m
            </div>
            <Slider
              value={durationFilter}
              onChange={(e, newValue) => setDurationFilter(newValue)}
              min={0}
              max={2000}
              sx={{
                color: '#39ff41',
                '& .MuiSlider-thumb': {
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(57, 255, 65, 0.16)',
                  },
                },
              }}
            />
          </div>

          {/* Airlines Filter */}
          <div className='mb-6'>
            <div className='text-[#39ff41] font-mono text-sm font-bold mb-3'>Airlines</div>
            {getUniqueAirlines().map((airline) => (
              <div key={airline} className='flex items-center gap-2 mb-2'>
                <Checkbox
                  checked={selectedAirlines.includes(airline)}
                  onChange={() => toggleAirline(airline)}
                  sx={{
                    color: '#39ff41',
                    padding: '4px',
                    '&.Mui-checked': {
                      color: '#39ff41',
                    },
                  }}
                />
                {getAirlineLogo(airline) && (
                  <img
                    src={getAirlineLogo(airline)}
                    alt={airline}
                    className='w-5 h-5 object-contain'
                  />
                )}
                <span className='text-gray-300 font-mono text-xs'>{airline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right Side - Flight Results */}
      <div className='flex-1 flex flex-col'>
        {/* Loading State */}
        {loading && (
          <div className='flex flex-col justify-center items-center gap-4 flex-1'>
            <CircleLoader color="#39ff41" size={60} />
            <div className='text-[#39ff41] font-mono text-sm'>Searching for flights...</div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className='text-center px-4 flex-1 flex items-center justify-center'>
            <div className='text-red-500 font-mono text-sm bg-red-900 bg-opacity-20 border border-red-500 rounded p-4'>
              {error}
            </div>
          </div>
        )}

        {/* Flight Results - No section titles */}
        {filteredFlights && !loading && !error && (
          <div className='flex-1 overflow-auto px-4 py-4'>
            {filteredFlights.flights.length > 0 ? (
              filteredFlights.flights.map((flight, index) => renderFlight(flight, index))
            ) : (
              <div className='text-center text-gray-400 font-mono text-sm py-8'>
                No flights match your filter criteria. Try adjusting the filters.
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!filteredFlights && !loading && !error && (
          <div className='text-center px-4 flex-1 flex items-center justify-center'>
            <div className='text-gray-400 font-mono text-sm'>
              Loading flights...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlightSearch;
