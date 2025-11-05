import React, { useState } from 'react';
import './FlightsTab.css';

export default function FlightsTab({ selectedTrip }) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);


  if (!selectedTrip) {
    return (
      <div className="flights-tab">
        <div className="flights-tab__empty">No trip selected</div>
      </div>
    );
  }

  return (
    <div className="flights-tab">
      <div className="flights-tab__header">
        <div className="flights-tab__title-section">
          <h2>Flights</h2>
          <p className="flights-tab__subtitle">
            {selectedTrip.origin || selectedTrip.itinerary_data?.origin} → {selectedTrip.destination || selectedTrip.itinerary_data?.destination}
          </p>
        </div>
        <div className="flights-tab__actions">
          <button className="flights-tab__btn flights-tab__btn--primary">
            SEARCH FLIGHTS
          </button>
        </div>
      </div>

      {loading && (
        <div className="flights-tab__loading">
          <div className="flights-tab__spinner"></div>
          <p>Searching for flights...</p>
        </div>
      )}

      {!loading && flights.length > 0 && (
        <div className="flights-tab__results">
          <h3 className="flights-tab__results-title">Best Flights</h3>
          <div className="flights-tab__list">
            {flights.map((flight, index) => (
              <div key={index} className="flight-card">
                <div className="flight-card__header">
                  <span className="flight-card__airline">{flight.airline}</span>
                  <span className="flight-card__price">${flight.price}</span>
                </div>

                <div className="flight-card__content">
                  <div className="flight-card__timeline">
                    <div className="flight-card__departure">
                      <div className="flight-card__time">{flight.departure.time}</div>
                      <div className="flight-card__airport">{flight.departure.airport}</div>
                    </div>

                    <div className="flight-card__duration">
                      <div className="flight-card__line"></div>
                      <div className="flight-card__info">
                        <div className="flight-card__duration-text">{flight.duration}</div>
                        <div className="flight-card__type">{flight.type}</div>
                        {flight.stopover && (
                          <div className="flight-card__stopover">{flight.stopover}</div>
                        )}
                      </div>
                    </div>

                    <div className="flight-card__arrival">
                      <div className="flight-card__time">{flight.arrival.time}</div>
                      <div className="flight-card__airport">{flight.arrival.airport}</div>
                    </div>
                  </div>
                </div>

                <div className="flight-card__footer">
                  <a
                    href={`https://www.google.com/travel/flights`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flight-card__btn"
                  >
                    BOOK ON GOOGLE FLIGHTS
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && flights.length === 0 && (
        <div className="flights-tab__empty">
          <p>No flights found. Click "SEARCH FLIGHTS" to start searching.</p>
        </div>
      )}
    </div>
  );
}
