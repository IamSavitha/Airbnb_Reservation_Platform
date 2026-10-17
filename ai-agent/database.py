"""
Database module for the AI agent.

Reads booking context from the same MongoDB the Node backend writes (Mongoose models:
travelers, owners, properties, bookings). Function names and return shapes are unchanged
from the v1 MySQL version, so agent.py and main.py need no other changes.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv()


def _mongo_url() -> str:
    return os.getenv("MONGO_URL") or (
        f"mongodb://{os.getenv('MONGO_USER', 'admin')}:{os.getenv('MONGO_PASSWORD', 'mongopassword')}"
        f"@{os.getenv('MONGO_HOST', 'localhost')}:27017/{os.getenv('MONGO_DB', 'airbnb_db')}?authSource=admin"
    )


try:
    _client = MongoClient(_mongo_url(), serverSelectionTimeoutMS=5000)
    # Database comes from the URL path; fall back to MONGO_DB.
    db = _client.get_default_database(default=os.getenv("MONGO_DB", "airbnb_db"))
except PyMongoError as e:
    print(f"Error creating MongoDB client: {e}")
    _client, db = None, None


def _oid(value: Any) -> Optional[ObjectId]:
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


def _day(value: Any) -> Optional[str]:
    return value.strftime("%Y-%m-%d") if isinstance(value, datetime) else (str(value) if value else None)


def _nights(start: Any, end: Any) -> Optional[int]:
    if isinstance(start, datetime) and isinstance(end, datetime):
        return (end - start).days
    return None


def get_booking_by_id(booking_id: str) -> Optional[Dict[str, Any]]:
    """Booking joined with its property and traveler, or None."""
    oid = _oid(booking_id)
    if db is None or oid is None:
        return None
    try:
        b = db.bookings.find_one({"_id": oid})
        if not b:
            return None
        p = db.properties.find_one({"_id": b.get("property_id")}) or {}
        t = db.travelers.find_one({"_id": b.get("traveler_id")}, {"password": 0}) or {}
        return {
            "id": str(b["_id"]),
            "property_id": str(b.get("property_id")),
            "traveler_id": str(b.get("traveler_id")),
            "start_date": _day(b.get("start_date")),
            "end_date": _day(b.get("end_date")),
            "guests": b.get("num_guests"),
            "total_price": b.get("total_price"),
            "status": b.get("status"),
            "property_name": p.get("name"),
            "property_type": p.get("type"),
            "city": p.get("city"),
            "state": p.get("state"),
            "country": p.get("country"),
            "location": p.get("location"),
            "price_per_night": p.get("price"),
            "traveler_name": t.get("name"),
            "traveler_email": t.get("email"),
            "nights": _nights(b.get("start_date"), b.get("end_date")),
        }
    except PyMongoError as e:
        print(f"Error fetching booking: {e}")
        return None


def get_property_by_id(property_id: str) -> Optional[Dict[str, Any]]:
    """Property details, or None."""
    oid = _oid(property_id)
    if db is None or oid is None:
        return None
    try:
        p = db.properties.find_one({"_id": oid})
        if not p:
            return None
        return {
            "id": str(p["_id"]),
            "name": p.get("name"),
            "type": p.get("type"),
            "location": p.get("location"),
            "city": p.get("city"),
            "state": p.get("state"),
            "country": p.get("country"),
            "price": p.get("price"),
            "bedrooms": p.get("bedrooms"),
            "bathrooms": p.get("bathrooms"),
            "max_guests": p.get("max_guests"),
            "description": p.get("description"),
            "amenities": p.get("amenities"),
        }
    except PyMongoError as e:
        print(f"Error fetching property: {e}")
        return None


def get_traveler_preferences(traveler_id: str) -> Optional[Dict[str, Any]]:
    """Traveler profile fields used as preference hints, or None."""
    oid = _oid(traveler_id)
    if db is None or oid is None:
        return None
    try:
        t = db.travelers.find_one(
            {"_id": oid},
            {"name": 1, "email": 1, "city": 1, "state": 1, "country": 1, "about": 1, "languages": 1},
        )
        if not t:
            return None
        t["id"] = str(t.pop("_id"))
        return t
    except PyMongoError as e:
        print(f"Error fetching traveler: {e}")
        return None


def get_booking_history(traveler_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Recent accepted / completed / cancelled bookings with location, newest first."""
    oid = _oid(traveler_id)
    if db is None or oid is None:
        return []
    try:
        bookings = list(
            db.bookings.find(
                {"traveler_id": oid, "status": {"$in": ["ACCEPTED", "COMPLETED", "CANCELLED"]}}
            ).sort("created_at", -1).limit(limit)
        )
        props = {
            p["_id"]: p
            for p in db.properties.find({"_id": {"$in": [b.get("property_id") for b in bookings]}})
        }
        history = []
        for b in bookings:
            p = props.get(b.get("property_id"), {})
            history.append({
                "id": str(b["_id"]),
                "location": p.get("city") or p.get("location"),
                "check_in_date": _day(b.get("start_date")),
                "check_out_date": _day(b.get("end_date")),
                "guests": b.get("num_guests"),
                "status": b.get("status"),
                "nights": _nights(b.get("start_date"), b.get("end_date")),
                "property_type": p.get("type"),
            })
        return history
    except PyMongoError as e:
        print(f"Warning: failed to get booking history: {e}")
        return []


def test_connection() -> bool:
    """True if MongoDB answers a ping."""
    if _client is None:
        return False
    try:
        _client.admin.command("ping")
        return True
    except PyMongoError as e:
        print(f"Database connection test failed: {e}")
        return False


if __name__ == "__main__":
    print("MongoDB reachable:", test_connection())
