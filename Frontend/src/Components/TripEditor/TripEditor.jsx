import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';
import { supabase } from '../../Config/supabase';

function TripEditor() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);

  const [trip, setTrip] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;

  useEffect(() => {
    if (selectedTrip) {
      fetchTripDetails();
    }
  }, [selectedTrip]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_id', selectedTrip)
        .single();

      if (error) throw error;

      if (data) {
        setTrip(data);
        setIsOwner(data.user_id === userId);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!trip) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('trips')
        .update({
          destination: trip.destination,
          origin: trip.origin,
          start_date: trip.start_date,
          end_date: trip.end_date,
          travellers: trip.travellers,
          status: trip.status,
          itinerary: trip.itinerary
        })
        .eq('trip_id', selectedTrip);

      if (error) throw error;

      alert('Trip updated successfully! Changes are visible to everyone with access.');
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Error saving trip: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setTrip(prev => ({
      ...prev,
      [field]: value
    }));
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
      <div className='text-white p-4'>
        {loading ? (
          <div>Loading trip details...</div>
        ) : !trip ? (
          <div>Trip not found</div>
        ) : (
          <>
            <h2 className='text-2xl mb-4'>Trip Editor</h2>

            {!isOwner && (
              <div style={{
                background: '#4a9eff',
                padding: '10px',
                color: 'white',
                borderRadius: '5px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                Collaborative Trip - Changes are visible to everyone with access
              </div>
            )}

            <div>
              <div className='mb-3'>
                <label>Destination:</label>
                <input
                  type="text"
                  value={trip.destination || ''}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Origin:</label>
                <input
                  type="text"
                  value={trip.origin || ''}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Start Date:</label>
                <input
                  type="date"
                  value={trip.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>End Date:</label>
                <input
                  type="date"
                  value={trip.end_date || ''}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Number of Travellers:</label>
                <input
                  type="number"
                  min="1"
                  value={trip.travellers || 1}
                  onChange={(e) => handleInputChange('travellers', parseInt(e.target.value))}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Status:</label>
                <select
                  value={trip.status || 'upcoming'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className='mb-3'>
                <label>Itinerary:</label>
                <textarea
                  value={trip.itinerary || 'No itinerary available'}
                  onChange={(e) => handleInputChange('itinerary', e.target.value)}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                  rows={10}
                />
              </div>

              <button
                className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed'
                onClick={handleSaveTrip}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </Html>
  )
};

export default TripEditor;