"use client";

import { useState, useRef, useEffect } from "react";

function UI({ map, onRouteCalculation, isAnimating }) {
  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace] = useState(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google) return;

    // Initialize autocomplete
    const startAutocomplete = new window.google.maps.places.Autocomplete(
      startInputRef.current,
      {
        fields: ["geometry", "formatted_address"],
      }
    );

    const endAutocomplete = new window.google.maps.places.Autocomplete(
      endInputRef.current,
      {
        fields: ["geometry", "formatted_address"],
      }
    );

    startAutocomplete.addListener("place_changed", () => {
      const place = startAutocomplete.getPlace();
      if (place.geometry) {
        setStartPlace(place);
      }
    });

    endAutocomplete.addListener("place_changed", () => {
      const place = endAutocomplete.getPlace();
      if (place.geometry) {
        setEndPlace(place);
      }
    });
  }, [map]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startPlace && endPlace) {
      onRouteCalculation(startPlace, endPlace);
    } else {
      alert("Please select both locations");
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          3D Route Animation
        </h1>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Location
            </label>
            <input
              ref={startInputRef}
              type="text"
              placeholder="Enter start location"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAnimating}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Location
            </label>
            <input
              ref={endInputRef}
              type="text"
              placeholder="Enter end location"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAnimating}
            />
          </div>
          <button
            type="submit"
            disabled={isAnimating}
            className={`px-6 py-2 rounded-lg font-medium ${
              isAnimating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isAnimating ? "Animating..." : "Start Animation"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UI;
