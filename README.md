# Groww Income Calculator

A stock buy/sell profit & loss tracker with a separate frontend and backend so each can be deployed independently.

## Project Structure

```
Grow_Income/
├── frontend/         # Static site (HTML + CSS + vanilla JS)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── config.js     # API base URL (edit before deploy)
└── backend/          # Node.js + Express REST API
    ├── server.js
    ├── package.json
    └── data.json     # auto-created on first save
```

## Running Locally

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

Backend runs at `http://localhost:3000`.

### 2. Open the frontend

Just double-click `frontend/index.html`, or serve it with any static server:

```bash
cd frontend
npx serve .
```

The frontend reads `config.js` to find the backend. By default it points to `http://localhost:3000`.

## API Endpoints

| Method | Path              | Description                          |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/api/stocks`     | List all entries with computed P&L   |
| POST   | `/api/stocks`     | Add an entry `{name, quantity, buyPrice, sellPrice}` |
| DELETE | `/api/stocks/:id` | Delete one entry                     |
| DELETE | `/api/stocks`     | Clear all entries                    |

## Deployment

**Backend** — deploy to Render, Railway, Fly.io, or any Node host. Set the start command to `node server.js`. Note: file-based storage (`data.json`) does not survive container restarts on most platforms; swap in a real database (Postgres, MongoDB, SQLite-on-volume) for production.

**Frontend** — deploy `frontend/` as a static site to Vercel, Netlify, GitHub Pages, or Cloudflare Pages. Before deploying, edit `frontend/config.js` and set `window.API_BASE_URL` to your deployed backend URL.

## Features

- Add stock entries (name, quantity, buy price, sell price)
- Auto-calculated buy total, sell total, P&L amount, and P&L %
- Summary: total invested, total returned, net profit/loss, overall return %
- Color-coded profit (green) / loss (red)
- Delete individual entries or clear all
