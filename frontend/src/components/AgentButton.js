import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import './AgentButton.css';
import { AI_AGENT_URL } from '../config';

const AgentButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get traveler info from Redux
  const travelerInfo = useSelector((state) => state.traveler.travelerInfo);
  const travelerId = travelerInfo?.id;
  
  // Travel context state
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [partyType, setPartyType] = useState('solo');

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResponse(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter your travel question');
      return;
    }
    
    if (!location.trim()) {
      setError('Please enter a destination');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select travel dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${AI_AGENT_URL}/ai-agent/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          bookingContext: {
            travelerId: travelerId, // lets the agent personalize from booking history
            location: location,
            dates: {
              startDate: startDate,
              endDate: endDate
            },
            partyType: partyType,
            guests: parseInt(guests)
          },
          preferences: {}
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorDetail = data.detail || 'Failed to get AI response';
        throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
      }

      setResponse(data);
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      console.error('AI Agent Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hidden when no AI agent service is configured (REACT_APP_AI_AGENT_URL="").
  if (!AI_AGENT_URL) return null;

  return (
    <>
      {!isOpen && (
        <button className="agent-button-fab" onClick={handleOpen} aria-label="Open AI Assistant">
          AI
        </button>
      )}

      {isOpen && (
        <div className="agent-panel">
          <div className="agent-panel-header">
            <h3>AI Travel Assistant</h3>
            <button className="agent-panel-close" onClick={handleClose} aria-label="Close">
              &times;
            </button>
          </div>

          <div className="agent-panel-body">
            {!response && (
              <div className="agent-welcome">
                <p>Hello! I can help you plan your perfect trip.</p>
                <p>Fill in your travel details and ask me anything!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="agent-form">
              {/* Travel Details Section */}
              <div className="travel-details-section">
                <h5>Travel Details</h5>
                
                <div className="form-group">
                  <label>Destination:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., San Jose, Paris, Tokyo"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group col">
                    <label>Check-in:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-group col">
                    <label>Check-out:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col">
                    <label>Party Type:</label>
                    <select
                      className="form-control"
                      value={partyType}
                      onChange={(e) => setPartyType(e.target.value)}
                      disabled={loading}
                    >
                      <option value="solo">Solo</option>
                      <option value="couple">Couple</option>
                      <option value="family">Family</option>
                      <option value="friends">Friends</option>
                    </select>
                  </div>
                  <div className="form-group col">
                    <label>Guests:</label>
                    <input
                      type="number"
                      className="form-control"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      min="1"
                      max="20"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Query Section */}
              <div className="query-section">
                <label>What would you like to know?</label>
                <textarea
                  className="agent-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Recommend family-friendly activities and vegetarian restaurants"
                  disabled={loading}
                  rows="3"
                  required
                />
              </div>

              <button type="submit" className="agent-submit" disabled={loading}>
                {loading ? 'Planning your trip...' : 'Get Personalized Plan'}
              </button>
            </form>

            {error && (
              <div className="agent-error">
                <strong>Error:</strong> {error}
              </div>
            )}

            {response && (
              <div className="agent-response">
                <div className="response-header">
                  <h4>Your Personalized Plan for {location}</h4>
                  <button 
                    className="btn-new-query" 
                    onClick={() => setResponse(null)}
                  >
                    New Query
                  </button>
                </div>

                {response.dayByDayPlan && response.dayByDayPlan.length > 0 && (
                  <div className="response-section">
                    <h5>Day-by-Day Itinerary</h5>
                    {response.dayByDayPlan.map((day, idx) => (
                      <div key={idx} className="day-card">
                        <h6>Day {day.day} - {day.date}</h6>
                        <p><strong>Morning:</strong> {day.morning}</p>
                        <p><strong>Afternoon:</strong> {day.afternoon}</p>
                        <p><strong>Evening:</strong> {day.evening}</p>
                      </div>
                    ))}
                  </div>
                )}

                {response.activities && response.activities.length > 0 && (
                  <div className="response-section">
                    <h5>Recommended Activities</h5>
                    <div className="activities-grid">
                      {response.activities.slice(0, 6).map((activity, idx) => (
                        <div key={idx} className="activity-card">
                          <h6>{activity.name}</h6>
                          <p>{activity.description}</p>
                          <div className="activity-meta">
                            <span>{activity.estimatedDuration}</span>
                            <span>{activity.cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {response.restaurants && response.restaurants.length > 0 && (
                  <div className="response-section">
                    <h5>Restaurant Recommendations</h5>
                    <div className="restaurants-list">
                      {response.restaurants.slice(0, 5).map((restaurant, idx) => (
                        <div key={idx} className="restaurant-card">
                          <h6>{restaurant.name}</h6>
                          <p className="cuisine">{restaurant.cuisine} - {restaurant.priceRange}</p>
                          <p>{restaurant.description}</p>
                          {restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0 && (
                            <div className="dietary-tags">
                              {restaurant.dietaryOptions.map((diet, i) => (
                                <span key={i} className="diet-tag">{diet}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {response.packingChecklist && response.packingChecklist.length > 0 && (
                  <div className="response-section">
                    <h5>Packing Checklist</h5>
                    <ul className="packing-list">
                      {response.packingChecklist.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {response.localContext && response.localContext.weather && (
                  <div className="response-section">
                    <h5>Weather & Local Info</h5>
                    <div className="weather-info">
                      <p>{response.localContext.weather.description || 'Check local weather forecast'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AgentButton;

