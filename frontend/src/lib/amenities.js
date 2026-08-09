// Shared amenity option lists + icon lookup used across the Admin Settings
// (Hotel Amenities) page, the Admin Room Types page (Room Amenities) and the
// public room detail page. Keeping these in one place means an amenity added
// on one screen renders with the same icon everywhere else.

export const HOTEL_AMENITY_OPTIONS = [
  'Free WiFi', 'Rooftop Pool', 'Spa & Wellness', 'Fine Dining', 'Fitness Center',
  'Business Center', 'Conference Rooms', 'Valet Parking', 'Airport Transfer',
  '24h Room Service', 'Bar & Lounge', 'Kids Play Area', 'Laundry Service', 'Concierge',
];

export const ROOM_AMENITY_OPTIONS = [
  'Free WiFi', 'King Bed', 'Twin Beds', 'AC', 'Smart TV', 'Mini Fridge',
  'Tea/Coffee Maker', 'Rain Shower', 'City View', 'Ocean View', 'Garden View',
  'Balcony', 'Mini Bar', 'Jacuzzi', 'Daily Housekeeping', 'Room Service', 'Butler Service',
];

export const AMENITY_ICONS = {
  'Free WiFi': '📶', 'Rooftop Pool': '🏊', 'Spa & Wellness': '💆', 'Fine Dining': '🍽️',
  'Fitness Center': '🏋️', 'Business Center': '💼', 'Conference Rooms': '🧑‍💼',
  'Valet Parking': '🚗', 'Airport Transfer': '🚕', '24h Room Service': '🛎️',
  'Bar & Lounge': '🍸', 'Kids Play Area': '🧸', 'Laundry Service': '🧺', 'Concierge': '🔔',
  'Balcony': '🌅', 'King Bed': '🛏️', 'Twin Beds': '🛏️', 'Jacuzzi': '🛁',
  'Butler Service': '🤵', 'AC': '❄️', 'Smart TV': '📺', 'Mini Bar': '🍾',
  'Ocean View': '🌊', 'City View': '🏙️', 'Garden View': '🌿', 'Mini Fridge': '🧊',
  'Tea/Coffee Maker': '☕', 'Rain Shower': '🚿', 'Daily Housekeeping': '🧹', 'Room Service': '🛎️',
};

export function amenityIcon(name) {
  return AMENITY_ICONS[name] || '✓';
}
