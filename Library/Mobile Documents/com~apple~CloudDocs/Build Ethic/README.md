# Resolution Academy - Professional Development Platform

A comprehensive professional development platform that empowers growth through education and practical tools.

## Mission

Empower professional development through comprehensive education and practical tools.

## Principle

**Excellence through education** — skills, knowledge, and professional growth.

## Architecture

```
├── ios/                          # iOS SwiftUI App
├── server/                       # NestJS Backend API
├── lms/                          # SCORM/xAPI Content
├── infra/                        # Docker Compose
└── .github/workflows/            # CI/CD
```

## Quick Start

### 1. Database Setup

```bash
# Start PostgreSQL
docker compose -f infra/docker-compose.yml up -d db

# Or manually:
# docker run -d --name buildethic-db \
#   -e POSTGRES_PASSWORD=devpass \
#   -e POSTGRES_DB=buildethic \
#   -p 5432:5432 postgres:15
```

### 2. Backend Setup

```bash
cd server
cp env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/api`

### 3. iOS App

1. Open `Resolution Academy - Professional Development.xcodeproj` in Xcode
2. Build and run on simulator or device
3. The app will connect to the local API automatically

### 4. LMS Content

The SCORM packages are located in `lms/scorm/` and can be served by any static file server.

## Features

### iOS App
- **Authentication**: JWT-based login with session management
- **Learning**: Course navigation with SCORM player integration
- **Professional Tools**: Calculators, checklists, and development tools
- **Progress Tracking**: Certificate wallet and achievement transcripts
- **Offline Support**: Sync queue with retry logic
- **Photo Capture**: Professional photo upload and management

### Backend API
- **Authentication**: JWT tokens with DeviceCheck verification
- **Courses & Lessons**: RESTful API for educational content
- **LMS Integration**: SCORM launch tokens and xAPI proxy
- **Achievement Tracking**: Professional development unit aggregation
- **Photo Management**: Base64 upload with metadata
- **Audit Logging**: Privacy-safe event tracking

### SCORM Content
- **SCORM 1.2 Compliant**: Standard e-learning packages
- **Interactive Lessons**: Professional fundamentals and skill development
- **Progress Tracking**: Completion and scoring via SCORM API
- **Mobile Optimized**: Responsive design for mobile devices

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/devicecheck` - Device verification

### Courses
- `GET /courses` - List courses (with optional level filter)
- `GET /lessons/:courseId` - Get lessons for a course

### LMS
- `POST /lms/launch` - Generate SCORM launch token
- `GET /lms/validate` - Validate launch token
- `POST /xapi/statements` - Proxy xAPI statements

### Achievements
- `GET /ceu/totals` - Get achievement totals for user

### Photos
- `POST /photos` - Upload photo (base64)

## Development

### Prerequisites
- Node.js 20+
- Xcode 15.4+
- Docker & Docker Compose
- PostgreSQL 15+

### Environment Variables

Create `server/.env` from `server/env.example`:

```env
DATABASE_URL=postgresql://postgres:devpass@localhost:5432/resolution_academy
JWT_SECRET=your-secret-key
JWT_EXPIRES=7d
LRS_ENDPOINT=https://lrs.resolutionacademy.app/xapi
LRS_AUTH=Basic your-auth
SCORM_HOST=https://lms.resolutionacademy.app
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name your-migration-name

# Reset database
npx prisma migrate reset
```

### iOS Development

The iOS app uses:
- SwiftUI for UI
- Combine for reactive programming
- Core Data for local persistence
- URLSession for networking

### Testing

```bash
# Backend tests
cd server && npm test

# iOS tests
# Run in Xcode or via command line
```

## CI/CD

GitHub Actions automatically:
- Builds iOS app on macOS
- Tests backend with PostgreSQL
- Runs linting and type checking
- Deploys on successful builds

## Compliance

### Privacy
- Privacy manifest included (`PrivacyInfo.xcprivacy`)
- No third-party tracking
- Minimal data collection
- User consent controls

### Educational Standards
- ANSI/IACET ready CEU documentation
- SCORM 1.2 compliant content
- xAPI statement tracking
- Audit trail for compliance

### App Store
- Export compliance documentation
- ATT consent flow (disabled by default)
- DeviceCheck integration ready
- Region gating support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Proprietary - Resolution Academy Team

## Support

For questions or support, contact: support@resolutionacademy.app

---

**Remember: Excellence through education** — skills, knowledge, and professional growth.
