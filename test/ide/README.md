# IDE specs

Failing-first specs for turning the editor into a full IDE: Vim editing,
editor features, files and workspace, language support, tools, and the VS
Code feature catalog. Each file is one feature. Make a file pass, then move
to the next one.

[FEATURES.md](FEATURES.md) is the catalog of what VS Code has, what this
editor has today, and which spec covers each feature. This README covers how
the specs work and the Vim/IDE side.

The UI engine's specs live next to the existing unit tests in
`test/unit/ui/` (events, focus, clipping, scrolling, text, flex, styles,
diff rendering). Several IDE features depend on them, as noted below.

Not covered here: mouse input (yours to design), widgets, and a visual layout
designer.

```sh
npx vitest run test/ide                    # everything
npx vitest run test/ide/vim/motions        # one feature
npx vitest test/ide/vim/motions            # watch mode while implementing
npx tsc -p test                            # type check the specs
```

## How the specs work

[`harness.ts`](harness.ts) builds a real editor (tab group, code window,
status line, the registered commands and the real normal/visual key
bindings) and hands back its `EditorContext`. Everything a spec does is a
method on `EditorContext` itself
([Editor.ts](../../src/Editor/Editor/Editor.ts)), so the specs and the
editor use the same API, and you can call the same methods from editor code:

```ts
expect(after("foo |bar baz", "dw")).eq("foo |baz");

const ide = vim("|abc", { path: "a.ts", width: 80, height: 20 });
ide.keys("iX<Esc>:w<CR>");
ide.lines(); ide.cursor(); ide.mode(); ide.statusLine(); ide.textRows();

// command specs: run a command by its id, read the marked text back
expect(exec("a|b\ncd", "textEditor.copyLinesDown")).eq("ab\na|b\ncd");
const ide = code("«foo» bar").executeCommand("textEditor.transformToUpperCase");
ide.state();                     // "«FOO» bar"
ide.setting("tab_width", 2);     // change a setting; ide.setting("tab_width") reads it
ide.show();                      // print the screen to look at it
```

| On `EditorContext` | What it does |
|---|---|
| `keys(sequence)` | presses keys in Vim notation |
| `executeCommand(id, args?)` | runs a command from `ctx.commands`; throws for an unknown id |
| `type(text)` | runs `textEditor.type`, typing at every cursor in any mode |
| `setting(key)` / `setting(key, value)` | reads or changes a setting in `src/config.ts` |
| `text()` | the document with `\|` at the cursor |
| `state()` | the document with its selections marked (`\|`, `«»`) |
| `selections()` / `setSelections(list)` | cursors and selections as `{ anchor, active }` |
| `lines()`, `cursor()`, `mode()`, `window()`, `document()`, `editorGroup()` | reading state |
| `openMemoryFile(path, content)` | opens a document that isn't on disk, in a new tab |
| `openAndFocus(path)` | opens a file from disk and focuses it, like the file tree |
| `addSidebar(window, width?)` | puts a window left of the editor group |
| `screen()`, `statusLine()`, `textRows()`, `textArea()`, `viewport()`, `canvas()`, `visibleCodeWindows()` | rendering a frame and reading it |
| `show(label?)` | prints the frame with colors, the mode, the cursor and the marked text |

- Marked text ([textMarkers.ts](../../src/Editor/textMarkers.ts)): `|` is a
  cursor. In normal mode it sits on the character after it; in insert mode
  it is the insertion point. `«` is a selection's anchor and `»` its active
  end, so `«abc»` is selected left to right and `»abc«` right to left.
  Several of them mean multiple cursors. Until multiple cursors exist,
  `setSelections` throws "multiple cursors aren't supported yet".
- Keys use Vim notation ([keyNotation.ts](../../src/Input/keyNotation.ts)):
  `<Esc> <CR> <BS> <Tab> <C-r> <Space> <lt>` (a literal `<`).
- Commands have an id, a title and a description
  ([Commands.ts](../../src/Commands/Commands.ts)) and live in `ctx.commands`
  ([CommandRegistry.ts](../../src/Commands/CommandRegistry.ts)). Ids are
  `area.camelCase`: `textEditor.moveDown`, `window.focusLeft`,
  `folding.toggle`. Specs for commands that don't exist yet fail with
  "no command with the id ...".
- Settings use the flat snake_case keys of `src/config.ts`: `tab_width`,
  `expand_tab`, `render_whitespace`, `auto_save`. `test/setup.ts` puts the
  defaults back before every test.
- `screen()`, `textRows()`, `statusLine()` render a frame and return plain
  text, so specs check what the user would see.
- `workspace({ "src/a.ts": "..." })` makes a temp folder for file features.
- The command-mode setup isn't loaded, because it binds `:q` to
  `process.exit`. `test/setup.ts` also makes any `process.exit` call throw.

[`harness.test.ts`](harness.test.ts) proves the harness drives today's editor.
It passes, and should stay passing.

Most specs only use keys and the screen, so they don't depend on internal
APIs. Features that need a new module import it from the path given in the
file's header comment. Until that module exists, the whole file fails with
"Cannot find module".

Where a test could pass just because nothing happens (`xu` gives back the same
text when neither key exists), it also checks the state in between. A test
that passes before you've built its feature is a guard on current behavior,
and it should keep passing.

## Feature map

### Vim editing: `vim/`

| Feature | Spec |
|---|---|
| Motions: `e E B ge ^ g_ f t F T ; , % { }`, counts, `5G` | [motions](vim/motions.test.ts) |
| Operators: `x X d c y r ~ J >> << p P`, with motions | [operators](vim/operators.test.ts) |
| Text objects: `iw aw i" a" i( a( i{ it ip ap` | [text-objects](vim/text-objects.test.ts) |
| Insert mode: `i a I A o O`, `<Esc>`, `<CR>`, `<BS>`, `<C-w>`, `<C-u>` | [insert-mode](vim/insert-mode.test.ts) |
| Visual mode: `v V <C-v>`, `o`, `gv`, case changes | [visual-mode](vim/visual-mode.test.ts) |
| Counts on edits and the `.` command | [repeat](vim/repeat.test.ts) |
| Registers: unnamed, `"a`, `"A`, `"0`, `"1`, `"_`, `<C-r>` | [registers](vim/registers.test.ts) |
| Undo and redo | [undo-redo](vim/undo-redo.test.ts) |
| Search: `/ ? n N * #` | [search](vim/search.test.ts) |
| Marks and the jump list | [marks-and-jumps](vim/marks-and-jumps.test.ts) |
| Macros: `q @ @@` | [macros](vim/macros.test.ts) |
| Command line: ranges, `:d :m :t`, history, completion, errors | [ex-commands](vim/ex-commands.test.ts) |
| `:s` and `:%s` | [substitute](vim/substitute.test.ts) |
| View follows the cursor, `<C-d> <C-u> <C-f> <C-b> <C-e> <C-y> zz zt zb H M L` | [scrolling](vim/scrolling.test.ts) |

### Editor features: `editor/`

| Feature | Spec | Needs |
|---|---|---|
| Status line: mode, file, `[+]`, line:col, type, pending keys | [status-line](editor/status-line.test.ts) | |
| Line numbers, relative numbers | [line-numbers](editor/line-numbers.test.ts) | |
| Soft wrap, `gj gk`, `:set nowrap/linebreak` | [soft-wrap](editor/soft-wrap.test.ts) | UI word wrap |
| Language detection, comment strings, brackets | [language-detection](editor/language-detection.test.ts) | `src/Language/languages.ts` |
| Syntax highlighting | [syntax-highlight](editor/syntax-highlight.test.ts) | `src/Language/highlight.ts`, UI styled ranges |
| Auto-closing brackets and quotes | [auto-pairs](editor/auto-pairs.test.ts) | |
| Auto-indent, `==`, detecting the indent unit | [auto-indent](editor/auto-indent.test.ts) | |
| `gc` / `gcc` comments | [comments](editor/comments.test.ts) | language config |
| Folding: `zc zo za zM zR` | [folding](editor/folding.test.ts) | |
| `:nnoremap :nmap :inoremap :nunmap` | [keybindings](editor/keybindings.test.ts) | |
| `:set` and settings files (JSONC, user and workspace) | [settings](editor/settings.test.ts) | `loadSettings` in `src/config.ts` |

### Files and workspace: `workspace/`

| Feature | Spec | Needs |
|---|---|---|
| `:w :e :e! :q :q! :wq`, modified state, line endings | [files](workspace/files.test.ts) | `ctx.onQuit` |
| Tabs: `gt gT {n}gt :bd`, `+` on modified tabs | [tabs](workspace/tabs.test.ts) | |
| Splits: `<C-w>v s w q o > =` | [splits](workspace/splits.test.ts) | |
| File explorer: sorting, collapsing, create, rename, delete, reveal | [file-explorer](workspace/file-explorer.test.ts) | per-window keys |
| Fuzzy matching and the `<C-p>` file finder | [fuzzy-finder](workspace/fuzzy-finder.test.ts) | `src/Search/fuzzy.ts`, `ctx.setWorkspace` |
| Command palette registry | [command-palette](workspace/command-palette.test.ts) | `src/Commands/CommandRegistry.ts` |
| Find and replace in files, `:grep`, quickfix | [project-search](workspace/project-search.test.ts) | `src/Search/projectSearch.ts` |
| Session restore, recent files | [session](workspace/session.test.ts) | `src/Workspace/session.ts` |

### Language support: `language/`

| Feature | Spec | Needs |
|---|---|---|
| JSON-RPC framing for language servers and debug adapters | [jsonrpc](language/jsonrpc.test.ts) | `src/Lsp/jsonrpc.ts` |
| Applying text edits (rename, format, code actions) | [text-edits](language/text-edits.test.ts) | `src/Lsp/textEdits.ts` |
| Diagnostics: store, `]d [d`, counts in the status line | [diagnostics](language/diagnostics.test.ts) | `src/Lsp/diagnostics.ts` |
| Completion list, `<C-n> <C-p>` word completion | [completion](language/completion.test.ts) | `src/Language/completion.ts` |
| Snippets: parser and expansion with `<Tab>` | [snippets](language/snippets.test.ts) | `src/Language/snippets.ts` |

### Tools: `tools/`

| Feature | Spec | Needs |
|---|---|---|
| Git status parsing, branch in the status line | [git](tools/git.test.ts) | `src/Tools/git.ts` |
| Diff and gutter marks, `]c [c` | [git-gutter](tools/git-gutter.test.ts) | `src/Tools/diff.ts` |
| Problem matchers (tsc, gcc) and running tasks | [problem-matcher](tools/problem-matcher.test.ts) | `src/Tools/problemMatcher.ts`, `src/Tools/tasks.ts` |
| Terminal emulator for an integrated terminal | [terminal-emulator](tools/terminal-emulator.test.ts) | `src/Terminal/VirtualTerminal.ts` |
| Breakpoints that follow edits | [breakpoints](tools/breakpoints.test.ts) | `src/Debug/breakpoints.ts` |
| Notifications and message history | [notifications](tools/notifications.test.ts) | `ctx.notify` |

## Suggested order

Each step builds on the ones before it.

1. **Fix what is broken today** (see "Bugs the specs found" below). These are
   small, and they make the other specs easier to read.
2. **The editing core.** Build an edit API on `TextBuffer` (insert and delete
   a range), then undo/redo on top of it. Then restructure normal mode as
   **count + operator + motion**: a motion returns a range, an operator acts
   on a range, and text objects are motions too. Once that exists, operators,
   text objects, counts, visual mode, registers and `.` are mostly
   combinations of existing pieces. Specs: motions, operators, insert-mode,
   text-objects, undo-redo, visual-mode, registers, repeat.
3. **The screen.** Fix viewport scrolling and line numbers, then the status
   line. Unicode width and styled ranges from the UI specs come in here too.
   Specs: scrolling, line-numbers, status-line, soft-wrap.
4. **The command line.** A real ex-command parser (ranges, arguments, `!`)
   instead of exact-string lookups. Then search, substitute, marks, macros,
   mappings, `:set`, notifications.
5. **Files and workspace.** Specs: files, tabs, splits, file explorer (needs
   key routing to the focused window, from the UI key-events spec), fuzzy
   finder, command palette, project search, session.
6. **Language features.** Detection, then highlighting, then comments,
   auto-pairs, auto-indent, folding, completion, snippets.
7. **Language servers.** jsonrpc, then text edits, then diagnostics. After
   that, a real LSP client: start the server, initialize, didOpen/didChange,
   hover, definition, rename.
8. **Tools.** Git, gutter, tasks and problem matchers, the terminal emulator
   (then a pty-backed terminal panel), breakpoints (then a DAP client).

## Bugs the specs found

These are in today's code, not missing features:

- `:w` throws "Expected an EditorComponent": `saveFileCommand` checks the
  focused component, but focus is on the text view inside the
  `CodeEditorWindow` ([editorCommands.ts](../../src/Commands/editorCommands.ts)).
  Visual-mode `d` has the same problem in the other direction: it checks the
  active window with `isTextComponent`.
- `:q` calls `process.exit(0)` directly
  ([setupEditor.ts](../../src/Editor/setupEditor.ts)).
- `G` goes to the end of the current line instead of the last line
  (`goToDocumentEnd` calls `goToLineEnd`).
- `b` at the very start of a file reads line -1 and crashes the assertion in
  `TextBuffer.at`. `b` at the start of any other line lands on the last
  character above instead of the start of that word.
- The code view never scrolls: `viewport.visibleLines` is never set for the
  text view, so the cursor can move off screen.
- Line numbers count from 0.
- In insert mode `<CR>` inserts an empty line above instead of splitting the
  line, `a` appends a space to the line, and `<Esc>` doesn't move the cursor
  back.
- `dd` on the last line leaves the cursor past the end of the buffer, and an
  empty document has zero lines (it should have one empty line).
- Opening a file with a final newline shows an extra empty last line, and
  `\r\n` line endings are rewritten as `\n` on save.
- The file tree counts nodes inside collapsed folders when moving the cursor.

## Choices made in the specs

These are decisions, not facts about Vim or VS Code. Change them if you
disagree.

- `gg` and `G` are only checked for the line, not the column (Vim and Neovim
  disagree on the column).
- Folds are indent-based, VS Code style: the header line stays visible.
- Auto-pairs only step over a closing bracket they inserted themselves.
- Settings keys use the existing snake_case (`tab_width`, `expand_tab`,
  `shift_width`).
- `<C-i>` is tested as `<Tab>`, because terminals send the same byte for
  both.
- `test/unit/ui/text/layout.test.ts` "justifies on the center" expects the
  last line of a paragraph to be stretched. That conflicts with the new
  justify spec; update it when justify is fixed.
