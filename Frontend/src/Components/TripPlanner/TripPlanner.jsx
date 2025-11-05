import React, { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import Button from '@mui/material/Button';
import axios from 'axios';
import { supabase } from '../../Config/supabase';
import './TripPlanner.css';
import { CircleLoader } from "react-spinners";

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

/**
 * Transforms the Travel Planner API response to match the TripEditor format
 * @param {Object} apiResponse - The response from /travel-planner API
 * @param {Date} startDate - Trip start date
 * @param {Object} selectedLocation - The selected destination
 * @returns {Object} Transformed data for Supabase
 */
function transformApiResponseToItinerary(apiResponse, startDate, selectedLocation) {
  console.log('Transform function received:', apiResponse);

  const itineraryData = apiResponse.itinerary;
  console.log('Itinerary data:', itineraryData);

  // Add validation
  if (!itineraryData) {
    throw new Error('No itinerary data found in API response');
  }

  if (!itineraryData.steps || !Array.isArray(itineraryData.steps)) {
    console.error('Invalid itinerary structure:', itineraryData);
    throw new Error('Invalid itinerary structure: steps array is missing or invalid');
  }

  const itineraryArray = [];
  const dayTitlesMap = {};
  const activityNotesMap = {};

  // Helper function to format date without timezone issues
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Process each day
  itineraryData.steps.forEach((dayObj, dayIndex) => {
    const dayKey = `day ${dayIndex + 1}`;
    const dayData = dayObj[dayKey];

    // Calculate the actual date for this day
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + dayIndex);
    const dateString = formatDateLocal(currentDate); // YYYY-MM-DD format without timezone shift

    // Store the day title
    dayTitlesMap[dateString] = dayData.title;

    // Process each activity in the day
    const activities = dayData.activities;
    Object.keys(activities).forEach((activityKey) => {
      const activity = activities[activityKey];

      // Generate unique ID for this activity
      const activityId = `activity-${dateString}-${activityKey}`;

      // Create itinerary item in TripEditor format
      const itineraryItem = {
        id: activityId,
        date: dateString,
        title: activity.location_name,
        description: activity.location_description,
        destination: activity.location_name,
        startTime: '', // Can be enhanced if you want to add time slots
        endTime: '',
        image_url: '', // Will be fetched by Google Places API in TripEditor
        location: {
          lat: parseFloat(activity.location_latitude),
          lng: parseFloat(activity.location_longitude),
        },
      };

      itineraryArray.push(itineraryItem);

      // Store activity notes separately
      if (activity.notes) {
        activityNotesMap[activityId] = activity.notes;
      }
    });
  });

  return {
    itinerary: itineraryArray,
    dayTitles: dayTitlesMap,
    activityNotes: activityNotesMap,
    context: itineraryData.context,
    tips: itineraryData.tips,
  };
}

function TripPlanner() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const setSelectedTrip = useStore((state) => state.setSelectedTrip);

  const mapsReady = useGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState(2500);
  const [pax, setPax] = useState(1);
  const [remarks, setRemarks] = useState('');
  const selectedCity = useStore((state) => state.selectedCity);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const searchInitializedRef = useRef(false);

  // Initialize selectedLocation from selectedCity when it changes
  useEffect(() => {
    if (selectedCity) {
      setSelectedLocation(selectedCity);
    }
  }, [selectedCity]);

  // Initialize the search autocomplete elements when Google Maps is ready
  useEffect(() => {
    async function initSearch() {
      if (!mapsReady || searchInitializedRef.current) return;

      const originSearchElement = document.getElementById("origin-search");
      const destinationSearchElement = document.getElementById("destination-search");

      if (!originSearchElement || !destinationSearchElement) return;

      try {
        // Request needed libraries
        await google.maps.importLibrary("places");

        // Create the ORIGIN place autocomplete element
        const originAutocomplete = new google.maps.places.PlaceAutocompleteElement({
          includedPrimaryTypes: ['country', 'locality'],
        });

        originSearchElement.appendChild(originAutocomplete);

        // Add the gmp-placeselect listener for ORIGIN
        originAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

          // Extract the display name - it might be a string or have a 'string' property
          const displayName = place.Dg?.displayName?.string || place.Dg?.displayName || place.displayName || place.formattedAddress;
          console.log('Origin selected:', displayName, place); // Debug log
          setOrigin(displayName);
        });

        // Create the DESTINATION place autocomplete element
        const destinationAutocomplete = new google.maps.places.PlaceAutocompleteElement({
          includedPrimaryTypes: ['country', 'locality'],
        });

        destinationSearchElement.appendChild(destinationAutocomplete);

        // Add the gmp-placeselect listener for DESTINATION
        destinationAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

          // Extract the display name and location properly
          const displayName = place.Dg?.displayName?.string || place.Dg?.displayName || place.displayName || place.formattedAddress;
          const location = place.Dg?.location || place.location;

          const newLocation = {
            position: {
              lat: location.lat(),
              lng: location.lng()
            },
            name: displayName
          };

          console.log('Destination selected:', newLocation); // Debug log
          setSelectedLocation(newLocation);
        });

        searchInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize search:', error);
      }
    }

    initSearch();
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 1.3521, lng: 103.8198 }, // Singapore as default
      zoom: 9,
      disableDefaultUI: true,
      styles: [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"color":"#39ff41"},{"visibility":"on"},{"saturation":0}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#383838"},{"visibility":"on"},{"saturation":0}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#636363"},{"visibility":"on"},{"saturation":0}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#383838"},{"visibility":"on"},{"saturation":0}]},{"featureType":"water","elementType":"","stylers":[{"color":"#141414"},{"visibility":"on"},{"saturation":0}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"all","elementType":"labels.text","stylers":[{"visibility":"on"}]},{"featureType":"administrative.country","elementType":"labels.text","stylers":[{"visibility":"on"}]},{"featureType":"administrative.province","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text","stylers":[{"visibility":"on"}]},{"featureType":"road","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text","stylers":[{"visibility":"on"}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"off"}]}],
      // EDIT THE ABOVE TO CHANGE THE STYLE OF THE MAP
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !selectedLocation || !mapInstanceRef.current) return;

    const position = selectedLocation.position;
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(9);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current
      });
    }

    markerRef.current.setPosition(position);
    markerRef.current.setTitle(selectedLocation.name);
  }, [mapsReady, selectedLocation]);

  const handleCreateTrip = async () => {
    // Validation check
    console.log('Validation check:', {
      selectedLocation,
      dateFrom,
      dateTo,
      origin,
      isLoggedIn,
      userId,
      hasLocation: !!selectedLocation,
      hasDateFrom: !!dateFrom,
      hasDateTo: !!dateTo,
      hasOrigin: !!origin
    });

    if (!selectedLocation || !dateFrom || !dateTo || !origin) {
      alert('Please choose a destination and both start/end dates before creating your trip.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Call Travel Planner API to generate itinerary
      console.log('Calling travel planner API...');
      const travelPlannerResponse = await axios.post(`http://localhost:3000/travel-planner`, {
        destination: selectedLocation.name,
        duration: Math.ceil((dateTo - dateFrom) / (1000 * 60 * 60 * 24)) + 1,
        pax: pax,
        budget: budget,
        remarks: remarks,
      });

      console.log('Travel planner response received:', travelPlannerResponse.data);

      // Step 2: Transform the API response to TripEditor format
      const transformedData = transformApiResponseToItinerary(
        travelPlannerResponse.data,
        dateFrom,
        selectedLocation
      );

      console.log('Data transformed:', transformedData);

      // Step 3: Check if user is logged in
      if (isLoggedIn && userId) {
        // User is logged in - save to Supabase
        console.log('User is logged in, saving to Supabase...');

        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Step 3.1: First, create the trip metadata in trips table
        const tripMetadata = {
          user_id: userId,
          origin: origin,
          destination: selectedLocation.name,
          start_date: formatDate(dateFrom),
          end_date: formatDate(dateTo),
          travellers: pax,
          status: 'upcoming',
        };

        const { data: savedTripMetadata, error: tripError } = await supabase
          .from('trips')
          .insert(tripMetadata)
          .select()
          .single();

        if (tripError) {
          console.error('Trip metadata save error:', tripError);
          setLoading(false);
          alert(`Failed to save trip: ${tripError.message}`);
          return;
        }

        console.log('Trip metadata saved:', savedTripMetadata);

        // Step 3.2: Now create the itinerary using the trip_id from trips table
        const itineraryData = {
          trip_id: savedTripMetadata.trip_id,
          itinerary_data: {
            destination: selectedLocation.name,
            destination_lat: selectedLocation.position.lat,
            destination_lng: selectedLocation.position.lng,
            start_date: formatDate(dateFrom),
            end_date: formatDate(dateTo),
            origin: origin,
            budget: budget,
            travelers: pax,
            remarks: remarks,
            itinerary: transformedData.itinerary,
            day_titles: transformedData.dayTitles,
            activity_notes: transformedData.activityNotes,
            context: transformedData.context,
            tips: transformedData.tips,
          },
        };

        const { data: savedItinerary, error: itineraryError } = await supabase
          .from('itineraries')
          .insert(itineraryData)
          .select()
          .single();

        if (itineraryError) {
          console.error('Itinerary save error:', itineraryError);
          // Rollback: delete the trip metadata we just created
          await supabase.from('trips').delete().eq('trip_id', savedTripMetadata.trip_id);
          setLoading(false);
          alert(`Failed to save itinerary: ${itineraryError.message}`);
          return;
        }

        console.log('Itinerary saved to Supabase:', savedItinerary);

        // Set the selected trip in Zustand store (this will switch to TripEditor)
        setSelectedTrip(savedItinerary);

        setLoading(false);
        alert('Trip created successfully!');

      } else {
        // User is NOT logged in - show trip preview without saving
        console.log('User not logged in, showing preview only...');

        // Create a temporary trip object for preview
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const tempTrip = {
          trip_id: 'temp-' + Date.now(),
          cityname: selectedLocation.name,
          itinerary_data: {
            destination: selectedLocation.name,
            destination_lat: selectedLocation.position.lat,
            destination_lng: selectedLocation.position.lng,
            start_date: formatDate(dateFrom),
            end_date: formatDate(dateTo),
            origin: origin,
            budget: budget,
            travelers: pax,
            remarks: remarks,
            itinerary: transformedData.itinerary,
            day_titles: transformedData.dayTitles,
            activity_notes: transformedData.activityNotes,
            context: transformedData.context,
            tips: transformedData.tips,
          },
        };

        // Set the temp trip (this will switch to TripEditor in preview mode)
        setSelectedTrip(tempTrip);

        setLoading(false);
        alert('Trip preview generated! Note: Log in to save your trip.');
      }

    } catch (error) {
      console.error('Error creating trip:', error);
      setLoading(false);

      if (error.response) {
        console.error('API Error Response:', error.response.data);
        alert(`Failed to create trip: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      } else if (error.message) {
        alert(`Failed to create trip: ${error.message}`);
      } else {
        alert('Failed to create trip. Please try again.');
      }
    }
  };

  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550; 

  const increment = () => {
    if (pax < 11) {
      setPax(pax + 1);
    }
  };

  const decrement = () => {
    if (pax > 1) {
      setPax(pax - 1);
    }
  };

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
      {!loading ? (
        <div className="h-full">
          <div className='grid grid-cols-10 gap-3 h-full'>
            {/* Left column - Inputs section (60% width) */}
            <div className='col-span-6 flex flex-col gap-3'>
              {/* Origin & Destination row */}
              <div className='grid grid-cols-2 gap-3 mx-4 mt-4'>
                <div>
                  <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Origin Country/City</label>
                  <div id='origin-search' />
                </div>
                <div>
                  <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Destination Country/City</label>
                  <div id='destination-search' />
                </div>
              </div>
              
              {/* Additional inputs below */}
              <div className='grid grid-cols-2 gap-3 mx-4'>
                <div>
                  <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">Start Date</label>
                  <DatePicker
                    selected={dateFrom}
                    onChange={(date) => {
                      setDateFrom(date);
                      if (date && dateTo && date > dateTo) setDateTo(null);
                      setTimeout(() => {
                        if (endDatePickerRef.current?.setFocus) {
                          endDatePickerRef.current.setFocus();
                        } else if (endDatePickerRef.current?.input) {
                          endDatePickerRef.current.input.focus();
                        }
                      }, 0);
                    }}
                    selectsStart
                    startDate={dateFrom}
                    endDate={dateTo}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Select start date"
                    className="trip-date-input"
                    calendarClassName="trip-date-calendar"
                    popperPlacement="bottom-start"
                    showPopperArrow={false}
                    isClearable
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs text-[#39ff41] font-mono ml-1">End Date</label>
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
                    ref={endDatePickerRef}
                  />
                </div>
              </div>
              
              {/* More inputs can go here */}
              <div className='mx-4'>
                <label className="block text-xs text-[#39ff41] font-mono">Budget: ${budget}</label>
                <Box>
                  <Slider
                    sx={{color: '#39ff41'}}
                    value={budget}
                    onChange={(event, newValue) => setBudget(newValue)}
                    aria-label="Small"
                    valueLabelDisplay="auto"
                    min={500}
                    max={7000}
                  />
                </Box>
              </div>

              <div className='mx-4'>
                <div className='grid grid-cols-10 gap-2'>
                  <div className='flex flex-col items-center col-span-4'>
                    <label className="mb-2 text-xs text-[#39ff41] font-mono">Number of Travellers: {pax < 11 ? pax : '10+'}</label>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <IconButton sx={{color: '#39ff41'}} onClick={decrement}>
                        <RemoveCircleIcon />
                      </IconButton>
                      <IconButton sx={{color: '#39ff41'}} onClick={increment}>
                        <AddCircleIcon />
                      </IconButton>
                    </Stack>
                  </div>
                  <div className='flex col-span-6 items-center justify-center text-mono text-md text-[##39ff41]'>
                    <img src={`/travellers/${pax}.png`} alt={`${pax} travellers`} />
                  </div>
                </div>
              </div>

              <div className='mx-4'>
                <label className="block mb-2 text-xs text-[#39ff41] font-mono">Additional Preferences</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional preferences or requirements..."
                  className="w-full p-2 border border-[#39ff41] bg-transparent text-white rounded h-17"
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div className='flex items-center justify-center'>
                <Button
                  variant="outlined"
                  size="medium"
                  sx={{
                    color: '#39ff41',
                    borderColor: '#39ff41',
                    '&:hover': {
                      borderColor: '#39ff41',
                      backgroundColor: 'rgba(57, 255, 65, 0.1)',
                    },
                  }}
                  onClick={handleCreateTrip}
                >
                  Create Itinerary
                </Button>
              </div>
            </div>
            
            {/* Right column - Map section (40% width) */}
            <div className='col-span-4 pt-4 pr-4 pb-4'>
              <div className="h-full w-full border border-[#39ff41] rounded-lg flex items-center justify-center bg-gray-900">
                {/* Your map component will go here */}
                <div ref={mapContainerRef} className="trip-map-container" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='w-full h-full flex flex-col justify-center items-center gap-4'>
          <CircleLoader
            color="#39ff41"
            size={100}
          />
          <div className='text-[#39ff41] font-mono text-lg'>Generating Itinerary...</div>
        </div>
      )}
    </Html>
  )
};

export default TripPlanner;