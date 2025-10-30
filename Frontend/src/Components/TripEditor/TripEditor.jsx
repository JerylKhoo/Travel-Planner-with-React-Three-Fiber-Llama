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
                📤 This is a shared trip (read-only). Only the creator can edit it.
              </div>
            )}

            <div style={{ opacity: isOwner ? 1 : 0.6 }}>
              <div className='mb-3'>
                <label>Destination:</label>
                <input
                  type="text"
                  value={trip.destination}
                  disabled={!isOwner}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Origin:</label>
                <input
                  type="text"
                  value={trip.origin}
                  disabled={!isOwner}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                />
              </div>

              <div className='mb-3'>
                <label>Itinerary:</label>
                <textarea
                  value={trip.itinerary || 'No itinerary available'}
                  disabled={!isOwner}
                  className='w-full p-2 bg-gray-800 text-white rounded'
                  rows={10}
                />
              </div>

              {isOwner && (
                <button
                  className='bg-green-500 text-white px-4 py-2 rounded'
                  onClick={() => alert('Save functionality to be implemented')}
                >
                  Save Changes
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Html>
  )
};

export default TripEditor;