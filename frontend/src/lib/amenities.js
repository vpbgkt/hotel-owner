// Shared amenity option lists + icon lookup used across the Admin Settings
// (Hotel Amenities) page, the Admin Room Types page (Room Amenities) and the
// public room detail / about / footer sections. Keeping these in one place
// means an amenity added on one screen renders with the same icon everywhere
// else.
//
// Icons are Lucide component references (not emoji) so the guest-facing UI
// reads as clean and professional rather than casual.

import {
  Wifi, Waves, Sparkles, UtensilsCrossed, Dumbbell, Briefcase, Users,
  Car, Plane, BellRing, Wine, Baby, Shirt, Bell, Sunset, BedDouble,
  Bath, UserCheck, Snowflake, Tv, Refrigerator, Coffee, ShowerHead,
  Building2, Trees, Sparkle, CheckCircle2,
} from 'lucide-react';

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
  'Free WiFi': Wifi, 'Rooftop Pool': Waves, 'Spa & Wellness': Sparkles, 'Fine Dining': UtensilsCrossed,
  'Fitness Center': Dumbbell, 'Business Center': Briefcase, 'Conference Rooms': Users,
  'Valet Parking': Car, 'Airport Transfer': Plane, '24h Room Service': BellRing,
  'Bar & Lounge': Wine, 'Kids Play Area': Baby, 'Laundry Service': Shirt, 'Concierge': Bell,
  'Balcony': Sunset, 'King Bed': BedDouble, 'Twin Beds': BedDouble, 'Jacuzzi': Bath,
  'Butler Service': UserCheck, 'AC': Snowflake, 'Smart TV': Tv, 'Mini Bar': Wine,
  'Ocean View': Waves, 'City View': Building2, 'Garden View': Trees, 'Mini Fridge': Refrigerator,
  'Tea/Coffee Maker': Coffee, 'Rain Shower': ShowerHead, 'Daily Housekeeping': Sparkle, 'Room Service': BellRing,
};

/** Returns the Lucide icon component for an amenity name (falls back to a checkmark). */
export function getAmenityIcon(name) {
  return AMENITY_ICONS[name] || CheckCircle2;
}
