import React from 'react';
import {
  formatDateLabel,
  makeDaySectionId,
} from './ItineraryUtils.js';
import './ItineraryNav.css';

export default function ItineraryNav({ itineraryDays }) {
  const handleScrollToDay = (dayKey) => {
    const target = document.getElementById(makeDaySectionId(dayKey));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="itinerary-nav">
      <h2 className="itinerary-nav__title">Overview</h2>

      <ul className="itinerary-nav__list">
        {itineraryDays.map(([dayKey, stops]) => (
          <li key={dayKey}>
            <button
              type="button"
              className="itinerary-nav__item"
              onClick={(event) => {
                event.preventDefault();
                handleScrollToDay(dayKey);
              }}
            >
              <span className="itinerary-nav__day">
                {formatDateLabel(dayKey)}
              </span>
              <span className="itinerary-nav__count">
                {stops.length} stop{stops.length !== 1 ? 's' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
