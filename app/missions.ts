export type Mission = {
  id: string;
  difficulty: "Beginner" | "Intermediate";
  chapter: string;
  title: string;
  briefing: string;
  objective: string;
  file: string;
  initial: string;
  target: string;
  commands: { keys: string; label: string }[];
  required: string[];
  hints: string[];
};

export const missions: Mission[] = [
  {
    id: "first-login", difficulty: "Beginner", chapter: "FIRST LOGIN", title: "The container won’t start.",
    briefing: "A typo slipped into the web image tag. Repair it before the next health check.",
    objective: "Change nginx:latset to nginx:latest, leave Insert mode, and save.", file: "docker-compose.yml",
    initial: `services:\n  web:\n    image: nginx:latset\n    ports:\n      - "8080:80"`,
    target: `services:\n  web:\n    image: nginx:latest\n    ports:\n      - "8080:80"`,
    commands: [{ keys: "h j k l", label: "move" }, { keys: "i", label: "insert" }, { keys: "Esc", label: "normal" }, { keys: ":w", label: "save" }],
    required: ["insert", "save"], hints: ["Move onto latset with j and l.", "Press i, correct the word, then press Esc.", "Type :w and Enter to validate the repair."],
  },
  {
    id: "wrong-port", difficulty: "Beginner", chapter: "CURSOR CONTROL", title: "Traffic is hitting the wrong port.",
    briefing: "The proxy expects port 80, but the container exposes 88. Navigate without arrow keys.",
    objective: "Change the container port from 88 to 80 using h, j, k, or l, then save.", file: "docker-compose.yml",
    initial: `services:\n  proxy:\n    image: caddy:2\n    ports:\n      - "443:88"`,
    target: `services:\n  proxy:\n    image: caddy:2\n    ports:\n      - "443:80"`,
    commands: [{ keys: "h j k l", label: "navigate" }, { keys: "x", label: "delete char" }, { keys: "i", label: "insert" }, { keys: ":w", label: "save" }],
    required: ["navigate", "x", "save"], hints: ["Use j to reach the ports line and l to move across it.", "Place the cursor on the final 8 and press x.", "Insert 0, return to Normal mode, then :w."],
  },
  {
    id: "line-edges", difficulty: "Beginner", chapter: "FAST LANES", title: "The restart policy is incomplete.",
    briefing: "Long configuration lines punish slow cursor travel. Jump directly to their edges.",
    objective: "Change restart: alway to restart: always using a line-edge jump.", file: "compose.prod.yml",
    initial: `services:\n  api:\n    image: ghcr.io/acme/api:2.7.1\n    restart: alway`,
    target: `services:\n  api:\n    image: ghcr.io/acme/api:2.7.1\n    restart: always`,
    commands: [{ keys: "$", label: "line end" }, { keys: "0 / ^", label: "line start" }, { keys: "a", label: "append" }, { keys: ":w", label: "save" }],
    required: ["line-edge", "append", "save"], hints: ["Use j to reach the last line.", "Press $ to jump to the end.", "Press a, type s, Esc, then :w."],
  },
  {
    id: "missing-env", difficulty: "Beginner", chapter: "OPEN A LINE", title: "Production has no environment.",
    briefing: "The API starts with unsafe defaults because APP_ENV is missing.",
    objective: "Open a line below environment: and add four spaces followed by APP_ENV: production.", file: "docker-compose.yml",
    initial: `services:\n  api:\n    image: acme/api:2.0\n    environment:`,
    target: `services:\n  api:\n    image: acme/api:2.0\n    environment:\n      APP_ENV: production`,
    commands: [{ keys: "o", label: "open below" }, { keys: "O", label: "open above" }, { keys: "Esc", label: "normal" }, { keys: ":w", label: "save" }],
    required: ["open-line", "save"], hints: ["Move to the environment line.", "Press o to create and enter a line below it.", "Type the indented setting, Esc, then :w."],
  },
  {
    id: "duplicate-volume", difficulty: "Beginner", chapter: "DELETE & RECOVER", title: "A volume is mounted twice.",
    briefing: "One duplicate mount prevents a clean deployment. Remove the whole line in one command.",
    objective: "Delete the second ./data:/data line. Practice undo once before saving.", file: "docker-compose.yml",
    initial: `services:\n  db:\n    image: postgres:16\n    volumes:\n      - ./data:/data\n      - ./data:/data`,
    target: `services:\n  db:\n    image: postgres:16\n    volumes:\n      - ./data:/data`,
    commands: [{ keys: "dd", label: "delete line" }, { keys: "u", label: "undo" }, { keys: "Ctrl-r", label: "redo" }, { keys: ":w", label: "save" }],
    required: ["dd", "undo", "save"], hints: ["Move to the duplicate final line and press dd.", "Press u to restore it—recovery is part of the drill.", "Delete it again (or Ctrl-r), then :w."],
  },
  {
    id: "beginner-boss", difficulty: "Beginner", chapter: "INCIDENT REVIEW", title: "Staging is down.",
    briefing: "A rushed merge left three obvious faults. Use everything from the first shift.",
    objective: "Fix the image tag, remove the duplicate restart line, and add LOG_LEVEL: info below environment:.", file: "compose.staging.yml",
    initial: `services:\n  worker:\n    image: acme/worker:lates\n    restart: always\n    restart: always\n    environment:`,
    target: `services:\n  worker:\n    image: acme/worker:latest\n    restart: always\n    environment:\n      LOG_LEVEL: info`,
    commands: [{ keys: "i / a", label: "edit" }, { keys: "dd", label: "delete line" }, { keys: "o", label: "open line" }, { keys: "u", label: "recover" }],
    required: ["insert", "dd", "open-line", "save"], hints: ["Repair lates with an insert or append.", "Use dd on one restart line.", "Use o beneath environment:, add the indented setting, then :w."],
  },
  {
    id: "search-logs", difficulty: "Intermediate", chapter: "SEARCH PARTY", title: "The secret is still in debug mode.",
    briefing: "The same key appears throughout a long environment file. Search beats scrolling.",
    objective: "Find DEBUG=true and change it to DEBUG=false.", file: ".env.production",
    initial: `APP_ENV=production\nPORT=8080\nCACHE_TTL=300\nWORKERS=4\nLOG_FORMAT=json\nDEBUG=true\nHEALTH_PATH=/health`,
    target: `APP_ENV=production\nPORT=8080\nCACHE_TTL=300\nWORKERS=4\nLOG_FORMAT=json\nDEBUG=false\nHEALTH_PATH=/health`,
    commands: [{ keys: "/", label: "search" }, { keys: "n / N", label: "repeat" }, { keys: "w b e", label: "words" }, { keys: ":w", label: "save" }],
    required: ["search", "word-motion", "save"], hints: ["Type /DEBUG and press Enter.", "Use w to reach true.", "Change the value, then :w."],
  },
  {
    id: "quoted-host", difficulty: "Intermediate", chapter: "TEXT OBJECTS", title: "Redis moved hosts.",
    briefing: "Editing inside delimiters is faster and safer than selecting characters manually.",
    objective: "Change only the text inside REDIS_HOST quotes to cache.internal.", file: "config.py",
    initial: `REDIS_HOST = "redis-old.internal"\nREDIS_PORT = 6379\nREDIS_DB = 0`,
    target: `REDIS_HOST = "cache.internal"\nREDIS_PORT = 6379\nREDIS_DB = 0`,
    commands: [{ keys: "f\"", label: "find quote" }, { keys: "ci\"", label: "change inside" }, { keys: "Esc", label: "normal" }, { keys: ":w", label: "save" }],
    required: ["find-char", "text-object", "save"], hints: ["Press f followed by a double quote.", "Press ci\" to replace everything inside the quotes.", "Type cache.internal, Esc, then :w."],
  },
  {
    id: "operator-motion", difficulty: "Intermediate", chapter: "VIM GRAMMAR", title: "The health check lies.",
    briefing: "Operators combine with motions. Learn the grammar once; compose it everywhere.",
    objective: "Change unhealthy to healthy using a change operator plus a word motion.", file: "health.conf",
    initial: `status = unhealthy\ninterval = 30s\ntimeout = 5s`,
    target: `status = healthy\ninterval = 30s\ntimeout = 5s`,
    commands: [{ keys: "w", label: "next word" }, { keys: "b", label: "previous word" }, { keys: "cw", label: "change word" }, { keys: "dw", label: "delete word" }],
    required: ["word-motion", "operator-motion", "save"], hints: ["Use w repeatedly to reach unhealthy.", "Press cw to remove the word and enter Insert mode.", "Type healthy, Esc, then :w."],
  },
  {
    id: "copy-probe", difficulty: "Intermediate", chapter: "COPY WITH INTENT", title: "The worker has no health check.",
    briefing: "A working probe already exists. Yank it instead of retyping it.",
    objective: "Duplicate the line healthcheck: /ready so it appears twice.", file: "services.yml",
    initial: `api:\n  healthcheck: /ready\nworker:\n  image: acme/worker:2`,
    target: `api:\n  healthcheck: /ready\n  healthcheck: /ready\nworker:\n  image: acme/worker:2`,
    commands: [{ keys: "V", label: "select line" }, { keys: "y", label: "yank" }, { keys: "p", label: "paste below" }, { keys: ":w", label: "save" }],
    required: ["visual", "yank", "paste", "save"], hints: ["Move to the healthcheck line and press V.", "Press y to copy the selected line.", "Press p to paste it below, then :w."],
  },
  {
    id: "global-replace", difficulty: "Intermediate", chapter: "COMMAND THE FILE", title: "The registry was renamed.",
    briefing: "Four services still pull from registry.old. One substitution can repair them all.",
    objective: "Replace every registry.old occurrence with registry.new.", file: "docker-compose.yml",
    initial: `services:\n  api:\n    image: registry.old/api:3\n  worker:\n    image: registry.old/worker:3\n  cron:\n    image: registry.old/cron:3`,
    target: `services:\n  api:\n    image: registry.new/api:3\n  worker:\n    image: registry.new/worker:3\n  cron:\n    image: registry.new/cron:3`,
    commands: [{ keys: ":%s/a/b/g", label: "replace all" }, { keys: "u", label: "undo" }, { keys: "n", label: "next match" }, { keys: ":w", label: "save" }],
    required: ["substitute", "save"], hints: ["Enter Command mode with :.", "Type %s/registry.old/registry.new/g and press Enter.", "Save with :w."],
  },
  {
    id: "intermediate-boss", difficulty: "Intermediate", chapter: "DEPLOYMENT FAILURE", title: "Restore production.",
    briefing: "The final incident combines navigation, search, text objects, line operations, and substitution.",
    objective: "Change the quoted host to api.internal, remove the duplicate port line, and replace every :dev tag with :stable.", file: "compose.production.yml",
    initial: `services:\n  gateway:\n    image: registry/gateway:dev\n    environment:\n      API_HOST: "api.staging"\n    ports:\n      - "443:443"\n      - "443:443"\n  api:\n    image: registry/api:dev`,
    target: `services:\n  gateway:\n    image: registry/gateway:stable\n    environment:\n      API_HOST: "api.internal"\n    ports:\n      - "443:443"\n  api:\n    image: registry/api:stable`,
    commands: [{ keys: "/ + ci\"", label: "find & change" }, { keys: "dd", label: "delete line" }, { keys: ":%s", label: "substitute" }, { keys: "u", label: "recover" }],
    required: ["search", "text-object", "dd", "substitute", "save"], hints: ["Search for API_HOST, then use ci\" inside its quotes.", "Use dd on one duplicate port line.", "Run :%s/:dev/:stable/g, then :w."],
  },
];
