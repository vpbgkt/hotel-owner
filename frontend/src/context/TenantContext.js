'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { hotelsApi } from '@/lib/api';

const TenantContext = createContext(null);

export function TenantProvider({ children, initialHotel = null }) {
  const [hotel, setHotel] = useState(initialHotel);

  useEffect(() => {
    // Fetch hotel data so layout components (Navbar, Footer) stay in sync
    hotelsApi.getFeatured(1)
      .then((res) => {
        const data = res.data?.data ?? res.data ?? res ?? [];
        const arr = Array.isArray(data) ? data : [];
        if (arr[0]) setHotel(arr[0]);
      })
      .catch(() => {/* silent – fallback to hardcoded name */});
  }, []);

  return (
    <TenantContext.Provider value={{ hotel, setHotel }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
