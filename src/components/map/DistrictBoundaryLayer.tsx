'use client';
import { useEffect } from 'react';
import L from 'leaflet';
import type { District } from '@/types';

interface Props {
  map: L.Map | null;
  districts: District[];
}

export default function DistrictBoundaryLayer({ map, districts }: Props) {
  useEffect(() => {
    if (!map) return;

    const layers = districts
      .filter((district) => district.boundaryGeoJson)
      .map((district) => L.geoJSON(district.boundaryGeoJson!, {
        style: {
          color: district.color ?? '#2563eb',
          weight: 2,
          opacity: 0.85,
          fillOpacity: 0.08,
        },
      }).addTo(map));

    return () => {
      layers.forEach((layer) => layer.remove());
    };
  }, [districts, map]);

  return null;
}
