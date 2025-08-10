# TM Grid - Concrete Management System Frontend

TM Grid is a comprehensive concrete management system that helps concrete companies streamline their operations, manage resources, and optimize scheduling. This repository contains the frontend application built with Next.js and Tailwind CSS.

![TM Grid Dashboard](https://i.ibb.co/S4SG9K1p/image.png)

## Live Deployments

- Production: [https://tmgrid.in](https://tmgrid.in)
- Staging: [https://tmhire-frontend.vercel.app](https://tmhire-frontend.vercel.app)

## Overview

TM Grid provides a complete solution for concrete companies to manage their:
- RMC Plants and their operations
- Clients and Projects
- Transit Mixers fleet
- Concrete Pumps
- Pumping Schedules
- Supply Schedules
- Calendar-based resource management

The frontend application is built on modern web technologies:

- Next.js 15.x
- React 19
- TypeScript
- Tailwind CSS V4

### Key Features

1. **Resource Management**
   - Manage RMC Plants with details like location, capacity, and contact information
   - Track Transit Mixers including status, maintenance, and assignments
   - Monitor Concrete Pumps and their availability
   - Maintain client and project information

2. **Scheduling & Planning**
   - Visual calendar interface for resource allocation
   - Pumping schedule management with conflict detection
   - Supply schedule optimization
   - Real-time availability tracking

3. **Dashboard & Analytics**
   - Overview of daily operations
   - Resource utilization metrics
   - Project status tracking
   - Performance analytics

## Installation

### Prerequisites
To get started with TM Grid frontend, ensure you have the following prerequisites installed and set up:

- Node.js 18.x or later (recommended to use Node.js 20.x or later)

### Cloning the Repository
Clone the repository using the following command:

```bash
git clone https://github.com/tmhire/tmhire-frontend.git
```

> Windows Users: place the repository near the root of your drive if you face issues while cloning.

1. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
    > Use `--legacy-peer-deps` flag if you face peer-dependency error during installation.

2. Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

## Technology Stack

- **Frontend Framework**: Next.js 15.x with App Router and React 19
- **Styling**: Tailwind CSS v4
- **State Management**: React Query for server state
- **Authentication**: NextAuth.js with multiple providers
- **Charts & Visualization**: ApexCharts
- **UI Components**: Custom components built with Tailwind CSS
- **Form Handling**: React Hook Form with validation
- **API Integration**: RESTful API with fetch client

## System Architecture

### Frontend Components
1. **Authentication System**
   - Sign in/Sign up pages
   - Protected routes with middleware
   - Session management

2. **Dashboard & Analytics**
   - Overview statistics
   - Resource utilization charts
   - Recent activities

3. **Resource Management**
   - Plants management interface
   - Transit mixer tracking
   - Pump management
   - Client and project management

4. **Scheduling System**
   - Calendar-based scheduling
   - Gantt chart views
   - Schedule conflict resolution
   - Resource allocation

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/tmhire/tmhire-frontend.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_API_URL=your_backend_api_url
   NEXTAUTH_URL=your_frontend_url
   NEXTAUTH_SECRET=your_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Configuration

The application can be configured through various environment variables:

- `NEXT_PUBLIC_API_URL`: Backend API endpoint
- `NEXTAUTH_URL`: Frontend application URL
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

## API Integration

The frontend communicates with the backend through a RESTful API. Key endpoints include:

- `/auth/*` - Authentication and user management
- `/plants/*` - RMC Plant operations
- `/clients/*` - Client management
- `/projects/*` - Project management
- `/pumps/*` - Concrete pump operations
- `/tms/*` - Transit mixer management
- `/schedules/*` - Schedule management

## Development

### Code Structure

```
src/
  ├── app/              # Next.js app directory
  │   ├── (admin)/     # Protected admin routes
  │   ├── (auth)/      # Authentication pages
  │   └── api/         # API routes
  ├── components/       # Reusable components
  ├── context/         # React context providers
  ├── hooks/           # Custom React hooks
  ├── lib/            # Utility functions
  └── types/          # TypeScript definitions
```

### Adding New Features

1. Create new components in the appropriate directory
2. Update the routing in `app/` directory
3. Add any necessary API endpoints
4. Update types in `types/` directory
5. Add tests for new functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## Security

- Authentication is handled via NextAuth.js
- All API routes are protected with middleware
- Session management with JWT tokens
- Input validation on all forms
- XSS protection through React's built-in escaping
- CSRF protection via SameSite cookies

## Support

For support or inquiries:
- Email: support@tmgrid.com
- GitHub Issues: Create a new issue in this repository

## License

Copyright © 2025 TM Grid. All rights reserved.
