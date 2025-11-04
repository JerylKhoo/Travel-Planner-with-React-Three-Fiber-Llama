export const fallbackItinerary = [
  {
    id: 'demo-1',
    date: '2024-12-22',
    title: 'Cu Chi Tunnel',
    description:
      'Open 7:00–17:00 • Sprawling underground tunnel complex used by Viet Cong soldiers, plus exhibits & war memorials.',
    destination: 'Cu Chi Tunnel',
    startTime: '09:00',
    endTime: '11:30',
  },
  {
    id: 'demo-2',
    date: '2024-12-22',
    title: 'Cao Dai Temple of Phu Hoa Dong',
    description: 'Add notes, links, etc. here.',
    destination: 'Cao Dai Temple of Phu Hoa Dong',
    startTime: '12:30',
    endTime: '14:00',
  },
  {
    id: 'demo-3',
    date: '2024-12-23',
    title: 'War Remnants Museum',
    description:
      'Museum containing exhibits relating to the Vietnam War and the first Indochina War involving the French colonialists.',
    destination: 'War Remnants Museum',
    startTime: '10:00',
    endTime: '12:30',
  },
];

export function groupStopsByDay(stops = []) {
  const days = {};
  stops.forEach((stop) => {
    const dayKey = stop.date;
    if (!dayKey) return;
    if (!days[dayKey]) {
      days[dayKey] = [];
    }
    days[dayKey].push(stop);
  });
  return Object.entries(days).sort((a, b) => new Date(a[0]) - new Date(b[0]));
}

export function formatDateLabel(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function makeDaySectionId(dayKey) {
  return `day-${dayKey.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
}

export function buildItineraryDays(selectedTrip) {
  if (selectedTrip?.itinerary?.length) {
    return groupStopsByDay(selectedTrip.itinerary);
  }
  return groupStopsByDay(fallbackItinerary);
}

/**
 * Generates an array of all dates between start and end date
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @returns {string[]} Array of date strings in YYYY-MM-DD format
 */
export function generateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure start is before or equal to end
  if (start > end) return [];
  
  const current = new Date(start);
  
  while (current <= end) {
    // Format as YYYY-MM-DD
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Builds itinerary days including all dates in the trip range,
 * even if they have no activities
 * @param {Object} selectedTrip - The selected trip object
 * @returns {Array} Array of [dateKey, stops[]] tuples
 */
export function buildCompleteItineraryDays(selectedTrip) {
  // Get existing itinerary days
  const existingDays = buildItineraryDays(selectedTrip);
  
  // If no trip or no dates, return existing days
  if (!selectedTrip?.start_date || !selectedTrip?.end_date) {
    return existingDays;
  }
  
  // Generate all dates in range
  const allDates = generateDateRange(selectedTrip.start_date, selectedTrip.end_date);
  
  // Create a map of existing days for quick lookup
  const existingDaysMap = new Map(existingDays);
  
  // Build complete array with all dates
  const completeDays = allDates.map(date => {
    return [date, existingDaysMap.get(date) || []];
  });
  
  return completeDays;
}