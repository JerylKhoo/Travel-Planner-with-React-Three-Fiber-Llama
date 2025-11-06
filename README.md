# Travel Planner with React Three Fiber & Llama

An interactive 3D travel planning application that combines immersive visualization with AI-powered recommendations.

## 🌟 Features

- **3D Interactive Globe/Map**: Visualize destinations in an immersive 3D environment using React Three Fiber
- **AI-Powered Planning**: Leverage Groq API (Llama model) for intelligent travel recommendations and itinerary generation
- **Destination Exploration**: Browse and explore travel destinations with rich 3D visualizations
- **Personalized Itineraries**: Get customized travel plans based on your preferences
- **Interactive UI**: Seamless user experience with smooth 3D animations and transitions

## 🛠️ Tech Stack

### Frontend
- **Framework**: React
- **Build Tool**: Vite
- **3D Graphics**: React Three Fiber, Three.js
- **Animation**: GSAP (GreenSock Animation Platform)
- **Styling**: Tailwind CSS
- **State Management**: Zustand

### Backend
- **Server**: Express.js (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: OAuth 2.0

### AI & APIs
- **AI Model**: Groq API (Llama model)
- **Maps**: Google Maps API
- **Images**: Pixabay API
- **Travel Data**: Wikipedia API
- **Flights & Hotels**: SerpApi (Google Flights & Hotels Web Scrape)

### Hosting
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn package manager

You will also need to obtain the following API keys:

**Backend API Keys:**
- **Groq API Key**: For AI travel itinerary generation ([Get it here](https://console.groq.com))
- **Pixabay API Key**: For destination images ([Get it here](https://pixabay.com/api/docs/))
- **SerpApi API Key**: For flight and hotel searches ([Get it here](https://serpapi.com/))

**Frontend API Keys:**
- **Supabase URL & Anon Key**: For database and authentication ([Get it here](https://supabase.com))
- **Google Maps API Key**: For Maps JavaScript API ([Get it here](https://developers.google.com/maps))

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/JerylKhoo/Travel-Planner-with-React-Three-Fiber-Llama.git
cd Travel-Planner-with-React-Three-Fiber-Llama
```

### 2. Backend Setup

Navigate to the Backend directory:
```bash
cd Backend
```

Install backend dependencies:
```bash
npm install
```

Set up backend environment variables:
```bash
cp .env.example .env
```

Edit `Backend/.env` and add your API keys:
```env
# Groq API (for AI travel itinerary generation)
GROQ_API_KEY=your_groq_api_key_here

# Pixabay API
PIXABAY_API_KEY=your_pixabay_api_key_here

# SERP API (for flight and hotel searches)
SERP_API_KEY=your_serpapi_api_key_here
```

Start the backend server:
```bash
node index.js
```

The backend server will run on `http://localhost:3000`

### 3. Frontend Setup

Open a new terminal and navigate to the Frontend directory:
```bash
cd Frontend
```

Install frontend dependencies:
```bash
npm install
```

Set up frontend environment variables:
```bash
cp .env.example .env
```

Edit `Frontend/.env` and add your API keys:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps API (Required for frontend Maps JavaScript API)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Start the frontend development server:
```bash
npm run dev
```

The application will open at `http://localhost:5173`

**Important**: Both backend and frontend servers must be running simultaneously for the application to work properly.

## 📦 Project Structure

```
Travel-Planner-with-React-Three-Fiber-Llama/
├── public/
│   ├── models/          # 3D models and assets
│   └── textures/        # Textures for 3D objects
├── src/
│   ├── components/      # React components
│   │   ├── Scene/       # Three.js scene components
│   │   ├── UI/          # User interface components
│   │   └── AI/          # AI integration components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and service functions
│   ├── utils/           # Utility functions
│   ├── styles/          # CSS/styling files
│   ├── App.js           # Main application component
│   └── index.js         # Application entry point
├── .env.example         # Environment variables template
├── package.json         # Project dependencies
└── README.md           # Project documentation
```

## 🎮 Usage

1. **Register/Login**: Create an account or login using OAuth 2.0
2. **Explore Destinations**: Navigate the 3D globe/map to discover travel destinations
3. **Get AI Recommendations**: Ask the AI assistant for travel suggestions
4. **Create Itinerary**: Build your personalized travel plan with AI assistance
5. **Book Flights & Hotels**: Search and compare options using SerpApi integration
6. **Save & Share**: Save your travel plans to your account

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

**Jeryl Khoo**
- GitHub: [@JerylKhoo](https://github.com/JerylKhoo)

**Yi Xiang**
- GitHub: [@yixiang07](https://github.com/yixiang07)

**Rochelle**
- GitHub: [@lihanchong-cloud](https://github.com/lihanchong-cloud)

**Matthew**
- GitHub: [@mattlkz](https://github.com/mattlkz)

**Zhuo Yu**
- GitHub: [@yongzhuoyu](https://github.com/yongzhuoyu)

## 🙏 Acknowledgments

- React Three Fiber community for excellent 3D React integration
- Groq for providing access to the Llama language model
- Three.js for the powerful 3D graphics library
- All contributors who help improve this project

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Weather integration
- [ ] Advanced flight and hotel booking features
- [ ] Social features (share itineraries with friends)
- [ ] Mobile app version
- [ ] Offline mode support
- [ ] Real-time collaboration on trip planning

## 📫 Contact

For questions or feedback, please open an issue on GitHub

---

Made with ❤️ using React Three Fiber and Groq AI
