# System Patterns

## Architecture Overview

TreeMaker follows a typical SvelteKit architecture with server and client components:

```mermaid
flowchart TD
    Client[Client Browser] <--> SvelteKit[SvelteKit App]
    SvelteKit <--> API[API Routes]
    API <--> DB[(Database)]
    API <--> CloudStorage[Cloudinary]
```

## Key Design Patterns

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginForm
    participant AuthAPI
    participant Lucia
    participant Database
    
    User->>LoginForm: Enter credentials
    LoginForm->>AuthAPI: POST /api/auth/login
    AuthAPI->>Database: Find user by email
    Database-->>AuthAPI: Return user (if exists)
    AuthAPI->>Lucia: Verify password
    Lucia-->>AuthAPI: Password valid/invalid
    AuthAPI->>Lucia: Create session
    Lucia->>Database: Store session
    Lucia-->>AuthAPI: Return session
    AuthAPI->>LoginForm: Set session cookie
    LoginForm->>User: Redirect to home
```

### Data Access Pattern

The application uses a service-based pattern for data access:

```mermaid
flowchart TD
    API[API Routes] --> Services[Service Layer]
    Services --> PrismaClient[Prisma Client]
    PrismaClient --> Database[(Database)]
```

### Component Hierarchy

```mermaid
flowchart TD
    Layout[Layout] --> Pages[Pages]
    Pages --> Components[Components]
    Components --> Forms[Form Components]
    Components --> Display[Display Components]
    Components --> Tree[Tree Components]
```

## Key System Components

### Authentication System
- **Lucia**: Core authentication library
- **Custom Prisma Adapter**: Database integration
- **Session Management**: Cookie-based sessions
- **Two-Factor Authentication**: Optional TOTP-based 2FA

### Family Tree Management
- **Tree Service**: CRUD operations for trees
- **Person Service**: CRUD operations for people
- **Relationship Service**: Manages connections between people
- **Media Service**: Handles media uploads and retrieval

### UI Components
- **Tree Visualization**: Interactive tree display
- **Person Cards**: Display person information
- **Relationship Editor**: Manage relationships
- **Media Gallery**: Display and manage media

## Data Flow Patterns

### Tree Creation and Editing
1. User creates/selects a tree
2. User adds/edits people in the tree
3. User establishes relationships between people
4. User adds media to people
5. Tree is visualized with the updated information

### Authentication Flow
1. User registers or logs in
2. Session is created and stored
3. User is authenticated for subsequent requests
4. Optional 2FA verification
5. Session is refreshed as needed

## Error Handling Patterns
- API routes return standardized error responses
- Client-side form validation
- Server-side validation
- Detailed error logging for debugging
