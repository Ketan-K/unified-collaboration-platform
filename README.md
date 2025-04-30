# Unified Collaboration Platform

A comprehensive real-time collaboration platform with integrated video conferencing, messaging, file sharing, and collaborative tools.

## Project Structure

This is a monorepo containing all the components of the Unified Collaboration Platform:

- `apps/` - Client applications
  - `web/` - Next.js web application
  - `admin/` - Angular admin dashboard
  - `desktop/` - Electron desktop application
- `server/` - Backend services
  - `api/` - Main REST API server
  - `signaling/` - WebRTC signaling server
  - `ai-services/` - AI integration services
- `shared/` - Shared components and utilities

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM (package manager)
- MongoDB (for production)

### Installation

```bash
# Install dependencies for all workspaces
pnpm install
```

### Development

Start the web application:
```bash
pnpm --filter web dev
```

Start the API server:
```bash
pnpm --filter api dev
```

Start the signaling server:
```bash
pnpm --filter signaling dev
```

### Building for Production

```bash
# Build all applications
pnpm build

# Build a specific application
pnpm --filter web build
```

## Features

- Real-time video conferencing with WebRTC
- Text chat and messaging
- File sharing and collaborative document editing
- User authentication and room management
- Cross-platform support (web, desktop)

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Redux Toolkit
- **Backend**: Node.js, Express, Socket.IO
- **Real-time Communication**: WebRTC, Socket.IO
- **Database**: MongoDB
- **Admin Dashboard**: Angular
- **Desktop App**: Electron

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

[MIT](LICENSE)