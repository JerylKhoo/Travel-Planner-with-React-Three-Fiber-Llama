import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import { supabase } from '../../Config/supabase';
import axios from 'axios';
import './MyTrips.css';


function MyTrips({ onTripEditHandler }) {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const isDesktop = useStore((state) => state.isDesktop);
  const setSelectedTrip = useStore((state) => state.setSelectedTrip);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showFindTripModal, setShowFindTripModal] = useState(false);
  const [findTripId, setFindTripId] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;
  
  useEffect(() => {
    if (userId) {
      fetchTrips();
    }
  }, [userId]);
  
  const fetchTrips = async () => {
    try {
      setLoading(true);

      // Fetch all trips for this user
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (tripsError) { throw tripsError; }

      // For each trip, fetch its corresponding itinerary data
      const tripsWithItineraries = await Promise.all(
        (tripsData || []).map(async (trip) => {
          try {
            // Fetch itinerary data for this trip
            const { data: itineraryData, error: itineraryError } = await supabase
              .from('itineraries')
              .select('*')
              .eq('trip_id', trip.trip_id)
              .single();

            if (itineraryError) {
              console.error(`Error fetching itinerary for trip ${trip.trip_id}:`, itineraryError);
            }

            // Fetch destination image
            let imageUrl = trip.image_url;
            try {
              const response = await axios.get("/destination-images", {
                params: {
                  destination: trip.destination
                }
              });
              imageUrl = response.data.hits?.[0]?.webformatURL || imageUrl;
            } catch (imgError) {
              console.error(`Error fetching image for ${trip.destination}:`, imgError);
            }

            // Check if this trip is shared (has other users with same trip_id)
            const { data: sharedUsers, error: sharedError } = await supabase
              .from('trips')
              .select('user_id')
              .eq('trip_id', trip.trip_id)
              .neq('user_id', userId);

            const isShared = !sharedError && sharedUsers && sharedUsers.length > 0;

            return {
              ...trip,
              ...itineraryData,
              image_url: imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
              isShared: isShared
            };
          } catch (error) {
            console.error(`Error processing trip ${trip.trip_id}:`, error);
            return {
              ...trip,
              image_url: trip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
              isShared: false
            };
          }
        }
      ));

      setTrips(tripsWithItineraries);
      console.log('Fetched trips with itineraries:', tripsWithItineraries);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  // const handleAddTrip = async (e) => {
  //   e.preventDefault();

  //   try {
  //     const bookingNumber = `157894${Date.now()}`;

  //     const { data, error } = await supabase
  //       .from('trips')
  //       .insert([
  //         {
  //           user_id: userId,
  //           booking_number: bookingNumber,
  //           origin: newTrip.origin,
  //           destination: newTrip.destination,
  //           start_date: newTrip.start_date,
  //           end_date: newTrip.end_date,
  //           travelers: parseInt(newTrip.travelers),
  //           image_url: newTrip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
  //           status: 'upcoming',
  //           booking_date: new Date().toISOString().split('T')[0]
  //         }
  //       ])
  //       .select();

  //     if (error) throw error;

  //     setNewTrip({
  //       origin: '',
  //       destination: '',
  //       start_date: '',
  //       end_date: '',
  //       travelers: 1,
  //       image_url: ''
  //     });
  //     setShowAddTripModal(false);

  //     fetchTrips();
  //   } catch (error) {
  //     console.error('Error adding trip:', error);
  //     alert('Error adding trip: ' + error.message);
  //   }
  // };

  const handleEditTrip = async (trip) => {
    setSelectedTrip(trip);

    if (onTripEditHandler?.current) {
      onTripEditHandler.current();
    }
  };
  
  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('trip_id', tripId);

      if (error) throw error;

      fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip: ' + error.message);
    }
  };

  const handleCopyTripId = async (tripId) => {
    try {
      await navigator.clipboard.writeText(tripId);
      setCopySuccess(tripId);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Error copying trip ID:', error);
      alert('Failed to copy trip ID');
    }
  };

  const handleJoinTrip = async (e) => {
    e.preventDefault();

    if (!findTripId.trim()) {
      alert('Please enter a trip ID');
      return;
    }

    try {
      setLoading(true);

      // Check if the trip exists and fetch its data
      const { data: originalTrip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_id', findTripId)
        .limit(1)
        .single();

      if (tripError) {
        console.error('Trip fetch error:', tripError);
        throw new Error('Trip not found. Please check the trip ID.');
      }

      // Check if user already has this trip
      const { data: existingTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_id', findTripId)
        .eq('user_id', userId)
        .single();

      if (existingTrip) {
        throw new Error('You already have access to this trip!');
      }

      // Create a new entry in trips table with SAME trip_id but different user_id
      // Only include fields that exist in the trips table (no image_url!)
      const { error: insertError } = await supabase
        .from('trips')
        .insert([{
          trip_id: findTripId, // Keep the SAME trip_id
          user_id: userId, // Different user_id
          origin: originalTrip.origin,
          destination: originalTrip.destination,
          start_date: originalTrip.start_date,
          end_date: originalTrip.end_date,
          travellers: originalTrip.travellers,
          status: originalTrip.status
        }]);

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      alert('Trip added successfully! You can now view and edit this shared trip.');
      setShowFindTripModal(false);
      setFindTripId('');
      fetchTrips();
    } catch (error) {
      console.error('Error joining trip:', error);
      alert(error.message || 'Error joining trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const filteredTrips = activeTab === 'all'
    ? trips
    : activeTab === 'shared'
    ? trips.filter(trip => trip.isShared === true)
    : activeTab === 'upcoming'
    ? trips.filter(trip => trip.status === 'upcoming')
    : trips.filter(trip => trip.status === activeTab);

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
      <div className="trip-planner-container" style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
        maxHeight: `${pixelHeight}px`,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <div className="trip-planner-header">
          <h1 className="trip-planner-title">My Trips</h1>
          <button
            className="add-trip-link"
            onClick={() => setShowFindTripModal(true)}
          >
            Find a Trip
          </button>
        </div>

        <div className="trip-tabs">
          <button
            className={`trip-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`trip-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`trip-tab ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared
          </button>
        </div>

        <div className="trips-list">
          {loading ? (
            <div className="loading">Loading trips...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="no-trips">
              <p>No trips found. {activeTab === 'shared' ? 'Use "Find a Trip" to add shared trips.' : ''}</p>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <div key={trip.trip_id} className="trip-card">
                <div className="trip-card-header">
                  <div className="booking-info">
                    <span className="booking-icon"
                      style={{ color: trip.status == "upcoming" ? 'yellow' : (trip.status == "completed") ? 'green' : 'red' }}
                    >
                      { trip.status == "upcoming" ? '🗓️ Upcoming Trip' : (trip.status == "completed") ? '🏁 Trip Completed & Memories Made' : '🚫 Trip Cancelled' }
                    </span>
                    {trip.isShared && (
                      <span className="shared-trip-badge" title="This trip is shared with you">
                        🤝 Shared
                      </span>
                    )}
                  </div>
                  <div className="booking-date">
                    Created on: {formatDate(trip.created_at)}
                  </div>
                </div>

                <div className="trip-card-body">
                  <div className="trip-image">
                    <img src={trip.image_url} alt={trip.destination} />
                  </div>

                  <div className="trip-details">
                    <div className="trip-route">
                      <span className="origin">{trip.origin}</span>
                      <span className="arrow">to</span>
                      <span className="destination">{trip.destination}</span>
                    </div>

                    <div className="trip-dates">
                      <div className="date-range">
                        <span className="start-date">{formatDate(trip.start_date)}</span>
                        <div className="duration-line">
                          <span className="duration-badge">{calculateDuration(trip.start_date, trip.end_date)} days</span>
                        </div>
                        <span className="end-date">{formatDate(trip.end_date)}</span>
                      </div>
                    </div>

                    <div className="trip-travelers">
                      <span>Travelers: </span>
                      <span className="travelers-count">{trip.travellers} passenger{trip.travellers > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="trip-card-actions">
                  <button
                    className="btn-copy-id"
                    onClick={() => handleCopyTripId(trip.trip_id)}
                    title="Copy Trip ID to share with friends"
                  >
                    {copySuccess === trip.trip_id ? 'Copied!' : 'Copy Trip ID'}
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteTrip(trip.trip_id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn-edit"
                    //addition 1 change from trip.trip_id to trip
                    onClick={() => handleEditTrip(trip)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {showFindTripModal && (
          <div className="modal-overlay" onClick={() => setShowFindTripModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Find a Trip</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowFindTripModal(false)}
                >
                  X
                </button>
              </div>

              <form onSubmit={handleJoinTrip} className="trip-form">
                <div className="form-group">
                  <label>Trip ID *</label>
                  <input
                    type="text"
                    placeholder="Paste your friend's trip ID here"
                    value={findTripId}
                    onChange={(e) => setFindTripId(e.target.value)}
                    required
                  />
                  <p className="help-text">
                    Ask your friend to copy their Trip ID from their trip card and paste it here.
                    You'll get a copy of their itinerary that you can edit.
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowFindTripModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Adding Trip...' : 'Add Trip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

export default MyTrips;
