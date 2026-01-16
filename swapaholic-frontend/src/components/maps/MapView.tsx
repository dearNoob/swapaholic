// src/components/maps/MapView.tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue in Leaflet when using Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface Product {
    id: string;
    title: string;
    description?: string;
    price?: number;
    distance?: number; // meters
    geometry?: { type: string; coordinates: [number, number] };
}

interface MapViewProps {
    products: Product[];
    center: [number, number]; // [lat, lng]
}

const MapView: React.FC<MapViewProps> = ({ products, center }) => {
    const mapCenter = { lat: center[0], lng: center[1] };
    return (
        <MapContainer center={mapCenter} zoom={13} style={{ height: '400px', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {/* User location marker */}
            <Marker position={mapCenter}>
                <Popup>Your location</Popup>
            </Marker>
            {products.map((product) => {
                const coords = product.geometry?.coordinates;
                if (!coords) return null;
                const position = { lat: coords[1], lng: coords[0] };
                return (
                    <Marker key={product.id} position={position}>
                        <Popup>
                            <strong>{product.title}</strong>
                            {product.distance !== undefined && (
                                <div>{(product.distance / 1000).toFixed(2)} km away</div>
                            )}
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
};

export default MapView;
