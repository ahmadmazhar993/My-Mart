# AHM Mart - Backend API

E-commerce backend API built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

```bash
npm install
cp .env.example .env
# Update .env with your database credentials
```

## Database Setup

```bash
createdb ahm_mart_db
npm run migrate
npm run seed
```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | — |
| `DB_NAME` | Database name | `ahm_mart_db` |
| `APP_PORT` | Server port | `5000` |
| `HOST_PATH` | Frontend URL for email links | `http://localhost:5173` |
| `CONTACT_TO_EMAIL` | Contact form inbox | `support@ahmmart.com` |

## Email

Transactional emails use **Mailgen** templates in `src/email/templates/` with the AHM Mart theme in `src/email/theme/`.

- **Development:** emails route to local MailHog on port `1025` (run MailHog separately).
- **Production:** configure SMTP in the `appSettings` table (`name = 'SMTP'`) or update the seed.

| Template | Trigger |
|----------|---------|
| Contact (admin + acknowledgement) | Contact form submission |
| Welcome | User registration |
| Order confirmation | New order placed |
| Order status update | Admin changes order status |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database |
| `npm run lint` | Run ESLint |
