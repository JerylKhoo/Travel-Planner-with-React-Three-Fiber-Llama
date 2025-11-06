import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelsTab.css';

export default function HotelsTab({ selectedTrip }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedStars, setSelectedStars] = useState([5, 4, 3]);
  const [sortBy, setSortBy] = useState('recommended');

  const searchHotels = async () => {
    if (!selectedTrip?.itinerary_data) {
      setError('No trip data available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { destination, start_date, end_date, travelers } = selectedTrip.itinerary_data;

      const response = await axios.get('/hotels', {
        params: {
          destination: destination,
          checkIn: start_date,
          checkOut: end_date,
          guests: travelers || 2,
          currency: 'USD'
        }
      });

      const hotelsData = response.data.properties || [];
      setHotels(hotelsData);

    } catch (err) {
      console.error('Error fetching hotels:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch hotels');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load hotels when component mounts or selectedTrip changes
  useEffect(() => {
    if (selectedTrip?.itinerary_data) {
      searchHotels();
    }
  }, [selectedTrip]);


  const formatPrice = (price) => {
    if (!price || price === undefined || price === null) return 'Check Availability';
    if (typeof price === 'string') return price;
    return `$${price}`;
  };

  const toggleStar = (star) => {
    setSelectedStars(prev =>
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };

  if (!selectedTrip) {
    return (
      <div className="hotels-tab-list">
        <div className="hotels-tab-list__empty">No trip selected</div>
      </div>
    );
  }

  // Filter hotels by price and stars
  const filteredHotels = hotels.filter(hotel => {
    const price = hotel.rate_per_night?.extracted_lowest || 0;
    const stars = parseInt(hotel.hotel_class) || 0;
    return price >= priceRange[0] && price <= priceRange[1] && selectedStars.includes(stars);
  });

  return (
    <div className="hotels-tab-list">
      <div className="hotels-tab-list__content">
        <div className="hotels-tab-list__header">
          <div className="hotels-tab-list__title-section">
            <h2>Best Hotels</h2>
            {hotels.length > 0 && (
              <p className="hotels-tab-list__results-count">
                Showing {filteredHotels.length} of {hotels.length} hotels
              </p>
            )}
          </div>
          <div className="hotels-tab-list__header-controls">
            <div className="hotels-tab-list__price-filter">
              <label>Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
              <div className="hotels-tab-list__price-inputs">
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                  className="hotels-tab-list__price-input"
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                  className="hotels-tab-list__price-input"
                  placeholder="Max"
                />
              </div>
            </div>
            <div className="hotels-tab-list__star-filter">
              <label>Star Rating</label>
              <div className="hotels-tab-list__star-buttons">
                {[5, 4, 3, 2, 1].map(star => (
                  <button
                    key={star}
                    className={`hotels-tab-list__star-btn ${selectedStars.includes(star) ? 'active' : ''}`}
                    onClick={() => toggleStar(star)}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="hotels-tab-list__loading">
            <div className="hotels-tab-list__spinner"></div>
            <p>Searching for hotels...</p>
          </div>
        )}

        {error && (
          <div className="hotels-tab-list__error">
            <p>Error: {error}</p>
          </div>
        )}

        {!loading && !error && hotels.length === 0 && (
          <div className="hotels-tab-list__empty">
            <p>No Hotels Found</p>
          </div>
        )}

        {!loading && filteredHotels.length > 0 && (
          <div className="hotels-tab-list__results">
            {filteredHotels.map((hotel, index) => (
              <div key={index} className="hotel-list-card">
                <div className="hotel-list-card__image">
                  {(() => {
                    // Extract image from SerpAPI Google Hotels response
                    // Use backend proxy to avoid CORS and rate limiting
                    const googleImageUrl = hotel.images?.[0]?.thumbnail || hotel.images?.[0]?.link;

                    const imageUrl = googleImageUrl
                      ? `${axios.defaults.baseURL}/proxy-image?url=${encodeURIComponent(googleImageUrl)}`
                      : `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop`;

                    return <img
                      src={imageUrl}
                      alt={hotel.name}
                      onError={(e) => {
                        console.log(`Image failed for ${hotel.name}, trying fallback`);
                        e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop';
                      }}
                    />;
                  })()}
                </div>

                <div className="hotel-list-card__info">
                  <div className="hotel-list-card__top">
                    <div>
                      <h3 className="hotel-list-card__name">{hotel.name}</h3>
                      {hotel.hotel_class && (
                        <div className="hotel-list-card__stars">
                          {'★'.repeat(parseInt(hotel.hotel_class))}
                        </div>
                      )}
                      <p className="hotel-list-card__description">{hotel.description || hotel.type}</p>
                    </div>
                    <div className="hotel-list-card__price-section">
                      <div className="hotel-list-card__price">
                        {formatPrice(hotel.rate_per_night?.lowest || hotel.total_rate?.lowest)}
                      </div>
                      {(hotel.rate_per_night?.lowest || hotel.total_rate?.lowest) && (
                        <div className="hotel-list-card__price-label">per night</div>
                      )}
                    </div>
                  </div>

                  <div className="hotel-list-card__details">
                    {hotel.ratings && hotel.ratings[0] && (
                      <div className="hotel-list-card__rating">
                        <span className="hotel-list-card__rating-score">
                          {hotel.ratings[0].stars}/5
                        </span>
                        <span className="hotel-list-card__rating-count">
                          {hotel.ratings[0].count}
                        </span>
                      </div>
                    )}

                    {hotel.amenities && (
                      <div className="hotel-list-card__amenities">
                        {hotel.amenities.slice(0, 3).map((amenity, i) => (
                          <span key={i} className="hotel-list-card__amenity">{amenity}</span>
                        ))}
                      </div>
                    )}

                    <a
                      href={hotel.link || 'https://www.google.com/travel/hotels'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hotel-list-card__btn"
                    >
                      BOOK
                    </a>
                  </div>

                  {hotel.total_rate && (
                    <p className="hotel-list-card__total">
                      {formatPrice(hotel.total_rate.lowest)} total
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
