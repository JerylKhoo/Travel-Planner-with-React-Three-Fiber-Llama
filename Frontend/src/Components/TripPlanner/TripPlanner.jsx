import React from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';

function TripPlanner() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isDesktop = useStore((state) => state.isDesktop);
  const selectedTrip = useStore((state) => state.selectedTrip);

  const pixelWidth = (isDesktop ? 9.44 : 3.92) * 100;
  const pixelHeight = 550;

  // Remember to set selected Trip 

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
      <div className='text-white'>testing</div>
      {/* PUT YOUR TRIPS PLANNER PORTION HERE */}
      {/* I have added userId, userEmail for you to call the supabase to get the trips*/}
    </Html>
  )
};

export default TripPlanner;