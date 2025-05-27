# Trash Collection Project

An application for tracking and mapping trash locations with geospatial visualization.

![Trash Tracker](https://img.shields.io/badge/Trash-Tracker-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

Trash Collection Project helps monitor and visualize trash data across different locations. Users can upload images of trash or add test data points, which are then displayed on an interactive map. This tool is useful for environmental monitoring, community cleanup planning, and waste management analysis.

## Features

- **Image Upload**: Upload images of trash with automatic metadata extraction
- **Manual Data Entry**: Add data points with location, trash type, and metrics
- **Interactive Map**: View all trash data points on a dynamic map
- **Test Data Tool**: Add test data points without requiring actual images
- **Real-time Updates**: Map refreshes automatically to show the latest data
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Technology Stack

### Frontend
- HTML/CSS/JavaScript
- Bootstrap for UI components
- Leaflet.js for interactive maps

### Backend
- Python with FastAPI
- Folium for map generation
- Image metadata extraction

### Deployment
- Docker and Docker Compose
- Stateless architecture with file-based storage

## System Architecture

![System Architecture Diagram](https://mermaid.ink/img/c3RhcnQKZ3JhcGggVEQKICAgICUlIENsaWVudCBTaWRlCiAgICBzdWJncmFwaCAnRnJvbnRlbmQnCiAgICAgICAgVUlbV2ViIEludGVyZmFjZV0KICAgICAgICBKU1tKYXZhU2NyaXB0IExvZ2ljXQogICAgICAgIE1BUFtNYXAgVmlzdWFsaXphdGlvbl0KICAgIGVuZAoKICAgICUlIFNlcnZlciBTaWRlCiAgICBzdWJncmFwaCAnQmFja2VuZCcKICAgICAgICBBUElbRmFzdEFQSSBTZXJ2ZXJdCiAgICAgICAgc3ViZ3JhcGggJ1V0aWxpdGllcycKICAgICAgICAgICAgR0VPW2dlb191dGlscy5weV0KICAgICAgICAgICAgRklMRVtmaWxlX3V0aWxzLnB5XQogICAgICAgICAgICBEQltkYl91dGlscy5weV0KICAgICAgICAgICAgTUFQX1VUSUxbbWFwX3V0aWxzLnB5XQogICAgICAgIGVuZAogICAgICAgIEZPUk1TW2Zvcm1zL3JlcG9ydF9mb3JtLnB5XQogICAgZW5kCgogICAgJSUgU3RvcmFnZQogICAgc3ViZ3JhcGggJ0RhdGEgU3RvcmFnZScKICAgICAgICBKU09OW3RyYXNoX2RhdGEuanNvbl0KICAgICAgICBJTUFHRVNbSW1hZ2UgRmlsZXNdCiAgICBlbmQKCiAgICAlJSBEZXBsb3ltZW50CiAgICBzdWJncmFwaCAnRGVwbG95bWVudCcKICAgICAgICBET0NLRVJbRG9ja2VyIENvbnRhaW5lcl0KICAgICAgICBDT01QT1NFW0RvY2tlciBDb21wb3NlXQogICAgZW5kCgogICAgJSUgQ29ubmVjdGlvbnMgJiBEYXRhIEZsb3cKICAgIFVJIC0tPnxVc2VyIEludGVyYWN0aW9ufCBKUwogICAgSlMgLS0+fEFQSSBSZXF1ZXN0c3wgQVBJCiAgICBKUyAtLT58RGlzcGxheXN8IE1BUAogICAgCiAgICBBUEkgLS0+fEdlbmVyYXRlc3wgTUFQCiAgICBBUEkgLS0+fENhbGxzfCBHRU8KICAgIEFQSSAtLT58Q2FsbHN8IEZJTEUKICAgIEFQSSAtLT58Q2FsbHN8IERCCiAgICBBUEkgLS0+fENhbGxzfCBNQVBfVVRJTAogICAgQVBJIC0tPnxQcm9j