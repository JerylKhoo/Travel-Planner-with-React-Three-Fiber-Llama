import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './Components/Login/AuthContext.jsx'
import axios from 'axios';

axios.defaults.baseURL = 'https://travel-planner-with-react-three-fib-beige.vercel.app/';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
