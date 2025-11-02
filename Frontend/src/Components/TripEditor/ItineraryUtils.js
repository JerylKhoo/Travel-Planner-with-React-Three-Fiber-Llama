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
