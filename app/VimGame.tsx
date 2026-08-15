"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { missions } from "./missions";

type Mode = "NORMAL" | "INSERT" | "VISUAL" | "V-LINE" | "COMMAND" | "SEARCH";
type Snapshot = { text: string; cursor: number };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const startOfLine = (text: string, at: number) => text.lastIndexOf("\n", Math.max(0, at - 1)) + 1;
const endOfLine = (text: string, at: number) => { const end = text.indexOf("\n", at); return end < 0 ? text.length : end; };
const firstNonBlank = (text: string, at: number) => { const start = startOfLine(text, at); const match = text.slice(start, endOfLine(text, at)).search(/\S/); return start + Math.max(0, match); };

function rowColumn(text: string, at: number) {
  const before = text.slice(0, at).split("\n");
  return { row: before.length - 1, col: before.at(-1)?.length ?? 0 };
}

function cursorAt(text: string, row: number, col: number) {
  const lines = text.split("\n");
  const safeRow = clamp(row, 0, lines.length - 1);
  return lines.slice(0, safeRow).reduce((sum, line) => sum + line.length + 1, 0) + Math.min(col, lines[safeRow].length);
}

function nextWord(text: string, at: number) {
  const rest = text.slice(Math.min(text.length, at + 1));
  const match = rest.match(/(?:\W+|_+)([A-Za-z0-9_])/);
  return match?.index === undefined ? text.length : at + 1 + match.index + match[0].length - 1;
}

function previousWord(text: string, at: number) {
  const left = text.slice(0, Math.max(0, at)).replace(/\W+$/, "");
  const match = left.match(/[A-Za-z0-9_]+$/);
  return match?.index ?? 0;
}

function wordEnd(text: string, at: number) {
  const rest = text.slice(at);
  const match = rest.match(/[A-Za-z0-9_]+/);
  if (!match || match.index === undefined) return text.length;
  return at + match.index + match[0].length - 1;
}

export default function VimGame() {
  const [missionIndex, setMissionIndex] = useState(0);
  const mission = missions[missionIndex];
  const [text, setText] = useState(mission.initial);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("NORMAL");
  const [pending, setPending] = useState("");
  const [command, setCommand] = useState("");
  const [message, setMessage] = useState("NORMAL mode — use the mission keys to begin");
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const [yank, setYank] = useState("");
  const [visualAnchor, setVisualAnchor] = useState<number | null>(null);
  const [lastSearch, setLastSearch] = useState("");
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [maxUnlocked, setMaxUnlocked] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hint, setHint] = useState(-1);
  const [keystrokes, setKeystrokes] = useState(0);
  const [showMissions, setShowMissions] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vimops-progress");
    if (saved) {
      const parsed = JSON.parse(saved) as number[];
      setCompleted(new Set(parsed));
      setMaxUnlocked(Math.min(missions.length - 1, parsed.length));
    }
  }, []);

  useEffect(() => {
    editor.current?.focus();
    if (mode === "VISUAL" || mode === "V-LINE") {
      const [a, b] = visualRange();
      editor.current?.setSelectionRange(a, b);
    } else editor.current?.setSelectionRange(cursor, cursor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, text, mode]);

  const progress = Math.round((completed.size / missions.length) * 100);
  const missing = useMemo(() => mission.required.filter((item) => !used.has(item)), [mission, used]);

  function mark(name: string) { setUsed((current) => new Set(current).add(name)); }
  function snapshot() { setUndo((items) => [...items, { text, cursor }].slice(-80)); setRedo([]); }
  function replace(from: number, to: number, value: string, next = from + value.length) {
    snapshot(); setText(text.slice(0, from) + value + text.slice(to)); setCursor(next);
  }
  function enterInsert(at = cursor, source = "insert") {
    snapshot(); setCursor(clamp(at, 0, text.length)); setMode("INSERT"); setPending(""); mark(source); setMessage("INSERT mode — Esc returns to NORMAL");
  }
  function moveVertical(delta: number) {
    const { row, col } = rowColumn(text, cursor); setCursor(cursorAt(text, row + delta, col)); mark("navigate");
  }
  function visualRange(): [number, number] {
    if (visualAnchor === null) return [cursor, cursor];
    if (mode === "V-LINE") {
      const low = Math.min(visualAnchor, cursor); const high = Math.max(visualAnchor, cursor);
      const from = startOfLine(text, low); const lineEnd = endOfLine(text, high);
      return [from, lineEnd < text.length ? lineEnd + 1 : lineEnd];
    }
    return [Math.min(visualAnchor, cursor), Math.max(visualAnchor, cursor) + 1];
  }
  function doUndo() {
    const previous = undo.at(-1); if (!previous) return setMessage("Already at oldest change");
    setRedo((items) => [...items, { text, cursor }]); setUndo((items) => items.slice(0, -1));
    setText(previous.text); setCursor(previous.cursor); mark("undo"); setMessage("Change undone");
  }
  function doRedo() {
    const next = redo.at(-1); if (!next) return setMessage("Already at newest change");
    setUndo((items) => [...items, { text, cursor }]); setRedo((items) => items.slice(0, -1));
    setText(next.text); setCursor(next.cursor); mark("redo"); setMessage("Change restored");
  }
  function deleteLine(change = false) {
    const from = startOfLine(text, cursor); let to = endOfLine(text, cursor);
    if (to < text.length) to += 1; else if (from > 0) { replace(from - 1, to, "", from - 1); mark("dd"); return; }
    replace(from, to, "", Math.min(from, Math.max(0, text.length - (to - from)))); mark("dd"); if (change) setMode("INSERT");
  }
  function applyTextObject(operator: string, delimiter: string) {
    let left = text.lastIndexOf(delimiter, cursor); let right = text.indexOf(delimiter, cursor + (text[cursor] === delimiter ? 1 : 0));
    if (text[cursor] === delimiter) { left = cursor; right = text.indexOf(delimiter, cursor + 1); }
    if (left < 0 || right < 0) { setPending(""); setMessage(`No ${delimiter} pair found`); return; }
    const content = text.slice(left + 1, right);
    if (operator === "y") { setYank(content); mark("yank"); setCursor(left + 1); }
    else { replace(left + 1, right, "", left + 1); if (operator === "c") setMode("INSERT"); mark("text-object"); }
    setPending("");
  }
  function search(term: string, backwards = false) {
    if (!term) return;
    const index = backwards ? text.lastIndexOf(term, Math.max(0, cursor - 1)) : text.indexOf(term, Math.min(text.length, cursor + 1));
    const wrapped = index >= 0 ? index : backwards ? text.lastIndexOf(term) : text.indexOf(term);
    if (wrapped >= 0) { setCursor(wrapped); setMessage(`Found ${term}`); } else setMessage(`Pattern not found: ${term}`);
  }
  function validateSave(nextUsed: Set<string>) {
    const clean = (value: string) => value.replace(/\r/g, "").trimEnd();
    if (clean(text) !== clean(mission.target)) { setMessage("Saved — the incident is not fully repaired yet"); return; }
    const stillMissing = mission.required.filter((item) => !nextUsed.has(item));
    if (stillMissing.length) { setMessage(`File is correct. Complete the drill with: ${stillMissing.join(", ")}`); return; }
    const nextCompleted = new Set(completed).add(missionIndex); setCompleted(nextCompleted);
    setMaxUnlocked(Math.max(maxUnlocked, Math.min(missions.length - 1, missionIndex + 1)));
    localStorage.setItem("vimops-progress", JSON.stringify([...nextCompleted].sort((a, b) => a - b))); setShowSuccess(true);
  }
  function executeCommand(value: string) {
    setMode("NORMAL"); setCommand(""); setPending("");
    if (value === "w" || value === "wq") {
      const nextUsed = new Set(used).add("save"); setUsed(nextUsed); setMessage(`"${mission.file}" written`); validateSave(nextUsed); return;
    }
    const substitution = value.match(/^%s\/(.*?)\/(.*?)\/(g)?$/);
    if (substitution) {
      const [, before, after, global] = substitution; if (!before) return setMessage("Empty search pattern");
      snapshot(); setText(global ? text.split(before).join(after) : text.replace(before, after)); mark("substitute"); setMessage(`Replaced ${global ? "all" : "first"} “${before}”`); return;
    }
    if (value === "q" || value === "q!") { setMessage("No quitting during an incident. Finish the mission."); return; }
    setMessage(`Not an available training command: :${value}`);
  }
  function handleCommandKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    if (event.key === "Escape") { setMode("NORMAL"); setCommand(""); return; }
    if (event.key === "Backspace") { setCommand((value) => value.slice(0, -1)); return; }
    if (event.key === "Enter") {
      if (mode === "SEARCH") { setLastSearch(command); search(command); mark("search"); setMode("NORMAL"); setCommand(""); }
      else executeCommand(command); return;
    }
    if (event.key.length === 1) setCommand((value) => value + event.key);
  }
  function handleVisual(key: string) {
    if (key === "Escape" || key === "v" || key === "V") { setMode("NORMAL"); setVisualAnchor(null); return; }
    if (key === "h") setCursor(Math.max(0, cursor - 1)); else if (key === "l") setCursor(Math.min(text.length - 1, cursor + 1));
    else if (key === "j") moveVertical(1); else if (key === "k") moveVertical(-1);
    else if (["y", "d", "c"].includes(key)) {
      const [from, to] = visualRange(); const selected = text.slice(from, to);
      if (key === "y") { setYank(selected); setCursor(from); mark("yank"); }
      else { replace(from, to, "", from); if (key === "c") setMode("INSERT"); }
      setMode(key === "c" ? "INSERT" : "NORMAL"); setVisualAnchor(null); mark("visual");
    }
  }
  function handlePending(key: string) {
    if (["f", "t", "F", "T"].includes(pending)) {
      const from = pending === "F" || pending === "T" ? startOfLine(text, cursor) : cursor + 1;
      const segment = pending === "F" || pending === "T" ? text.slice(from, cursor) : text.slice(from, endOfLine(text, cursor));
      const found = pending === "F" || pending === "T" ? segment.lastIndexOf(key) : segment.indexOf(key);
      if (found >= 0) { let next = from + found; if (pending === "t") next -= 1; if (pending === "T") next += 1; setCursor(next); mark("find-char"); }
      else setMessage(`Character not found: ${key}`); setPending(""); return true;
    }
    if (pending === "g") { if (key === "g") { setCursor(0); mark("file-motion"); } setPending(""); return true; }
    if (["ci", "di", "yi"].includes(pending)) { applyTextObject(pending[0], key); return true; }
    if (["c", "d", "y"].includes(pending) && key === "i") { setPending(pending + "i"); return true; }
    if (["c", "d", "y"].includes(pending) && key === pending) {
      if (key === "d" || key === "c") deleteLine(key === "c");
      else { const from = startOfLine(text, cursor); const to = Math.min(text.length, endOfLine(text, cursor) + 1); setYank(text.slice(from, to)); mark("yank"); }
      setPending(""); return true;
    }
    if (["c", "d", "y"].includes(pending) && ["w", "e", "$"].includes(key)) {
      const to = key === "$" ? endOfLine(text, cursor) : pending === "c" && key === "w" ? wordEnd(text, cursor) + 1 : nextWord(text, cursor); const value = text.slice(cursor, to);
      if (pending === "y") { setYank(value); mark("yank"); } else { replace(cursor, to, "", cursor); if (pending === "c") setMode("INSERT"); mark("operator-motion"); }
      setPending(""); return true;
    }
    setPending(""); return false;
  }
  function handleNormal(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    event.preventDefault(); const key = event.key;
    if (pending && handlePending(key)) return;
    if (key === "h") { setCursor(Math.max(0, cursor - 1)); mark("navigate"); }
    else if (key === "l") { setCursor(Math.min(text.length, cursor + 1)); mark("navigate"); }
    else if (key === "j") moveVertical(1); else if (key === "k") moveVertical(-1);
    else if (key === "0") { setCursor(startOfLine(text, cursor)); mark("line-edge"); }
    else if (key === "^") { setCursor(firstNonBlank(text, cursor)); mark("line-edge"); }
    else if (key === "$") { setCursor(endOfLine(text, cursor)); mark("line-edge"); }
    else if (key === "w") { setCursor(nextWord(text, cursor)); mark("word-motion"); }
    else if (key === "b") { setCursor(previousWord(text, cursor)); mark("word-motion"); }
    else if (key === "e") { setCursor(wordEnd(text, cursor)); mark("word-motion"); }
    else if (key === "G") { setCursor(text.length); mark("file-motion"); } else if (key === "g") setPending("g");
    else if (["f", "t", "F", "T"].includes(key)) setPending(key); else if (["d", "c", "y"].includes(key)) setPending(key);
    else if (key === "i") enterInsert(cursor, "insert"); else if (key === "a") enterInsert(Math.min(text.length, cursor + 1), "append");
    else if (key === "A") { mark("line-edge"); enterInsert(endOfLine(text, cursor), "append"); }
    else if (key === "I") { mark("line-edge"); enterInsert(firstNonBlank(text, cursor), "insert"); }
    else if (key === "o" || key === "O") {
      const at = key === "o" ? endOfLine(text, cursor) : startOfLine(text, cursor); replace(at, at, "\n", key === "o" ? at + 1 : at); setMode("INSERT"); mark("open-line");
    }
    else if (key === "x") { if (cursor < text.length && text[cursor] !== "\n") replace(cursor, cursor + 1, "", cursor); mark("x"); }
    else if (key === "u") doUndo(); else if (event.ctrlKey && key.toLowerCase() === "r") doRedo();
    else if (key === "p" || key === "P") {
      if (!yank) { setMessage("Nothing in the yank register yet"); return; }
      let at = key === "P" ? startOfLine(text, cursor) : cursor + 1;
      if (yank.endsWith("\n")) at = key === "P" ? startOfLine(text, cursor) : Math.min(text.length, endOfLine(text, cursor) + 1);
      replace(at, at, yank, at); mark("paste");
    }
    else if (key === "v" || key === "V") { setVisualAnchor(cursor); setMode(key === "V" ? "V-LINE" : "VISUAL"); mark("visual"); }
    else if (key === ":") { setMode("COMMAND"); setCommand(""); }
    else if (key === "/" || key === "?") { setMode("SEARCH"); setCommand(""); mark("search"); }
    else if (key === "n" || key === "N") { search(lastSearch, key === "N"); mark("search"); }
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    setKeystrokes((value) => value + 1);
    if (mode === "COMMAND" || mode === "SEARCH") { handleCommandKey(event); return; }
    if (mode === "VISUAL" || mode === "V-LINE") { event.preventDefault(); handleVisual(event.key); return; }
    if (mode === "INSERT") { if (event.key === "Escape") { event.preventDefault(); setMode("NORMAL"); mark("escape"); setMessage("NORMAL mode"); } return; }
    handleNormal(event);
  }
  function selectMission(index: number) {
    if (index > maxUnlocked) return; const next = missions[index];
    setMissionIndex(index); setText(next.initial); setCursor(0); setMode("NORMAL"); setPending(""); setCommand(""); setUsed(new Set());
    setUndo([]); setRedo([]); setYank(""); setHint(-1); setKeystrokes(0); setShowSuccess(false); setShowMissions(false); setMessage("NORMAL mode — use the mission keys to begin");
    setTimeout(() => editor.current?.focus(), 0);
  }
  const lineCount = text.split("\n").length; const { row, col } = rowColumn(text, cursor); const score = Math.max(100, 1000 - keystrokes - Math.max(0, hint + 1) * 100);

  return <main className="shell">
    <header className="topbar">
      <button className="brand" onClick={() => setShowMissions(!showMissions)} aria-label="Open mission map"><span className="mark">V</span> VIMOPS</button>
      <div className="incident"><span /> INCIDENT {String(missionIndex + 1).padStart(3, "0")} · {mission.difficulty.toUpperCase()}</div>
      <div className="progress"><span>{progress}% COMPLETE</span><i><b style={{ width: `${progress}%` }} /></i></div>
    </header>
    <div className={`mission-drawer ${showMissions ? "open" : ""}`}>
      <div className="drawer-head"><span>SHIFT MAP</span><button onClick={() => setShowMissions(false)}>×</button></div>
      {(["Beginner", "Intermediate"] as const).map((difficulty) => <section key={difficulty}><h2>{difficulty}</h2>
        {missions.map((item, index) => item.difficulty === difficulty && <button key={item.id} disabled={index > maxUnlocked} className={index === missionIndex ? "active" : ""} onClick={() => selectMission(index)}>
          <span>{completed.has(index) ? "✓" : index > maxUnlocked ? "·" : String(index + 1).padStart(2, "0")}</span><div><strong>{item.chapter}</strong><small>{item.title}</small></div>
        </button>)}
      </section>)}
    </div>
    <section className="workspace">
      <aside className="briefing">
        <p className="eyebrow">{mission.chapter}</p><h1>{mission.title}</h1><p className="lede">{mission.briefing}</p>
        <div className="objective"><span>OBJECTIVE</span>{mission.objective}</div>
        <div className="keys">{mission.commands.map((item) => <div key={item.keys}><kbd>{item.keys}</kbd><span>{item.label}</span></div>)}</div>
        <div className="actions"><button onClick={() => { setHint(Math.min(mission.hints.length - 1, hint + 1)); editor.current?.focus(); }}>REQUEST HINT</button><button onClick={() => selectMission(missionIndex)}>RESET FILE</button></div>
        {hint >= 0 && <p className="hint"><span>HINT {hint + 1}/{mission.hints.length}</span>{mission.hints[hint]}</p>}
        <p className="tip">Mission map: click <strong>VIMOPS</strong>. Progress is saved on this device.</p>
      </aside>
      <section className="terminal" aria-label="Vim training editor">
        <div className="terminal-title"><span>deploy@incident</span><span>{mission.file}</span></div>
        <div className="editor-wrap"><div className="gutter">{Array.from({ length: lineCount }, (_, i) => <span className={i === row ? "current" : ""} key={i}>{i + 1}</span>)}</div>
          <textarea ref={editor} value={text} onChange={(event) => { if (mode === "INSERT") { setText(event.target.value); setCursor(event.target.selectionStart); } }} onKeyDown={onKeyDown} onClick={(event) => { setCursor(event.currentTarget.selectionStart); event.currentTarget.focus(); }} spellCheck={false} aria-label={`${mission.file} editor`} autoCapitalize="off" autoCorrect="off" />
        </div>
        <div className="commandline">{mode === "COMMAND" ? `:${command}` : mode === "SEARCH" ? `/${command}` : pending || message}</div>
        <div className="statusline"><strong className={`mode-${mode.toLowerCase()}`}>-- {mode} --</strong><span>{missing.length ? `${mission.required.length - missing.length}/${mission.required.length} drill skills used` : "all drill skills used"}</span><span>{row + 1}:{col + 1} · {keystrokes} keys</span></div>
      </section>
    </section>
    {showSuccess && <div className="success-backdrop" role="dialog" aria-modal="true" aria-label="Mission complete"><div className="success-card">
      <span className="success-icon">✓</span><p>INCIDENT RESOLVED</p><h2>{mission.title}</h2><div className="score"><strong>{score}</strong><span>OPS SCORE</span></div>
      <div className="stats"><span>{keystrokes} keystrokes</span><span>{Math.max(0, hint + 1)} hints</span><span>{used.size} skills</span></div>
      {missionIndex < missions.length - 1 ? <button onClick={() => selectMission(missionIndex + 1)}>NEXT INCIDENT <span>→</span></button> : <button onClick={() => { setShowSuccess(false); setShowMissions(true); }}>VIEW COMPLETED SHIFT</button>}
    </div></div>}
  </main>;
}
