# VimOps

Learn practical Vim by repairing simulated production incidents in the browser. VimOps focuses on the files operators and developers actually touch over SSH: Docker Compose, environment files, service configuration, and code.

## Included campaigns

- **Beginner — First Login:** six missions covering modes, `hjkl`, insertion, line edges, new lines, deletion, undo, redo, and saving.
- **Intermediate — Deployment Failure:** six missions covering search, word motions, character finds, text objects, operator-motion grammar, visual selection, yank/paste, and substitutions.
- Every later incident reuses earlier techniques. Missions validate both the final file and the intended Vim skills.

Progress is stored locally in the browser. No account or backend is required.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run build
npm test
npm run lint
```

## Technology

React 19, TypeScript, Tailwind CSS, and vinext for Cloudflare-compatible deployment.

## License

MIT
