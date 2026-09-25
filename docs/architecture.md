# QuickServe Architecture Documentation

## 1. System Overview
QuickServe is an enterprise Service Request Management System engineered for SWASIQ Technology Internship Technical Assignment. The platform automates the end-to-end lifecycle of facility maintenance requests (AC Servicing, Plumbing, Electrical, Cleaning).

## 2. Core Actors & RBAC
- **CUSTOMER**: Creates service requests, tracks status real-time, cancels eligible requests.
- **AGENT**: Claims and accepts assigned service requests, advances request status through execution, appends operational work notes.
- **ADMIN**: Manages system users, assigns agents, oversees real-time operations, audits transitions.

## 3. High-Level Architecture Diagram
```
             QUICK SERVE
                 |
      +----------+----------+
      |                     |
      v                     v
Flutter Mobile          React Admin
      |                     |
      +----------+----------+
                 |
                 v
              Supabase
                 |
      +----------+----------+
      |                     |
      v                     v
Supabase Auth          PostgreSQL
      |
  +---+----+
  |   |    |
  v   v    v
 RLS Hist Audit
```

## 4. Key Architectural Patterns
- **Database-First Authorization**: Frontend guards manage user experience; PostgreSQL Row Level Security (RLS) policies authoritatively deny unauthorized reads and writes.
- **Deterministic State Machine**: Status transitions are validated using PostgreSQL triggers to prevent illegal transitions.
- **Auditable Lifecycle**: Every transition creates an immutable record in `request_status_history`. Critical operational actions emit structured entries to `audit_logs`.

## 5. Flutter Mobile: Customer Application Flow (Phase 5)
```
[ SplashScreen ]
       | (Checks Supabase session & user role)
       +-------------------------------+
       |                               |
       v (No session / unauthenticated)| (Session active & role == CUSTOMER)
[ LoginScreen ] / [ RegisterScreen ]   v
       | (Signs in / registers)        [ CustomerShellScreen ]
       +-----------------------------> |  (IndexedStack BottomNav)
                                       +--- Tab 0: [ CustomerHomeScreen ]
                                       |            · Greeting & Active Service Shortcuts
                                       |            · Dynamic database fetch via CustomerRepository
                                       |
                                       +--- Tab 1: [ ServicesScreen ]
                                       |            · Real-time catalog from 'services' table
                                       |            · Tap -> [ CreateRequestScreen ]
                                       |
                                       +--- Tab 2: [ MyRequestsScreen ]
                                       |            · RLS-isolated queries (customer_id = auth.uid())
                                       |            · Tap card -> [ RequestDetailsScreen ]
                                       |                           · Status History Timeline
                                       |                           · Eligible Cancellation Check
                                       |
                                       +--- Tab 3: [ ProfileScreen ]
                                                    · User details & read-only role
                                                    · Secure SignOut & stack flush
```
