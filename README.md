# Transit Mixer Calculator

A Next.js application for concrete transit mixer management, scheduling and optimization.

## Features

- **Plant Management**: Manage concrete plants and their details
- **Client Management**: Track and manage your clients' information
- **Transit Mixer Management**: Add, edit, and manage your fleet of transit mixers
- **Schedule Calendar**: View a calendar of all scheduled concrete deliveries
- **Optimized Scheduling**: Create optimized delivery schedules based on:
  - Required concrete quantity
  - Pumping speed
  - Travel times
  - Available transit mixers
  - Scheduled date and pump start time
- **Real-time Updates**: Get immediate feedback on schedule changes
- **Schedule Viewing**: Detailed schedule timelines showing departure and arrival times

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the application.

## Technology Stack

- **Frontend**: Next.js 14 with App Router
- **UI Components**: Shadcn UI (based on Radix UI)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js
- **API Integration**: Custom API client for backend communication

## Application Structure

- `/app`: Next.js app router pages
  - `/dashboard`: Main application dashboard
  - `/dashboard/plants`: Plant management
  - `/dashboard/clients`: Client management
  - `/dashboard/tms`: Transit mixer management
  - `/dashboard/calendar`: Schedule calendar view
  - `/dashboard/schedules`: Schedule management and creation
- `/components`: Reusable React components
- `/lib`: Utility functions and API client

## Backend Integration

The application integrates with a dedicated backend service providing:
- Authentication
- CRUD operations for plants, clients, and transit mixers
- Schedule calculation algorithms
- Calendar and availability management

## License

This project is proprietary software of TMHire.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
