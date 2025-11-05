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

      const response = await axios.get('http://localhost:3000/hotels', {
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

  const loadMockData = () => {
    const mockHotels = [
      {
        name: 'Kayu Suar Bali Luxury Villas Spa',
        type: 'vacation rental',
        description: '2.5 km from city center',
        rate_per_night: { lowest: '$565', extracted_lowest: 565 },
        total_rate: { lowest: '$4,520 total', extracted_lowest: 4520 },
        hotel_class: '5',
        ratings: [{ stars: 4.8, count: '245 reviews' }],
        images: [{
          thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop'
        }],
        amenities: ['Pool', 'Free WiFi', 'Spa', 'Restaurant'],
        link: 'https://www.google.com/travel/hotels'
      },
      {
        name: 'Thula Thula Bali Villas',
        type: 'Hotel',
        description: '1.2 km from beach',
        rate_per_night: { lowest: '$425', extracted_lowest: 425 },
        total_rate: { lowest: '$3,400 total', extracted_lowest: 3400 },
        hotel_class: '4',
        ratings: [{ stars: 4.6, count: '189 reviews' }],
        images: [{
          thumbnail: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop'
        }],
        amenities: ['Beach access', 'Free WiFi', 'Gym'],
        link: 'https://www.google.com/travel/hotels'
      },
      {
        name: 'Villa Seminyak Estate & Spa',
        type: 'vacation rental',
        description: '0.8 km from Seminyak Square',
        rate_per_night: { lowest: '$380', extracted_lowest: 380 },
        total_rate: { lowest: '$3,040 total', extracted_lowest: 3040 },
        hotel_class: '4',
        ratings: [{ stars: 4.7, count: '312 reviews' }],
        images: [{
          thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=300&fit=crop'
        }],
        amenities: ['Pool', 'Kitchen', 'Free parking'],
        link: 'https://www.google.com/travel/hotels'
      }
    ];
    setHotels(mockHotels);
    setLoading(false);
    setError(null);
  };

  const formatPrice = (price) => {
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
            <button
              className="hotels-tab-list__btn hotels-tab-list__btn--primary"
              onClick={searchHotels}
            >
              SEARCH HOTELS
            </button>
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
            <button className="hotels-tab-list__btn" onClick={loadMockData}>
              Load Mock Data Instead
            </button>
          </div>
        )}

        {!loading && !error && hotels.length === 0 && (
          <div className="hotels-tab-list__empty">
            <p>No Hotels Found. Click "SEARCH HOTELS"</p>
          </div>
        )}

        {!loading && filteredHotels.length > 0 && (
          <div className="hotels-tab-list__results">
            {filteredHotels.map((hotel, index) => (
              <div key={index} className="hotel-list-card">
                <div className="hotel-list-card__image">
                  {hotel.images && hotel.images[0] ? (
                    <img src={hotel.images[0].thumbnail} alt={hotel.name} />
                  ) : (
                    <div className="hotel-list-card__image-placeholder">No Image</div>
                  )}
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
                      <div className="hotel-list-card__price-label">per night</div>
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
