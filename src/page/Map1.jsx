import React, { useState, useEffect, useRef } from 'react';

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [polyline, setPolyline] = useState(null);
  const [distance, setDistance] = useState('');
  const [bikeMarker, setBikeMarker] = useState(null);
  
  const startAutocomplete = useRef(null);
  const endAutocomplete = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const startMarker = useRef(null);
  const endMarker = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const loadMap = () => {
      const script = document.createElement('script');
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBZ0E4SSb38ZoFtMO5w1mlIvJU8vCZ2hdw&libraries=places,geometry";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeMap();
        setupAutocomplete();
        setMapLoaded(true);
      };
      script.onerror = () => {
        setError('Failed to load Google Maps. Please try again later.');
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    };

    loadMap();
  }, []);

  const initializeMap = () => {
    try {
      const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
        mapTypeId: 'roadmap',
        tilt: 45,
        heading: 0,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT
        }
      });

      setMap(mapInstance);
    } catch (err) {
      setError('Error initializing map. Please refresh the page.');
    }
  };

  const setupAutocomplete = () => {
    startAutocomplete.current = new window.google.maps.places.Autocomplete(startInputRef.current);
    endAutocomplete.current = new window.google.maps.places.Autocomplete(endInputRef.current);

    startAutocomplete.current.addListener('place_changed', () => {
      const place = startAutocomplete.current.getPlace();
      setStartLocation(place.formatted_address);
      setError('');
    });

    endAutocomplete.current.addListener('place_changed', () => {
      const place = endAutocomplete.current.getPlace();
      setEndLocation(place.formatted_address);
      setError('');
    });
  };

  const createBikeMarker = (position) => {
    if (bikeMarker) {
      bikeMarker.setMap(null);
    }

    const newBikeMarker = new window.google.maps.Marker({
      position: position,
      map: map,
      icon: {
        url: 'https://storage.googleapis.com/indian-truck-drivers-image/scooter_right.png',
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
        rotation: 0
      }
    });

    setBikeMarker(newBikeMarker);
    return newBikeMarker;
  };

  const animateMapTiltAndLine = (startLoc, endLoc, marker, polyline) => {
    const frames = 300;
    const duration = 5000;
    const start = performance.now();
    let animationProgress = 0;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      animationProgress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const easedProgress = easeInOutQuad(animationProgress);

      // Update bike position and rotation
      const currentPosition = window.google.maps.geometry.spherical.interpolate(
        startLoc,
        endLoc,
        easedProgress
      );
      marker.setPosition(currentPosition);

      if (easedProgress < 1) {
        const nextPosition = window.google.maps.geometry.spherical.interpolate(
          startLoc,
          endLoc,
          Math.min(easedProgress + 0.01, 1)
        );
        const heading = window.google.maps.geometry.spherical.computeHeading(
          currentPosition,
          nextPosition
        );
        const icon = marker.getIcon();
        icon.rotation = heading;
        marker.setIcon(icon);
      }

      // Update polyline
      const path = polyline.getPath();
      while (path.getLength() > Math.floor(easedProgress * frames)) {
        path.pop();
      }
      path.push(currentPosition);

      if (animationProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);
  };

  const createStraightLine = async (startLoc, endLoc) => {
    // Clear existing markers and polyline
    [polyline, startMarker.current, endMarker.current, bikeMarker].forEach(marker => {
      if (marker) marker.setMap(null);
    });

    // Create markers
    [
      { ref: startMarker, position: startLoc, color: '#22C55E', title: 'Start' },
      { ref: endMarker, position: endLoc, color: '#EF4444', title: 'End' }
    ].forEach(({ ref, position, color, title }) => {
      ref.current = new window.google.maps.Marker({
        position,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title
      });
    });

    // Create polyline
    const newPolyline = new window.google.maps.Polyline({
      path: [startLoc],
      geodesic: true,
      strokeColor: '#EF4444',
      strokeOpacity: 1.0,
      strokeWeight: 4
    });
    newPolyline.setMap(map);
    setPolyline(newPolyline);

    // Calculate distance
    const distanceInMeters = window.google.maps.geometry.spherical.computeDistanceBetween(startLoc, endLoc);
    setDistance(`${(distanceInMeters / 1000).toFixed(2)} km`);

    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(startLoc);
    bounds.extend(endLoc);
    map.fitBounds(bounds);

    // Start animation
    const marker = createBikeMarker(startLoc);
    setTimeout(() => animateMapTiltAndLine(startLoc, endLoc, marker, newPolyline), 500);
  };

  const calculateRoute = async () => {
    if (!startLocation || !endLocation) {
      setError('Please enter both start and end locations');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const geocoder = new window.google.maps.Geocoder();
      const [startResult, endResult] = await Promise.all([
        new Promise((resolve, reject) => {
          geocoder.geocode({ address: startLocation }, (results, status) => {
            status === 'OK' ? resolve(results[0].geometry.location) : reject(status);
          });
        }),
        new Promise((resolve, reject) => {
          geocoder.geocode({ address: endLocation }, (results, status) => {
            status === 'OK' ? resolve(results[0].geometry.location) : reject(status);
          });
        })
      ]);

      await createStraightLine(startResult, endResult);
    } catch (err) {
      setError('Error finding locations. Please check your input and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') calculateRoute();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  3D Line Mapper
                </h2>
                <p className="text-gray-600 mt-2">Visualize straight-line distance in 3D</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Location</label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <input
                      ref={startInputRef}
                      type="text"
                      placeholder="Enter starting point"
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Location</label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <input
                      ref={endInputRef}
                      type="text"
                      placeholder="Enter destination"
                      value={endLocation}
                      onChange={(e) => setEndLocation(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button 
                  onClick={calculateRoute}
                  disabled={isLoading || !mapLoaded}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    'Draw Line'
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {distance && (
                  <div className="mt-6 bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Distance Details</h3>
                    <div className="flex items-center gap-3 text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span>Straight-line distance: {distance}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-lg p-2 h-[800px]">
              {!mapLoaded && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
              <div 
                id="map" 
                className="w-full h-full rounded-lg"
                style={{ display: mapLoaded ? 'block' : 'none' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;