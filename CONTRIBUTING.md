# Contributing to Family Tracker

Thank you for your interest in contributing to Family Tracker! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker and Docker Compose (optional)

### Local Development

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   cd backend && cp .env.example .env
   cd ../frontend && cp .env.example .env
   ```

3. Start PostgreSQL database

4. Run backend:
   ```bash
   cd backend
   npm run dev
   ```

5. Run frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use meaningful variable and function names
- Add type annotations where helpful

### React

- Use functional components with hooks
- Keep components small and focused
- Use meaningful component names
- Follow React best practices

### CSS

- Use Tailwind CSS utility classes
- Keep custom CSS minimal
- Follow mobile-first responsive design

## Testing

Before submitting a pull request:

1. Test all functionality manually
2. Ensure no console errors
3. Test on both desktop and mobile
4. Verify responsive design works

## Pull Request Process

1. Update README.md if needed
2. Update documentation for new features
3. Ensure your code follows the style guide
4. Write clear commit messages
5. Create a descriptive pull request

### Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: format code`
- `refactor: restructure code`
- `test: add tests`
- `chore: update dependencies`

## Feature Requests

Have an idea? Open an issue with:
- Clear description of the feature
- Use case and benefits
- Any implementation ideas

## Bug Reports

Found a bug? Open an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details

## Areas for Contribution

### High Priority

- [ ] Custom mobile app development (React Native/Flutter)
- [ ] End-to-end tests
- [ ] Unit tests for critical functions
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Location history visualization
- [ ] Geofencing/regions support

### Medium Priority

- [ ] Email notifications
- [ ] Export location data
- [ ] Location sharing links
- [ ] Better error handling
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Low Priority

- [ ] More map providers
- [ ] Custom markers/icons
- [ ] Location notes/comments
- [ ] Weather integration
- [ ] Battery optimization tips

## Code Review

All submissions require review. We aim to:
- Provide feedback within 48 hours
- Be respectful and constructive
- Help improve code quality

## Community Guidelines

- Be respectful and inclusive
- Help others learn
- Focus on constructive feedback
- Celebrate successes

## Questions?

Open an issue or discussion if you have questions about contributing.

Thank you for contributing to Family Tracker!
