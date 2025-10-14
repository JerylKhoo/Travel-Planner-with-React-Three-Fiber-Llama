import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import './MyTrips.css';


function MyTrips() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    origin: '',
    destination: '',
    start_date: '',
    end_date: '',
    travelers: 1,
    image_url: ''
  });

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

      if (error) {
        // If database table doesn't exist, use mock data
        console.log('Using mock data - database table not set up yet');
        const mockTrips = [
          {
            id: '1',
            booking_number: '157894001',
            origin: 'Singapore',
            destination: 'Tokyo',
            start_date: '2025-11-15',
            end_date: '2025-11-22',
            travelers: 2,
            booking_date: '2025-10-14',
            status: 'upcoming',
            image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800'
          },
          {
            id: '2',
            booking_number: '157894002',
            origin: 'Los Angeles',
            destination: 'Paris',
            start_date: '2025-12-20',
            end_date: '2025-12-28',
            travelers: 1,
            booking_date: '2025-10-14',
            status: 'upcoming',
            image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800'
          }
        ];
        setTrips(mockTrips);
      } else {
        setTrips(data || []);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrip = async (e) => {
    e.preventDefault();

    try {
      const bookingNumber = `157894${Date.now()}`;

      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            user_id: userId,
            booking_number: bookingNumber,
            origin: newTrip.origin,
            destination: newTrip.destination,
            start_date: newTrip.start_date,
            end_date: newTrip.end_date,
            travelers: parseInt(newTrip.travelers),
            image_url: newTrip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
            status: 'upcoming',
            booking_date: new Date().toISOString().split('T')[0]
          }
        ])
        .select();

      if (error) throw error;

      setNewTrip({
        origin: '',
        destination: '',
        start_date: '',
        end_date: '',
        travelers: 1,
        image_url: ''
      });
      setShowAddTripModal(false);

      fetchTrips();
    } catch (error) {
      console.error('Error adding trip:', error);
      alert('Error adding trip: ' + error.message);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

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
              <div key={trip.id} className="trip-card">
                <div className="trip-card-header">
                  <div className="booking-info">
                    <span className="booking-icon">Plane</span>
                    <span className="booking-label">Booking No.</span>
                    <span className="booking-number">{trip.booking_number}</span>
                    <span className="ticket-status">Tickets issued</span>
                  </div>
                  <div className="booking-date">
                    Booking Date: {formatDate(trip.booking_date)}
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
                      <span className="travelers-count">{trip.travelers} passenger{trip.travelers > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="trip-card-actions">
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteTrip(trip.id)}
                  >
                    Delete
                  </button>
                  <button className="btn-edit">Edit</button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
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
        )}
      </div>
    </Html>
  );
}

export default MyTrips;
