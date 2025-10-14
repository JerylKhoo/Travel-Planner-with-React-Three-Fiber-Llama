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
  const [showAddTripModal, setShowAddTripModal] = useState(false); // can change to some sort of filter?
  
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
      const { data, error } = await supabase
      .from('trips')
      .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) { throw error; }

      // Fetch images for each trip's destination using Pixabay API
      const tripsWithImages = await Promise.all(
        (data || []).map(async (trip) => {
          try {
            const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
            const response = await axios.get("https://pixabay.com/api/", {
              params: {
                key: PIXABAY_API_KEY,
                q: trip.destination,
                image_type: 'photo',
                category: 'travel',
                safesearch: true,
                per_page: 3,
                editors_choice: true
              }
            });

            // Get the first image from results
            const imageUrl = response.data.hits?.[0]?.webformatURL;

            return {
              ...trip,
              image_url: imageUrl || trip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828'
            };
          } catch (error) {
            console.error(`Error fetching image for ${trip.destination}:`, error);
            // Return trip with existing or fallback image if fetch fails
            return {
              ...trip,
              image_url: trip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828'
            };
          }
        })
      );

      setTrips(tripsWithImages);
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

  const handleEditTrip = async (tripId) => {
    setSelectedTrip(tripId);

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
            onClick={() => setShowAddTripModal(true)}
          >
            Cannot find your trip?
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
        </div>

        <div className="trips-list">
          {loading ? (
            <div className="loading">Loading trips...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="no-trips">
              <p>No trips found.</p>
              <button
                className="btn-primary"
                onClick={() => setShowAddTripModal(true)}
              >
                Add Your First Trip
              </button>
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
                    className="btn-delete"
                    onClick={() => handleDeleteTrip(trip.trip_id)}
                  >
                    Delete
                  </button>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditTrip(trip.trip_id)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* <button
          className="btn-add-trip-float"
          onClick={() => setShowAddTripModal(true)}
        >
          + Add New Trip
        </button>

        {showAddTripModal && (
          <div className="modal-overlay" onClick={() => setShowAddTripModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Trip</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowAddTripModal(false)}
                >
                  X
                </button>
              </div>

              <form onSubmit={handleAddTrip} className="trip-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Origin *</label>
                    <input
                      type="text"
                      placeholder="e.g., Singapore (SIN)"
                      value={newTrip.origin}
                      onChange={(e) => setNewTrip({...newTrip, origin: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Destination *</label>
                    <input
                      type="text"
                      placeholder="e.g., Indonesia (DPS)"
                      value={newTrip.destination}
                      onChange={(e) => setNewTrip({...newTrip, destination: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={newTrip.start_date}
                      onChange={(e) => setNewTrip({...newTrip, start_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={newTrip.end_date}
                      onChange={(e) => setNewTrip({...newTrip, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Number of Travelers *</label>
                    <input
                      type="number"
                      min="1"
                      value={newTrip.travelers}
                      onChange={(e) => setNewTrip({...newTrip, travelers: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL (optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newTrip.image_url}
                      onChange={(e) => setNewTrip({...newTrip, image_url: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowAddTripModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Add Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )} */}
      </div>
    </Html>
  );
}

export default MyTrips;
