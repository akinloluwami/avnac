# Contributing

Thanks for contributing to Avnac. Pull requests are welcome.

> Important: For major changes, open an issue first so the idea can be discussed before work starts.

## Before You Start

1. Search the open PRs to make sure a pull request doesn't already exist for that issue.
2. If you want to open a new issue, check that it has not already been raised.
3. For larger changes, comment on the issue before starting so the work stays aligned with the project direction.

## Getting Started

1. Fork the repository and clone your fork.

```bash
git clone https://github.com/YOUR_USERNAME/avnac.git
cd avnac
```

2. Install dependencies.

```bash
cd frontend
npm install
```

If you want to work on the backend:

```bash
cd backend
npm install
```

## Run Locally

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

## Make Changes

1. Create a branch for your work.

```bash
git checkout -b fix/short-description
```

2. Make your changes.

3. Run the relevant tests or type checks before you commit.

## Commit and Pull Request

1. Commit your fix with a clear message, ideally using a semantic prefix such as `fix:` or `feat:`.

```bash
git commit -m "fix: describe the change"
```

2. Push your branch.

```bash
git push origin your-branch-name
```

3. Open a pull request against `main` and include:

- What changed
- The issue number

## Notes

- Keep pull requests focused on a single change.
- If the change affects behavior or UI, add screenshots.
- Thank you for helping improve Avnac.
