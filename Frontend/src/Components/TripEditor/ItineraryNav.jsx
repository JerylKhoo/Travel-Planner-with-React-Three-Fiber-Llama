import React from 'react';
import {
  formatDateLabel,
  makeDaySectionId,
} from './ItineraryUtils.js';
import './ItineraryNav.css';

export default function ItineraryNav({ itineraryDays, selectedTrip }) {
const handleScrollToDay = (dayKey) => {
  const target = document.getElementById(makeDaySectionId(dayKey));
  if (!target) return;
  
  // Find the scrollable container (.itinerary-column__content)
  const scrollContainer = target.closest('.itinerary-column__content');
  if (!scrollContainer) return;
  
  // Calculate the position relative to the scroll container
  const targetTop = target.offsetTop;
  const containerTop = scrollContainer.offsetTop;
  const scrollPosition = targetTop - containerTop - 20; // 20px offset
  
  scrollContainer.scrollTo({
    top: scrollPosition,
    behavior: 'smooth'
  });
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
            <span className={`itinerary-nav__count ${stops.length === 0 ? 'itinerary-nav__count--empty' : ''}`}>
                {stops.length === 0 ? 'No stops' : `${stops.length} stop${stops.length !== 1 ? 's' : ''}`}
            </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
