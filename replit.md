# Drone Service Centre Field App

## Overview
A full-stack application for managing a drone service center, including inventory management, service request tracking, and role-based access control (Admin, Engineer, Accounts).

## Features
- **Inventory Management**: Track stock levels, low stock alerts, manual addition, and automatic deduction upon usage.
- **Service Workflow**:
  - **Admin**: Create requests, assign engineers, manage users.
  - **Field Engineer**: Accept requests, log parts consumed, upload evidence (images/docs), complete services.
  - **Accounts**: View completed requests, generate reports, handle billing.
- **Role-Based Access**: Secure access control using Replit Auth and custom role management.
- **Reporting**: Automated PDF generation for service reports.
- **Dashboards**: Tailored views for each role.

## Tech Stack
- **Frontend**: React, Vite, Shadcn UI, Tailwind CSS, Recharts, Framer Motion.
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL.
- **Auth**: Replit Auth (OIDC).
- **Storage**: Replit Object Storage (Google Cloud Storage) for file uploads.
- **PDF**: PDFKit for report generation.

## Setup & Deployment
- **Database**: PostgreSQL (Neon via Replit).
- **Object Storage**: Replit Object Storage bucket required.
- **Authentication**: Replit Auth configuration required.

## Roles
- **Admin**: Full access.
- **Engineer**: Access to assigned requests and inventory usage.
- **Account**: Access to completed requests and billing.

## Notable Files
- `shared/schema.ts`: Database schema and types.
- `server/routes.ts`: API endpoints.
- `server/storage.ts`: Database access layer.
- `client/src/pages`: Frontend pages (Dashboard, Inventory, Service Requests, Users).

## Future Improvements
- Email notifications for low stock and request updates.
- Real-time updates using WebSockets.
- Advanced analytics for inventory and service performance.
