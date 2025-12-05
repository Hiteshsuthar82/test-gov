# Test Prep Web Application

A modern web application for exam preparation built with React, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🔐 Authentication (OTP-based login/register)
- 📚 Browse categories and test sets
- 📝 Take mock tests with timer
- 📊 View detailed results and explanations
- 👤 User profile and subscription management
- 🎨 Clean, modern UI with purple theme

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
VITE_API_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Routing
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/     # Reusable components
│   ├── layout/    # Layout components (Navbar, Layout)
│   └── ui/        # shadcn/ui components
├── pages/         # Page components
│   ├── auth/      # Authentication pages
│   └── ...        # Other pages
├── lib/           # Utilities and API client
├── store/         # Zustand stores
└── App.tsx        # Main app component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
