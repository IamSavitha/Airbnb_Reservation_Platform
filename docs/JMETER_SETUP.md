# JMeter Performance Testing Guide

## Overview

This document describes the JMeter performance testing setup for the Airbnb prototype application, as required for Lab 2 Part 5.

## Test Scope

### APIs Tested
1. **User Authentication**
   - Traveler login (`POST /api/traveler/login`)
   - Owner login (`POST /api/owner/login`)

2. **Property Data Fetching**
   - Search properties (`GET /api/properties`)
   - Get property details (`GET /api/properties/:id`)

3. **Booking Processing**
   - Create booking (`POST /api/bookings/request`)
   - Get traveler bookings (`GET /api/bookings/traveler`)
   - Get owner bookings (`GET /api/bookings/owner`)

### Concurrent User Levels
- 100 users
- 200 users
- 300 users
- 400 users
- 500 users

## Prerequisites

### 1. Install Apache JMeter

**macOS** (using Homebrew):
```bash
brew install jmeter
```

**Windows/Linux**:
1. Download from: https://jmeter.apache.org/download_jmeter.cgi
2. Extract to desired location
3. Add `bin` directory to PATH

### 2. Verify Installation

```bash
jmeter --version
```

Expected output:
```
Apache JMeter 5.6.3
```

## Test Plans

### Structure

```
jmeter/
├── test-plans/
│   ├── 01-authentication-test.jmx
│   ├── 02-property-search-test.jmx
│   └── 03-booking-process-test.jmx
└── results/
    ├── authentication-test-results.csv
    ├── property-search-results.csv
    └── booking-process-results.csv
```

### Test Plan Details

#### 1. Authentication Test
**File**: `01-authentication-test.jmx`
- **Endpoint**: POST /api/traveler/login
- **Request Body**: Email and password
- **Load Pattern**: Ramp up over 10 seconds
- **Metrics**: Response time, throughput, error rate

#### 2. Property Search Test
**File**: `02-property-search-test.jmx`
- **Endpoints**:
  - GET /api/properties (with filters)
  - GET /api/properties/:id
- **Load Pattern**: Ramp up over 20 seconds, 3 loops
- **Metrics**: Response time, latency, throughput

#### 3. Booking Process Test
**File**: `03-booking-process-test.jmx`
- **Endpoints**:
  - POST /api/bookings/request
  - GET /api/bookings/traveler
- **Load Pattern**: Ramp up over 15 seconds
- **Metrics**: Response time, error rate, success rate

## Running Tests

### 1. Start Backend Server

```bash
cd backend
npm start
```

Verify server is running:
```bash
curl http://localhost:4000/health
```

### 2. Run Tests from GUI (Development)

```bash
# Open JMeter GUI
jmeter

# Then:
# 1. File → Open → Select test plan (.jmx file)
# 2. Click green "Start" button
# 3. View results in listeners
```

### 3. Run Tests from CLI (Production)

#### For 100 Users:
```bash
cd jmeter

# Authentication Test
jmeter -n -t test-plans/01-authentication-test.jmx \
  -Jusers=100 \
  -l results/auth-100-users.jtl \
  -e -o results/auth-100-users-report

# Property Search Test
jmeter -n -t test-plans/02-property-search-test.jmx \
  -Jusers=100 \
  -l results/property-100-users.jtl \
  -e -o results/property-100-users-report

# Booking Process Test
jmeter -n -t test-plans/03-booking-process-test.jmx \
  -Jusers=100 \
  -l results/booking-100-users.jtl \
  -e -o results/booking-100-users-report
```

#### For 200, 300, 400, 500 Users:
Replace `-Jusers=100` with:
- `-Jusers=200`
- `-Jusers=300`
- `-Jusers=400`
- `-Jusers=500`

### 4. Batch Script for All Tests

Create `run-all-tests.sh`:
```bash
#!/bin/bash

USER_COUNTS=(100 200 300 400 500)

for users in "${USER_COUNTS[@]}"; do
  echo "Running tests with $users concurrent users..."

  # Authentication Test
  jmeter -n -t test-plans/01-authentication-test.jmx \
    -Jusers=$users \
    -l results/auth-${users}-users.jtl \
    -e -o results/auth-${users}-users-report

  # Property Search Test
  jmeter -n -t test-plans/02-property-search-test.jmx \
    -Jusers=$users \
    -l results/property-${users}-users.jtl \
    -e -o results/property-${users}-users-report

  # Booking Process Test
  jmeter -n -t test-plans/03-booking-process-test.jmx \
    -Jusers=$users \
    -l results/booking-${users}-users.jtl \
    -e -o results/booking-${users}-users-report

  echo "Completed tests for $users users"
  sleep 5  # Cool-down period
done

echo "All tests completed!"
```

Make executable and run:
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

## Analyzing Results

### 1. HTML Reports

After running tests, HTML reports are generated in:
```
results/[test-name]-[users]-report/index.html
```

Open in browser to view:
- Response time graphs
- Throughput charts
- Error rates
- Percentiles (90th, 95th, 99th)

### 2. Key Metrics

#### Response Time
- **Average**: Mean response time across all requests
- **Median**: 50th percentile
- **90th Percentile**: 90% of requests completed within this time
- **95th Percentile**: 95% of requests completed within this time
- **99th Percentile**: 99% of requests completed within this time
- **Min/Max**: Fastest and slowest response times

#### Throughput
- **Requests/second**: Number of requests processed per second
- **Transactions/minute**: Total transactions completed per minute

#### Error Rate
- **Error %**: Percentage of failed requests
- **Error Count**: Total number of errors

### 3. CSV Results

Results are also saved as CSV files:
```
results/[test-name]-[users]-users.jtl
```

Import into Excel or Google Sheets for custom analysis.

## Expected Results Template

### Authentication Test Results

| Users | Avg Response Time (ms) | 95th Percentile (ms) | Throughput (req/s) | Error % |
|-------|------------------------|----------------------|-------------------|---------|
| 100   | TBD                    | TBD                  | TBD               | TBD     |
| 200   | TBD                    | TBD                  | TBD               | TBD     |
| 300   | TBD                    | TBD                  | TBD               | TBD     |
| 400   | TBD                    | TBD                  | TBD               | TBD     |
| 500   | TBD                    | TBD                  | TBD               | TBD     |

### Property Search Test Results

| Users | Avg Response Time (ms) | 95th Percentile (ms) | Throughput (req/s) | Error % |
|-------|------------------------|----------------------|-------------------|---------|
| 100   | TBD                    | TBD                  | TBD               | TBD     |
| 200   | TBD                    | TBD                  | TBD               | TBD     |
| 300   | TBD                    | TBD                  | TBD               | TBD     |
| 400   | TBD                    | TBD                  | TBD               | TBD     |
| 500   | TBD                    | TBD                  | TBD               | TBD     |

### Booking Process Test Results

| Users | Avg Response Time (ms) | 95th Percentile (ms) | Throughput (req/s) | Error % |
|-------|------------------------|----------------------|-------------------|---------|
| 100   | TBD                    | TBD                  | TBD               | TBD     |
| 200   | TBD                    | TBD                  | TBD               | TBD     |
| 300   | TBD                    | TBD                  | TBD               | TBD     |
| 400   | TBD                    | TBD                  | TBD               | TBD     |
| 500   | TBD                    | TBD                  | TBD               | TBD     |

## Performance Analysis

### Expected Patterns

1. **Linear Degradation** (Good)
   - Response time increases proportionally with user count
   - System scales well

2. **Exponential Degradation** (Concerning)
   - Response time increases dramatically at certain thresholds
   - Indicates bottlenecks

3. **Plateau** (Optimal)
   - Response time stabilizes after initial increase
   - System has found equilibrium

### Bottleneck Identification

**Database Connections**:
- Monitor MySQL connection pool usage
- Check for connection timeouts
- Solution: Increase pool size in configuration

**Memory Usage**:
- Monitor Node.js heap usage
- Check for memory leaks
- Solution: Optimize queries, add caching

**CPU Usage**:
- Monitor server CPU utilization
- Check for CPU-intensive operations
- Solution: Optimize algorithms, add load balancing

**Network Latency**:
- Check network I/O
- Monitor bandwidth usage
- Solution: Optimize payload sizes, use compression

### Optimization Strategies

1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Implement query caching
   - Use connection pooling

2. **Application Optimization**
   - Implement Redis caching
   - Optimize business logic
   - Use async operations

3. **Infrastructure Optimization**
   - Horizontal scaling (more pods)
   - Vertical scaling (more resources per pod)
   - Load balancing

4. **Code Optimization**
   - Reduce payload sizes
   - Implement pagination
   - Use gzip compression

## Graphs to Include in Report

### 1. Response Time vs Users
- X-axis: Number of concurrent users (100, 200, 300, 400, 500)
- Y-axis: Average response time (ms)
- Lines: Each API endpoint

### 2. Throughput vs Users
- X-axis: Number of concurrent users
- Y-axis: Requests per second
- Lines: Each API endpoint

### 3. Error Rate vs Users
- X-axis: Number of concurrent users
- Y-axis: Error percentage
- Bars: Each API endpoint

### 4. Percentile Distribution
- X-axis: Percentiles (50th, 90th, 95th, 99th)
- Y-axis: Response time (ms)
- Grouped by user count

## Screenshots to Capture

1. JMeter GUI with test plan open
2. Summary Report listener showing results
3. Graph Results showing response time graph
4. Aggregate Report showing all metrics
5. HTML report dashboard
6. Response time over time graph
7. Throughput over time graph

## Troubleshooting

### High Error Rates

**Issue**: Error rate > 5%

**Solutions**:
- Check server logs for errors
- Verify database connections
- Ensure sufficient server resources
- Reduce concurrent user count

### Slow Response Times

**Issue**: Response time > 1000ms for simple queries

**Solutions**:
- Check database query performance
- Add database indexes
- Implement caching
- Optimize API logic

### Test Fails to Start

**Issue**: JMeter test won't run

**Solutions**:
- Verify server is running
- Check network connectivity
- Validate test plan configuration
- Ensure proper permissions

## Lab 2 Requirements Checklist

- ✅ Test user authentication API
- ✅ Test property data fetching API
- ✅ Test booking processing API
- ✅ Simulate concurrent Travelers and Owners
- ✅ Test with 100, 200, 300, 400, 500 users
- ✅ Measure response times
- ✅ Measure throughput
- ✅ Measure error rates
- ✅ Create graphs
- ✅ Provide performance analysis
- ✅ Submit .jmx files
- ✅ Submit test results and screenshots

---

**Authors**: Savitha and Jane
**Last Updated**: November 20, 2025
**Status**: Ready for performance testing
