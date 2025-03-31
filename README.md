# Starter Issues

This is a website that helps people find beginner-friendly GitHub issues to work on.

**[Visit Starter Issues →](https://starterissues.com)**

## What it does

It pulls open issues labeled as "good first issue" from GitHub and lets you filter them by:

- Programming language
- Repository
- Labels
- Star count

You can bookmark issues you want to work on and switch between dark and light modes depending on your preference.

## Tech stack

I built it with:

- Next.js for the frontend and API routes
- Postgres database (Neon)
- Redis for caching API responses
- GitHub API to fetch issue data
- AWS Amplify for hosting

The app also refreshes data every hour and removes all closed issues automatically.

## Contributing

Contributions are welcome!
