PerformX-360
Overview

PerformX-360 is a full-stack employee performance management system designed to centralize and streamline employee performance, appraisal, development, feedback, and workplace management processes.

The system provides role-based access for Employees, Supervisors, HR Administrators, and Leadership, ensuring that each user has access to the relevant information and functionality based on their responsibilities.

PerformX-360 is designed around a structured performance management workflow, allowing organizations to manage employees, appraisal cycles, performance development plans, meetings, notifications, and related activities through one centralized platform.

The system currently includes:

Role-Based Web Application
Secure Authentication System
Employee Performance Management
Appraisal Cycle Management
Performance Development Plan (PDP) Management
Meeting Management
Notification Management
Role-Based Dashboards
Centralized PostgreSQL Database
Key Features
Secure Authentication & Login

PerformX-360 includes a secure role-based authentication system that allows users to log in using their Employee ID and password.

The authentication system includes:

Employee ID and password-based login.
Role-based access control.
Secure password hashing.
JWT-based authentication.
HTTP-only authentication cookies.
Role-specific dashboards after login.
Session handling and session extension.
Unauthorized route access protection.
Temporary account locking for repeated unauthorized access attempts.
Dark and light mode support on the login interface.

Each user is automatically directed to the appropriate dashboard based on their assigned role.

Forgot Password & Contact HR

Employees who cannot access their accounts can submit a password reset request through the Contact HR / Forgot Password functionality.

The workflow allows:

The employee to submit a password reset request.
The system to create a notification for HR.
HR administrators to review the request.
HR to reset the employee's password through the system workflow.
The employee to access the system using the updated credentials.

Passwords are securely stored using hashing and are not exposed as plain text to system users.

Role-Based Access

PerformX-360 supports multiple user roles with separate responsibilities and dashboards.

Employee

Employees can access features related to their personal performance and development.

Employee functionality includes:

Viewing their personal dashboard.
Viewing relevant appraisal information.
Accessing Performance Development Plans.
Viewing assigned meetings and related information.
Receiving system notifications.
Managing activities related to their own performance and development.
Supervisor

Supervisors are provided with functionality to manage and monitor employees under their supervision.

Supervisor capabilities include:

Accessing a supervisor-specific dashboard.
Viewing relevant employee information.
Monitoring employee performance activities.
Participating in performance and review workflows.
Accessing meetings and employee-related activities relevant to their role.
HR Administrator

HR administrators manage organizational performance management activities and employee-related workflows.

HR functionality includes:

Employee management.
Appraisal cycle management.
Reviewing employee-related requests.
Managing password reset workflows.
Receiving HR notifications.
Accessing employee and organizational information.
Managing performance-related administrative activities.
Leadership

Leadership users have access to higher-level organizational performance information.

Leadership functionality includes:

Accessing leadership-specific dashboards.
Viewing relevant organizational performance information.
Monitoring performance-related activities.
Accessing information appropriate to leadership responsibilities.
Employee Management

The system maintains employee information within the centralized PostgreSQL database.

Employee data is structured to support:

Employee identification.
Employee names.
Employee roles.
Department relationships.
Supervisor relationships.
Authentication details.
Performance-related activities.

The system supports multiple seeded users for development and testing purposes, including Employees, Supervisors, HR Administrators, and Leadership users.

Appraisal Cycle Management

PerformX-360 supports the management of structured appraisal cycles.

Appraisal cycles allow the organization to organize and manage employee performance evaluation periods.

The functionality supports the management of:

Appraisal cycles.
Cycle-related information.
Employee participation in appraisal periods.
Performance management activities associated with each cycle.

HR administrators can access appraisal cycle management functionality through the system.

Performance Development Plans (PDP)

The Performance Development Plan functionality supports employee development and continuous performance improvement.

The PDP workflow is designed to manage employee development activities and goals related to professional growth.

The system includes functionality for:

Creating and managing development plans.
Tracking development-related information.
Supporting employee growth activities.
Connecting employee development with the broader performance management process.
Meeting Management

PerformX-360 includes meeting management functionality to support structured communication and performance-related discussions between employees, supervisors, and relevant organizational roles.

Meeting-related functionality supports the management of activities such as:

Performance-related meetings.
Employee and supervisor discussions.
Meeting information.
Scheduled activities related to performance workflows.

Meeting management forms part of the wider employee performance management process.

Notification Management

The system includes a notification system to provide users with relevant updates and alerts.

Notifications can be associated with:

Password reset requests.
HR activities.
Employee-related actions.
Performance-related workflows.
System activities.

Notifications are linked to users through the centralized database, allowing relevant users to receive information based on their role and system activity.

Role-Based Dashboards

Each role is provided with a dashboard designed around its responsibilities.

The system automatically determines the appropriate user experience based on the authenticated user's role.

Role-based dashboards provide a structured starting point for users to access relevant system features and information.

Supported dashboard experiences include:

Employee Dashboard.
Supervisor Dashboard.
HR Dashboard.
Leadership Dashboard.
System Architecture

PerformX-360 follows a modern full-stack architecture with a clear separation between the frontend, backend, and database.

Frontend

The frontend is built using:

React
TypeScript
Vite

The frontend is responsible for:

User interface rendering.
Authentication screens.
Role-based navigation.
Dashboard interfaces.
Employee and HR-related views.
Communication with backend APIs.

Vite is used as the frontend development and build tool, supporting efficient development and compatibility with modern deployment workflows.

Backend

The backend is built using:

Node.js
Express
TypeScript

The backend handles:

Authentication.
Authorization.
Employee management.
Appraisal cycle functionality.
PDP workflows.
Meeting-related functionality.
Notification management.
Database communication.
Security and access control.

The backend development server runs separately from the frontend during local development.

Database

The system uses:

PostgreSQL
Prisma ORM

PostgreSQL provides centralized relational data storage for the application.

Prisma is used to manage database access, schemas, and application data relationships.

The database stores system information including:

Employees.
User roles.
Departments.
Authentication-related information.
Appraisal cycles.
Notifications.
Performance-related data.
Development-related information.
Security events.
Security

PerformX-360 includes security-focused functionality designed to protect user accounts and system resources.

The implemented authentication and security approach includes:

Password hashing.
JWT authentication.
HTTP-only cookies.
Role-based authorization.
Protected backend routes.
Unauthorized access tracking.
Temporary account locking after repeated unauthorized access attempts.
Secure password reset workflows.

The system does not store user passwords as readable plain text.

Development Environment

The application can be run locally using separate frontend and backend development servers.

Frontend

The frontend runs through Vite.

npm run dev
Backend

The backend runs using the configured development command.

npm run dev

The backend is configured to run on:

http://localhost:5001

The frontend communicates with the backend API using the configured development environment settings.

Database Setup

PerformX-360 uses PostgreSQL as its primary database.

The project includes Prisma configuration and database scripts for managing the application schema and development data.

The development database can be initialized and seeded using the project's database setup commands.

Database functionality includes:

Schema management.
Prisma Client generation.
Development data seeding.
Employee account creation.
Department data.
Appraisal cycle data.
Development Accounts

The system includes development accounts for testing the role-based authentication and dashboard functionality.

The following accounts are available for development:

Name	Employee ID	Role	Password
Alex Perera	EMP000001	Employee	DevTest@2026
Sarah Fernando	SUP000001	Supervisor	DevTest@2026
HR Administrator	HR000001	HR	DevTest@2026
Daniel Perera	LED000001	Leadership	DevTest@2026
Nethmi Silva	EMP000901	Employee	DevTest@2026
Kevin Fernando	EMP000902	Employee	DevTest@2026
Amaya Peris	EMP000903	Employee	DevTest@2026
Ryan De Silva	EMP000904	Employee	DevTest@2026

These accounts are intended for development and testing purposes.

Git & Version Control

The project uses Git for version control.

The repository is organized to maintain a clear and professional development history.

Each meaningful feature or major change should be committed separately using clear and descriptive commit messages.

Example commit structure:

feat(auth): implement secure role-based login
feat(hr): implement employee management
feat(appraisal): implement appraisal cycle management
feat(pdp): implement performance development plan workflow
feat(meetings): implement meeting management
feat(notifications): implement notification management
feat(dashboard): implement role-based dashboard

Commits should represent meaningful completed work rather than unrelated or overly broad changes.

Deployment

PerformX-360 is designed with Vite-based frontend development and is intended to support modern web deployment workflows.

The frontend can be built for production using:

npm run build

The project is being prepared for deployment to Vercel, with production environment configuration required for the frontend API connection and backend services.

Project Status

🚧 Currently Under Active Development

The foundation of PerformX-360 is operational, including:

✔ Secure login and authentication
✔ Role-based access
✔ Employee, Supervisor, HR, and Leadership accounts
✔ Role-based dashboards
✔ PostgreSQL database integration
✔ Prisma ORM integration
✔ Password reset request workflow
✔ Contact HR functionality
✔ HR notification support
✔ Employee management
✔ Appraisal cycle management
✔ Performance Development Plan functionality
✔ Meeting management functionality
✔ Notification management
✔ Git version control

Future development will continue expanding the appraisal workflows, PDP functionality, meeting workflows, dashboards, analytics, and additional performance management capabilities.

Project Goal

PerformX-360 aims to provide a centralized and structured platform for managing the complete employee performance management process.

By bringing together authentication, employee management, appraisal cycles, professional development, meetings, notifications, and role-based access, the system is intended to improve visibility, organization, and efficiency across organizational performance management workflows.