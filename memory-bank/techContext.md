# Technical Context

## Technologies Used

### Frontend
- **SvelteKit**: Full-stack framework for building web applications
- **TailwindCSS**: Utility-first CSS framework for styling
- **TypeScript**: Typed superset of JavaScript for improved developer experience

### Backend
- **SvelteKit API Routes**: Server-side API endpoints
- **Prisma ORM**: Database ORM for TypeScript
- **SQLite**: Lightweight relational database
- **Lucia**: Authentication library for SvelteKit
- **Oslo**: Cryptographic library for password hashing
- **Cloudinary**: Cloud-based media management service

## Development Setup
- Node.js environment
- NPM for package management
- Environment variables for configuration
  - `DATABASE_URL`: SQLite database connection string
  - `ENCRYPTION_KEY`: Key for encryption operations
  - `CLOUDINARY_*`: Cloudinary configuration

## Database Schema
The application uses a relational database with the following key models:
- **User**: Authentication and user account information
- **Session**: User session management
- **Key**: Password and authentication keys
- **Tree**: Family tree information
- **Person**: Individual person data within a tree
- **Relationship**: Connections between people (spouse, sibling, etc.)
- **FamilyRelation**: Parent-child relationships
- **Node**: Visual positioning of people in the tree
- **Media**: Media files associated with people
- **Layout**: Tree visualization layouts

## Authentication System
- **Lucia**: Handles authentication and session management
- **Custom Prisma Adapter**: Connects Lucia to the database
- **Two-Factor Authentication**: Optional 2FA using TOTP
- **Password Hashing**: Argon2id via Oslo library

## API Structure
The application uses SvelteKit's API routes for server-side operations:
- `/api/auth/*`: Authentication endpoints
- `/api/trees/*`: Family tree management
- `/api/people/*`: Person management
- `/api/relationships/*`: Relationship management
- `/api/media/*`: Media management

## Technical Constraints
- SQLite database limits
- Browser compatibility considerations
- Session management and security
- Media storage and retrieval performance
