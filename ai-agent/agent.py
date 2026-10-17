"""
LangChain AI Agent for Travel Planning with AI Preference Inference
Modified to use travelerId directly for fetching booking history
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.schema import HumanMessage, SystemMessage

import database_mongodb as database
import tavily_search
from prompts import (
    TRAVEL_PLANNER_SYSTEM_PROMPT,
    ACTIVITY_EXTRACTION_PROMPT,
    RESTAURANT_EXTRACTION_PROMPT,
    DAY_BY_DAY_PROMPT,
    PACKING_CHECKLIST_PROMPT,
    format_search_results,
    format_activities_summary
)

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4",
    temperature=0.7,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)


def get_user_booking_history(traveler_id: str) -> list:
    """
    Get the traveler's recent booking history (MongoDB, shared with the Node backend).

    Args:
        traveler_id: The traveler's ObjectId string

    Returns:
        List of previous bookings for this user (newest first, up to 10)
    """
    history = database.get_booking_history(traveler_id)
    print(f"✓ Found {len(history)} historical bookings for traveler {traveler_id}")
    return history

def format_booking_history(history: list) -> str:
    """Format booking history for AI prompt"""
    if not history:
        return "No booking history available"
    
    lines = []
    for i, b in enumerate(history, 1):
        lines.append(
            f"{i}. {b['location']} | {b['check_in_date']} to {b['check_out_date']} "
            f"({b['nights']} nights) | {b['guests']} guests | Status: {b['status']}"
        )
    return "\n".join(lines)


def infer_from_query_only(query: str, existing_preferences: Dict) -> Dict:
    """
    Infer preferences from query text only (when no booking history available)
    """
    try:
        print("AI inference based on query only...")
        
        inference_prompt = f"""
You are a travel preferences analyzer. Analyze the user's query and infer their travel preferences.

**User Query**: "{query}"

**Current Preferences** (may be empty or partial):
{json.dumps(existing_preferences, indent=2)}

**Task**: Infer missing preferences from the query. Return JSON only.

**Inference Rules**:
- Budget: "budget"/"low" for cheap/hostel/backpacker, "high"/"luxury" for expensive/5-star/premium, "medium" otherwise
- Interests: Extract activities mentioned (museums, food, beaches, nightlife, shopping, nature, culture, adventure, romantic, family-friendly, wellness)
- Dietary: Extract any diet mentions (vegetarian, vegan, gluten-free, halal, kosher)
- Mobility: Extract any accessibility needs (wheelchair, elderly, child-friendly)

**Response Format** (JSON only):
{{
  "budget": "medium",
  "interests": ["museums", "food"],
  "dietaryFilters": ["vegetarian"],
  "mobilityNeeds": [],
  "reasoning": "Brief explanation of inference logic"
}}

Return ONLY the JSON, nothing else.
"""
        
        messages = [
            SystemMessage(content="You are a JSON-only response bot. Return valid JSON only."),
            HumanMessage(content=inference_prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            inferred = json.loads(response.content)
            
            print("AI Inferred Preferences (query-based):")
            print(f"   Budget: {inferred.get('budget')}")
            print(f"   Interests: {inferred.get('interests')}")
            print(f"   Dietary: {inferred.get('dietaryFilters')}")
            print(f"   Reasoning: {inferred.get('reasoning')}")
            
            return inferred
            
        except json.JSONDecodeError:
            print("Warning: Failed to parse AI inference response")
            return {}
            
    except Exception as e:
        print(f"Warning: Failed to infer from query: {e}")
        return {}


def infer_preferences_from_history_and_query(
    booking_history: list,
    query: str,
    existing_preferences: Dict
) -> Dict:
    """
    Use AI to infer user preferences from booking history and current query
    
    Args:
        booking_history: List of previous bookings
        query: Current user query
        existing_preferences: Preferences already provided (may be partial)
        
    Returns:
        Complete inferred preferences dictionary
    """
    try:
        if not booking_history:
            return infer_from_query_only(query, existing_preferences)
        
        print(f"Starting AI preference inference...")
        print(f"   Analyzing {len(booking_history)} previous bookings")
        
        history_text = format_booking_history(booking_history)
        
        inference_prompt = f"""
You are a travel preferences analyzer. Based on the user's booking history and current query, infer their travel preferences.

**Booking History**:
{history_text}

**Current Query**: "{query}"

**Current Preferences** (may be empty or partial):
{json.dumps(existing_preferences, indent=2)}

**Task**: Analyze patterns in booking history and the query to infer missing preferences. Return JSON only.

**Inference Rules**:
1. **Budget**: 
   - "low" if mostly short stays (1-2 nights) or budget destinations
   - "high" if long stays (7+ nights) or luxury destinations  
   - "medium" for 3-6 night stays
   
2. **Interests**: Based on destination types:
   - Cultural cities (Paris, Rome, etc.) -> "museums", "culture", "art"
   - Beach destinations -> "beaches", "relaxation"
   - Family patterns (3-4+ guests) -> "family-friendly"
   - Extract explicit interests from query
   
3. **Dietary**: Extract from query if mentioned (vegetarian, vegan, etc.)

4. **Mobility**: Extract from query if mentioned (wheelchair, elderly, etc.)

**Response Format** (JSON only):
{{
  "budget": "medium",
  "interests": ["museums", "culture", "family-friendly"],
  "dietaryFilters": ["vegetarian"],
  "mobilityNeeds": [],
  "reasoning": "Brief explanation of your inference logic based on the history and query"
}}

Return ONLY the JSON, nothing else.
"""
        
        messages = [
            SystemMessage(content="You are a JSON-only response bot. Return valid JSON only."),
            HumanMessage(content=inference_prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            inferred = json.loads(response.content)
            
            print("AI Inferred Preferences (history + query):")
            print(f"   Analyzed {len(booking_history)} bookings")
            print(f"   Budget: {inferred.get('budget')}")
            print(f"   Interests: {inferred.get('interests')}")
            print(f"   Dietary: {inferred.get('dietaryFilters')}")
            print(f"   Reasoning: {inferred.get('reasoning')}")
            
            return inferred
            
        except json.JSONDecodeError:
            print("Warning: Failed to parse AI inference response")
            return {}
            
    except Exception as e:
        print(f"Warning: AI inference failed: {e}")
        return {}


def extract_activities(
    search_results: List[Dict], 
    party_type: str, 
    interests: List[str],
    mobility_needs: List[str]
) -> List[Dict[str, Any]]:
    """Extract and structure activities from Tavily search results"""
    try:
        formatted_results = format_search_results(search_results)
        
        prompt = ACTIVITY_EXTRACTION_PROMPT.format(
            search_results=formatted_results,
            party_type=party_type,
            interests=", ".join(interests) if interests else "general",
            mobility_needs=", ".join(mobility_needs) if mobility_needs else "none"
        )
        
        messages = [
            SystemMessage(content="You are a travel data extraction expert. Return only valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            activities = json.loads(response.content)
            if isinstance(activities, list):
                return activities[:20]
            return []
        except json.JSONDecodeError:
            print("Warning: Failed to parse activities JSON")
            return []
            
    except Exception as e:
        print(f"Error extracting activities: {e}")
        return []


def extract_restaurants(
    search_results: List[Dict],
    dietary_filters: List[str],
    budget: str
) -> List[Dict[str, Any]]:
    """Extract and structure restaurant recommendations"""
    try:
        formatted_results = format_search_results(search_results)
        
        prompt = RESTAURANT_EXTRACTION_PROMPT.format(
            search_results=formatted_results,
            dietary_filters=", ".join(dietary_filters) if dietary_filters else "none",
            budget=budget
        )
        
        messages = [
            SystemMessage(content="You are a culinary expert. Return only valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            restaurants = json.loads(response.content)
            if isinstance(restaurants, list):
                return restaurants[:15]
            return []
        except json.JSONDecodeError:
            print("Warning: Failed to parse restaurants JSON")
            return []
            
    except Exception as e:
        print(f"Error extracting restaurants: {e}")
        return []


def generate_day_by_day_plan(
    location: str,
    dates: Dict[str, str],
    guests: int,
    party_type: str,
    activities: List[Dict],
    restaurants: List[Dict],
    weather: Dict,
    events: List[Dict],
    preferences: Dict[str, Any],
    user_query: str
) -> List[Dict[str, Any]]:
    """Generate detailed day-by-day itinerary"""
    try:
        start_date = datetime.fromisoformat(dates.get("startDate", "2025-11-01"))
        end_date = datetime.fromisoformat(dates.get("endDate", "2025-11-05"))
        num_days = (end_date - start_date).days + 1
        
        activities_summary = format_activities_summary(activities)
        
        prompt = DAY_BY_DAY_PROMPT.format(
            location=location,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            nights=num_days - 1,
            guests=guests,
            party_type=party_type,
            activities=activities_summary,
            restaurants=json.dumps([r.get('name', 'Restaurant') for r in restaurants[:10]]),
            weather=json.dumps(weather, indent=2),
            events=json.dumps([e.get('title', 'Event') for e in events[:5]]),
            user_query=user_query,
            budget=preferences.get("budget", "medium"),
            interests=", ".join(preferences.get("interests", [])),
            dietary_filters=", ".join(preferences.get("dietaryFilters", [])),
            mobility_needs=", ".join(preferences.get("mobilityNeeds", []))
        )
        
        messages = [
            SystemMessage(content="You are a travel itinerary planner. Return only valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            plans = json.loads(response.content)
            if isinstance(plans, list):
                return plans
            return create_fallback_plan(num_days, start_date)
        except json.JSONDecodeError:
            print("Warning: Failed to parse day plan JSON, using fallback")
            return create_fallback_plan(num_days, start_date)
            
    except Exception as e:
        print(f"Error generating day plan: {e}")
        return create_fallback_plan(3, datetime.now())


def create_fallback_plan(num_days: int, start_date: datetime) -> List[Dict]:
    """Create a simple fallback itinerary"""
    plans = []
    for i in range(min(num_days, 7)):
        current_date = start_date + timedelta(days=i)
        plans.append({
            "day": i + 1,
            "date": current_date.strftime("%Y-%m-%d"),
            "morning": f"Morning: Explore local neighborhoods and landmarks. Start with breakfast at a local cafe.",
            "afternoon": f"Afternoon: Visit main attractions. Lunch at a recommended restaurant.",
            "evening": f"Evening: Leisure time. Dinner and optional evening activities."
        })
    return plans


def generate_packing_checklist(
    location: str,
    dates: Dict[str, str],
    weather: Dict,
    activities: List[Dict],
    party_type: str,
    mobility_needs: List[str]
) -> List[str]:
    """Generate personalized packing checklist"""
    try:
        activities_summary = format_activities_summary(activities)
        
        prompt = PACKING_CHECKLIST_PROMPT.format(
            location=location,
            start_date=dates.get("startDate", ""),
            end_date=dates.get("endDate", ""),
            weather=json.dumps(weather, indent=2),
            activities=activities_summary,
            party_type=party_type,
            mobility_needs=", ".join(mobility_needs) if mobility_needs else "none"
        )
        
        messages = [
            SystemMessage(content="You are a travel packing expert. Return a JSON array of packing items."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        
        try:
            checklist = json.loads(response.content)
            return checklist if isinstance(checklist, list) else create_fallback_checklist(party_type)
        except json.JSONDecodeError:
            return create_fallback_checklist(party_type)
            
    except Exception as e:
        print(f"Error generating packing checklist: {e}")
        return create_fallback_checklist(party_type)


def create_fallback_checklist(party_type: str) -> List[str]:
    """Create basic packing checklist"""
    checklist = [
        "Comfortable walking shoes",
        "Weather-appropriate clothing",
        "Light jacket or sweater",
        "Sunscreen and sunglasses",
        "Reusable water bottle",
        "Phone charger and power adapter",
        "Camera or smartphone",
        "Travel documents and ID",
        "Medications and first aid kit",
        "Hand sanitizer and masks"
    ]
    
    if party_type == "family":
        checklist.extend([
            "Snacks for kids",
            "Entertainment for children",
            "Stroller or baby carrier (if needed)"
        ])
    
    return checklist


def create_travel_plan(
    query: str,
    booking_context: Dict[str, Any],
    preferences: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main function to create complete travel plan with AI preference inference
    
    Args:
        query: Free-text user query
        booking_context: Booking details (travelerId, location, dates, partyType, guests)
        preferences: User preferences (budget, interests, mobilityNeeds, dietaryFilters)
        
    Returns:
        Complete travel plan with all components
    """
    print("=" * 70)
    print("Starting travel plan generation...")
    print(f"Location: {booking_context.get('location')}")
    print(f"Dates: {booking_context.get('dates')}")
    
    # Extract context
    location = booking_context.get("location", "Unknown")
    dates = booking_context.get("dates", {})
    party_type = booking_context.get("partyType", "solo")
    guests = booking_context.get("guests", 1)
    
    # Get traveler's booking history if travelerId provided
    traveler_id = booking_context.get("travelerId")
    booking_history = []
    
    if traveler_id:
        print(f"Using traveler ID: {traveler_id} to fetch booking history")
        booking_history = get_user_booking_history(traveler_id)
    
    # Check if we need to infer preferences
    needs_inference = (
        not preferences or
        not preferences.get("budget") or
        not preferences.get("interests") or
        len(preferences.get("interests", [])) == 0
    )
    
    if needs_inference:
        print("Starting AI preference inference...")
        print("Reason: preferences are empty or incomplete")
        
        # Use AI to infer preferences from history and query
        inferred_prefs = infer_preferences_from_history_and_query(
            booking_history,
            query,
            preferences
        )
        
        # Merge inferred preferences with existing ones (existing takes priority)
        if inferred_prefs:
            if not preferences.get("budget"):
                preferences["budget"] = inferred_prefs.get("budget", "medium")
            
            existing_interests = set(preferences.get("interests", []))
            inferred_interests = set(inferred_prefs.get("interests", []))
            preferences["interests"] = list(existing_interests | inferred_interests)
            
            if not preferences.get("dietaryFilters"):
                preferences["dietaryFilters"] = inferred_prefs.get("dietaryFilters", [])
            
            if not preferences.get("mobilityNeeds"):
                preferences["mobilityNeeds"] = inferred_prefs.get("mobilityNeeds", [])
            
            print("Final preferences after AI inference:")
            print(f"   Budget: {preferences.get('budget')}")
            print(f"   Interests: {preferences.get('interests')}")
            print(f"   Dietary: {preferences.get('dietaryFilters')}")
    else:
        print("Using provided preferences:")
        print(f"   Budget: {preferences.get('budget')}")
        print(f"   Interests: {preferences.get('interests')}")
    
    print("Performing Tavily search...")
    search_results = tavily_search.comprehensive_search(location, dates, preferences)
    
    print("Extracting activities...")
    activities = extract_activities(
        search_results["pois"],
        party_type,
        preferences.get("interests", []),
        preferences.get("mobilityNeeds", [])
    )
    
    print("Extracting restaurants...")
    restaurants = extract_restaurants(
        search_results["restaurants"],
        preferences.get("dietaryFilters", []),
        preferences.get("budget", "medium")
    )
    
    print("Generating day-by-day plan...")
    day_by_day_plan = generate_day_by_day_plan(
        location=location,
        dates=dates,
        guests=guests,
        party_type=party_type,
        activities=activities,
        restaurants=restaurants,
        weather=search_results["weather"],
        events=search_results["events"],
        preferences=preferences,
        user_query=query
    )
    
    print("Generating packing checklist...")
    packing_checklist = generate_packing_checklist(
        location=location,
        dates=dates,
        weather=search_results["weather"],
        activities=activities,
        party_type=party_type,
        mobility_needs=preferences.get("mobilityNeeds", [])
    )
    
    response = {
        "success": True,
        "dayByDayPlan": day_by_day_plan,
        "activities": activities[:20],
        "restaurants": restaurants[:15],
        "packingChecklist": packing_checklist,
        "localContext": {
            "weather": search_results["weather"],
            "events": [
                {
                    "name": event.get("title", "Local Event"),
                    "url": event.get("url", ""),
                    "description": event.get("content", "")[:200]
                }
                for event in search_results["events"][:5]
            ],
            "transportation": {
                "recommendation": f"Research public transportation options in {location}."
            }
        }
    }
    
    print("Travel plan generated successfully!")
    print("=" * 70)
    return response
