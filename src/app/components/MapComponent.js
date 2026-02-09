"use client";

import { MapContainer, Marker, TileLayer, Popup, useMap, Polygon } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

const polygonPositions = [
  [38.627019, -121.090482],
  [38.714185, -121.096194],
  [38.900391, -121.266347],
  [38.904309, -121.328511],
  [38.669881, -121.548248],
  [38.446514, -121.550992],
  [38.356112, -121.482382],
  [38.355035, -121.305369],
];

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    // Run twice to be extra safe in Next.js
    map.invalidateSize();

    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timeout);
  }, [map]);

  return null;
}

function FitToPolygon({ positions }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(positions);
  }, [map, positions]);

  return null;
}

export default function MapComponent() {
  return (
    <MapContainer
      center={[38.689954, -121.341553]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      // <InvalidateMapSize />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: "blue",
          weight: 2,
          fillColor: "blue",
          fillOpacity: 0.2,
        }}
      >
        <Popup>Service Area</Popup>
      </Polygon>

      <FitToPolygon positions={polygonPositions} />

      <Marker position={[38.689954, -121.341553]}>
        <Popup>
          Dan's Computer Repair<br />Sacramento, CA
        </Popup>
      </Marker>
    </MapContainer>
  );
}