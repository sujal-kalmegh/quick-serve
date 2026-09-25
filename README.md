# QuickServe: Service Request Management System

Enterprise-grade Service Request Management System built for the **SWASIQ Technology Internship Technical Assignment**.

## Architecture Overview
QuickServe bridges a Flutter mobile client (for Customers and Agents) and a React Admin web portal (for Administrators) with a Supabase PostgreSQL backend.

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

## Technology Stack
- **Mobile Application**: Flutter 3.x + Dart (`mobile/quickserve_mobile`)
- **Web Administration Portal**: React 19 + TypeScript + Vite + Tailwind CSS (`src/`)
- **Backend**: Supabase (PostgREST API + Auth)
- **Database**: PostgreSQL 15+ with Row Level Security (RLS)
- **State Machine**: PostgreSQL triggers validating request transitions

## Monorepo Layout
```
quickserve/
├── .env.example                          # Environment template (client-safe keys only)
├── .gitignore                            # Ignored build & credential files
├── README.md                             # Main documentation
├── package.json                          # React admin portal dependencies & scripts
├── docs/                                 # Architectural and design documents
│   ├── architecture.md                   # System design & diagrams
│   ├── database.md                       # Relational schema & integrity
│   └── security.md                       # RBAC, RLS & audit specs
├── supabase/
│   ├── config.toml                       # Local Supabase configuration
│   └── migrations/                       # Sequential SQL migrations
├── mobile/quickserve_mobile/             # Flutter mobile application
│   ├── pubspec.yaml                      # Flutter dependencies
│   └── lib/                              # Dart core, models, repositories, screens
└── src/                                  # React Admin Portal
    ├── types/database.ts                 # Database interfaces and enums
    ├── services/supabaseClient.ts        # Supabase client singleton
    └── components/                       # Admin interface components
```

## Running the Application
### React Administration Portal
```bash
npm install
npm run dev
# Running on http://localhost:3000
```

### Flutter Mobile Client
```bash
cd mobile/quickserve_mobile
flutter pub get
flutter run
```
