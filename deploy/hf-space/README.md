---
title: Airbnb Reservation Platform v2
emoji: 🏠
colorFrom: pink
colorTo: red
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Full-stack booking app with JWT, MongoDB and live Socket.IO
---

Live demo of the **v2 Cloud-Native Edition** of
[Airbnb_Reservation_Platform](https://github.com/IamSavitha/Airbnb_Reservation_Platform/tree/v2-cloud-native):
React + Redux frontend, Express API with JWT auth, MongoDB (Mongoose) and real-time booking updates over Socket.IO,
all in one container. Kafka is disabled here (booking events go straight to WebSockets) and the AI travel agent is off
because it needs an OpenAI key. Data resets when the Space restarts.

**Demo logins** (password `demo1234`): owner `host@demo.dev` · traveler `guest@demo.dev`.
Open the owner view in one window and the traveler view in another (or a private window) to watch a booking request
and its acceptance arrive live.
