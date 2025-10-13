import React from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '../../Store/useStore';

function MyTrips() {
  // Get userId from Zustand
  const userId = useStore((state) => state.userId);
  const userEmail = useStore((state) => state.userEmail);
  const isLoggedIn = useStore((state) => state.isLoggedIn);

  return (
    <div>
      <h1>MyTrips</h1>
      {isLoggedIn ? (
        <div>
          <p>User ID: {userId}</p>
          <p>Email: {userEmail}</p>
        </div>
      ) : (
        <p>Please log in to view your trips</p>
      )}
    </div>
  )
}

export default MyTrips