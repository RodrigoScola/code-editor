# VS Code features, and what this editor has

Researched from the VS Code docs (code.visualstudio.com/docs: editing,
source control, terminal, debugging, tasks, testing, settings, keybindings,
workspaces, CLI, variables reference, user interface, tips and tricks).

Each feature points at its base spec (pass 1). The niche cases (pass 2) are
in `*.edge.test.ts` files in the same folder: one per base spec for the
bigger editor features, one per area elsewhere. The list is
[at the end](#edge-case-files). Features already specced in `test/ide/`
link there instead of repeating them.

**Here** means what this editor has today: ✓ has it, ◐ partly, ✗ missing.

**Left out** (needs a server or network): Remote Development (SSH, WSL,
containers, tunnels), port forwarding, Live Share, Settings Sync, Copilot
and chat, the extension marketplace, git clone/fetch/pull/push/sync/publish,
GitHub pull requests and issues, accounts and sign-in, telemetry, update
checks, vscode.dev. Mouse interaction is also left out (yours to design).

How the specs work: [harness.ts](harness.ts). Editor features are driven by
their real VS Code command IDs; everything else tests a module directly.
Proposed module paths are in each spec's header.

---

## 1. Editor: basic editing

| Feature | Here | Spec |
|---|---|---|
| Multiple cursors: add above/below, Ctrl+D next occurrence, skip occurrence, select all occurrences, cursor at end of each selected line, undo cursor, multi-cursor paste (spread/full) | ✗ | [editor/multi-cursor](editor/multi-cursor.test.ts) |
| Line operations: copy/move line up/down, delete line, insert line above/below, join lines, transpose, duplicate selection, select line (Ctrl+L), indent/outdent, delete all left/right | ◐ (Vim dd/o/O) | [editor/line-operations](editor/line-operations.test.ts) |
| Sort lines asc/desc, reverse lines, remove duplicate lines, trim trailing whitespace (Ctrl+K Ctrl+X) | ✗ | [editor/line-operations](editor/line-operations.test.ts) |
| Transform case: upper, lower, title, snake, kebab, camel, pascal | ◐ (Vim ~ U u specced in test/ide) | [editor/case-transforms](editor/case-transforms.test.ts) |
| In-place replace (Ctrl+Shift+, / .): true↔false, public↔private, number ±1 | ✗ | [editor/case-transforms](editor/case-transforms.test.ts) |
| Cursor and word movement: word left/right, word part (camelCase) left/right, home (first non-blank, then column 0), end, top/bottom, with select variants | ◐ (Vim motions) | [editor/cursor-movement](editor/cursor-movement.test.ts) |
| Deleting: delete left/right, word left/right, word part, auto-closing pair deletion | ◐ | [editor/cursor-movement](editor/cursor-movement.test.ts) |
| Clipboard: cut/copy whole line when nothing selected, paste a full line above, multi-cursor paste | ✗ | [editor/clipboard](editor/clipboard.test.ts) |
| Undo/redo grouping of typing, undo cursor position | ◐ (Vim specced in test/ide) | [editor/clipboard](editor/clipboard.test.ts) |
| Overtype mode (Insert key) | ✗ | [editor/overtype](editor/overtype.test.ts) |

## 2. Editor: selection

| Feature | Here | Spec |
|---|---|---|
| Expand/shrink selection (Shift+Alt+→/←): sub-word, word, string, bracket contents, brackets, line, block | ✗ | [editor/smart-select](editor/smart-select.test.ts) |
| Column (box) selection: Shift+Alt+arrows, column selection mode | ◐ (Vim Ctrl+V specced) | [editor/column-selection](editor/column-selection.test.ts) |
| Bracket commands: jump to bracket, select to bracket, remove brackets | ◐ (Vim %) | [editor/brackets](editor/brackets.test.ts) |
| Auto-surround: typing a quote or bracket with text selected wraps it | ✗ | [editor/brackets](editor/brackets.test.ts) |

## 3. Editor: find and replace (in file)

| Feature | Here | Spec |
|---|---|---|
| Find widget: match case, whole word, regex, match count "1 of 5", next/previous with wrap, highlight all | ✗ | [editor/find-widget](editor/find-widget.test.ts) |
| Seed search from selection or word under cursor, find in selection | ✗ | [editor/find-widget](editor/find-widget.test.ts) |
| Replace one/all, regex groups $1 $&, case modifiers \u \l \U \L, preserve case, multiline (\n) | ✗ | [editor/find-widget](editor/find-widget.test.ts) |
| Find/replace history | ✗ | [editor/find-widget](editor/find-widget.test.ts) |

## 4. Editor: comments, indentation, whitespace, encoding

| Feature | Here | Spec |
|---|---|---|
| Toggle line comment (Ctrl+/), add/remove line comment, block comment (Shift+Alt+A), insertSpace, ignoreEmptyLines | ✗ (Vim gc specced) | [editor/comments](editor/comments.test.ts) |
| Detect indentation (2/4/6/8 spaces or tabs), convert indentation to spaces/tabs, reindent lines | ✗ (specced simply in test/ide) | [editor/indentation](editor/indentation.test.ts) |
| Tab / Shift+Tab indent and outdent, useTabStops backspace | ✗ | [editor/indentation](editor/indentation.test.ts) |
| EOL: LF/CRLF per file, files.eol, change EOL | ✗ | [files/encoding-eol](files/encoding-eol.test.ts) |
| Encoding: detect BOM (UTF-8, UTF-16 LE/BE), reopen/save with encoding, binary detection | ✗ | [files/encoding-eol](files/encoding-eol.test.ts) |
| Save actions: trim trailing whitespace, insert final newline, trim final newlines, format on save, code actions on save, order | ✗ | [files/save-participants](files/save-participants.test.ts) |
| Auto save (afterDelay, onFocusChange, onWindowChange), hot exit backups and restore, conflict when the file changed on disk | ✗ | [files/auto-save-backup](files/auto-save-backup.test.ts) |
| File watching: coalescing events, watcherExclude, deleted-on-disk editors | ✗ | [files/watcher](files/watcher.test.ts) |

## 5. Editor: folding

| Feature | Here | Spec |
|---|---|---|
| Fold/unfold, recursively, toggle, fold all, unfold all, fold level N, fold all block comments | ✗ (Vim zc/zo specced) | [editor/folding](editor/folding.test.ts) |
| Folding ranges from indentation and from #region markers, manual folding ranges from selection, go to parent/next fold | ✗ | [editor/folding](editor/folding.test.ts) |

## 6. Editor: rendering aids

| Feature | Here | Spec |
|---|---|---|
| Bracket pair colorization (nesting levels), bracket pair guides, matching bracket highlight | ✗ | [editor/bracket-pairs](editor/bracket-pairs.test.ts) |
| Indent guides and the active guide | ✗ | [editor/indent-guides](editor/indent-guides.test.ts) |
| Render whitespace (none, boundary, selection, trailing, all) | ✗ | [editor/render-whitespace](editor/render-whitespace.test.ts) |
| Unicode highlighting: invisible characters, ambiguous characters, non-basic ASCII | ✗ | [editor/unicode-highlight](editor/unicode-highlight.test.ts) |
| Word highlight (other occurrences of the word at the cursor), next/previous highlight | ✗ | [editor/word-highlight](editor/word-highlight.test.ts) |
| Sticky scroll (outline, folding and indentation models) | ✗ | [editor/sticky-scroll](editor/sticky-scroll.test.ts) |
| Rulers, word wrap / minimap / sticky scroll / breadcrumbs toggles, font zoom | ✗ | [editor/view-options](editor/view-options.test.ts) |
| Linked editing (renaming an HTML tag renames its pair) | ✗ | [languages/language-configuration](languages/language-configuration.test.ts) |

## 7. Editor: IntelliSense, snippets, Emmet

| Feature | Here | Spec |
|---|---|---|
| Suggest list scoring (VS Code fuzzy score, camelCase), suggestSelection first/recentlyUsed/recentlyUsedByPrefix, snippetSuggestions top/bottom/inline/none, wordBasedSuggestions modes, acceptSuggestionOnEnter smart, commit characters, insert vs replace, locality bonus, tab completion | ✗ (basic list specced in test/ide) | [languages/suggest](languages/suggest.test.ts) |
| Parameter hints (active parameter) | ✗ | [languages/lsp-features](languages/lsp-features.test.ts) |
| Snippets: all variables (TM_*, CURRENT_*, RANDOM, UUID, comments), transforms with format options, conditionals, placeholder transforms, escaping, snippet files (prefix, body, scope, include/exclude, isFileTemplate), insertSnippet with args, surround with snippet | ✗ (basic syntax specced in test/ide) | [languages/snippets](languages/snippets.test.ts) |
| Emmet: HTML abbreviations (> + ^ * $ @ () [] {} # . implicit tags), CSS abbreviations, filters, wrap with abbreviation, balance, remove/update/split-join tag, increment/decrement number, evaluate math | ✗ | [languages/emmet](languages/emmet.test.ts) |
| Language configuration: autoClosingPairs notIn string/comment, autoCloseBefore, surroundingPairs, onEnterRules (JSDoc), indentationRules, wordPattern | ✗ | [languages/language-configuration](languages/language-configuration.test.ts) |

## 8. Editor: code navigation and refactoring (language servers)

| Feature | Here | Spec |
|---|---|---|
| Navigation history: go back/forward, last edit location | ✗ (Vim jump list specced) | [editor/navigation](editor/navigation.test.ts) |
| Go to definition, type definition, implementation, references (via providers), peek | ✗ | [languages/lsp-features](languages/lsp-features.test.ts) |
| Go to symbol in file (@, @:), workspace symbols (#), outline, breadcrumbs | ✗ | [workbench/quick-open](workbench/quick-open.test.ts), [explorer/outline](explorer/outline.test.ts) |
| Next/previous problem (F8) across files, next/previous change | ✗ | [editor/navigation](editor/navigation.test.ts) |
| Rename (F2) with prepareRename, workspace edits with file create/rename/delete and versions | ✗ (text edits specced in test/ide) | [languages/workspace-edit](languages/workspace-edit.test.ts) |
| Code actions: kinds hierarchy, apply first/ifSingle/never, preferred, codeActionsOnSave | ✗ | [languages/lsp-features](languages/lsp-features.test.ts) |
| Format document / selection / on type / on paste | ✗ | [languages/lsp-features](languages/lsp-features.test.ts) |
| Semantic tokens decoding, inlay hints, signature help, hover | ✗ | [languages/lsp-features](languages/lsp-features.test.ts) |
| CodeLens (resolve, same-line joining, editor.codeLens) | ✗ | [languages/code-lens](languages/code-lens.test.ts) |

## 9. Workbench

| Feature | Here | Spec |
|---|---|---|
| Editor groups: split right/down, move editor to group, focus group N, close/join groups, closeEmptyGroups | ◐ (window splits) | [workbench/editor-groups](workbench/editor-groups.test.ts) |
| Tabs: preview mode, pinned tabs, open positioning, close others/right/saved/all, reopen closed, MRU Ctrl+Tab, label disambiguation, custom labels, editor limit, dirty marker | ◐ (tabs exist) | [workbench/tabs](workbench/tabs.test.ts) |
| Quick Open: files (recent first, fuzzy, file:line:col), prefixes > @ @: : # ? % | ✗ | [workbench/quick-open](workbench/quick-open.test.ts) |
| Command palette: recently used, "Category: Title", hidden when the when-clause fails, keybinding labels | ✗ (registry specced in test/ide) | [workbench/quick-open](workbench/quick-open.test.ts) |
| Status bar: items, alignment and priority, Ln/Col, selection count, indentation, encoding, EOL, language, problems | ◐ (mode only) | [workbench/status-bar](workbench/status-bar.test.ts) |
| Notifications: severity, actions, progress, Do Not Disturb, center, dedupe | ✗ | [workbench/notifications](workbench/notifications.test.ts) |
| Layout: sidebar, panel, zen mode, centered layout, maximize panel, restore | ✗ | [workbench/layout](workbench/layout.test.ts) |
| Output panel: channels, log levels, clear, scroll lock | ◐ (console log window) | [workbench/output](workbench/output.test.ts) |
| Problems panel: grouping, sorting, filter text/glob/!exclude, severity toggles, active file only | ✗ | [workbench/problems](workbench/problems.test.ts) |

## 10. Explorer

| Feature | Here | Spec |
|---|---|---|
| New file/folder (nested paths), rename (name validation), delete, copy/cut/paste, duplicate, incremental naming, undo file operations | ✗ (basic create/rename specced in test/ide) | [explorer/file-operations](explorer/file-operations.test.ts) |
| Sort order (default, mixed, filesFirst, type, modified) and lexicographic options | ✗ | [explorer/tree-model](explorer/tree-model.test.ts) |
| Compact folders, file nesting patterns (${capture}, ${basename}...), files.exclude with when-siblings, excludeGitIgnore | ✗ | [explorer/tree-model](explorer/tree-model.test.ts) |
| Decorations: git status letters and colors, problem counts, propagating to folders | ✗ | [explorer/tree-model](explorer/tree-model.test.ts) |
| Type to filter (find in tree) | ✗ | [explorer/tree-model](explorer/tree-model.test.ts) |
| Outline view, breadcrumbs | ✗ | [explorer/outline](explorer/outline.test.ts) |
| Open Editors view: per group, dirty state, save all, close | ✗ | [explorer/open-editors](explorer/open-editors.test.ts) |
| Timeline and Local History (save entries, merge window, max entries, restore, rename, delete) | ✗ | [explorer/local-history](explorer/local-history.test.ts) |

## 11. Search (across files)

| Feature | Here | Spec |
|---|---|---|
| Glob patterns (* ? ** {} [] [!] literal brackets, case sensitivity) | ✗ | [search/glob](search/glob.test.ts) |
| Include/exclude lists, ./folder scoping, use exclude settings and ignore files (.gitignore negation, nested ignores), smart case, max results | ✗ (basic search specced in test/ide) | [search/search-view](search/search-view.test.ts) |
| Replace preview, replace per file, preserve case, multiline regex | ✗ | [search/search-view](search/search-view.test.ts) |
| Search editor (text format, context lines) | ✗ | [search/search-view](search/search-view.test.ts) |

## 12. Source control (Git, local only)

| Feature | Here | Spec |
|---|---|---|
| Status (porcelain v2), resource groups (Merge/Staged/Changes/Untracked), decorations, count badge | ◐ (git status --short list) | [source-control/status](source-control/status.test.ts) |
| Stage/unstage/discard files, stage/unstage/revert selected ranges and hunks | ✗ | [source-control/staging](source-control/staging.test.ts) |
| Commit, amend, commit all, smart commit, undo last commit, message validation (50/72), input history, sign-off | ✗ | [source-control/commit](source-control/commit.test.ts) |
| Branches: create (from), checkout, rename, delete, name validation, prefix, whitespace char, random names, sort order, detached | ✗ | [source-control/branches](source-control/branches.test.ts) |
| Stash: stash (message, untracked, staged), list, apply, pop, drop, drop all | ✗ | [source-control/stash](source-control/stash.test.ts) |
| Tags and worktrees | ✗ | [source-control/tags-worktrees](source-control/tags-worktrees.test.ts) |
| Graph: log parsing, lanes, incoming/outgoing, cherry pick, compare | ✗ | [source-control/graph](source-control/graph.test.ts) |
| Blame: porcelain parsing, templates (${subject} ${authorName} ${authorDateAgo}), uncommitted lines | ✗ | [source-control/blame](source-control/blame.test.ts) |
| Quick diff gutter (vs index), ignore trim whitespace | ✗ (basic gutter specced in test/ide) | [source-control/quick-diff](source-control/quick-diff.test.ts) |
| Merge conflicts: markers (with diff3 base), accept current/incoming/both, accept all, next/previous conflict | ✗ | [source-control/merge-conflicts](source-control/merge-conflicts.test.ts) |
| 3-way merge editor: auto-merged changes, conflicts, accept input 1/2/both, unresolved count, complete merge | ✗ | [source-control/merge-editor](source-control/merge-editor.test.ts) |
| Abort merge/rebase/cherry-pick | ✗ | [source-control/branches](source-control/branches.test.ts) |

## 13. Diff editor

| Feature | Here | Spec |
|---|---|---|
| Line and character-level diff, ignore trim whitespace, moved code detection | ✗ | [diff/diff-editor](diff/diff-editor.test.ts) |
| Collapse unchanged regions (context lines), next/previous change (F7), revert block, inline vs side-by-side | ✗ | [diff/diff-editor](diff/diff-editor.test.ts) |
| Compare active file with saved / clipboard / another file | ✗ | [diff/diff-editor](diff/diff-editor.test.ts) |

## 14. Terminal

| Feature | Here | Spec |
|---|---|---|
| Emulator: scroll regions, alternate screen, save/restore cursor, insert/delete lines and characters, erase variants, tab stops, line drawing charset, wide characters, SGR attributes, reflow on resize, scrollback limit, device status replies, OSC 8 hyperlinks, bracketed paste and app cursor modes | ✗ (basic specced in test/ide) | [terminal/emulator](terminal/emulator.test.ts) |
| Shell integration: OSC 633 A/B/C/D/E/P, OSC 133, OSC 1337, OSC 7, command records, exit code decorations, navigation, recent commands and directories | ✗ | [terminal/shell-integration](terminal/shell-integration.test.ts) |
| Links: URLs, file paths with line/column in many formats, folders, word links, word separators, wrapped links | ✗ | [terminal/links](terminal/links.test.ts) |
| Keyboard input encoding: arrows (normal/application), function keys, modifiers, Ctrl/Alt, bracketed paste, sendSequence | ✗ | [terminal/input](terminal/input.test.ts) |
| Terminal management: create/kill, groups and splits, focus next/previous, rename, tab title variables, icons, split cwd | ✗ | [terminal/terminal-manager](terminal/terminal-manager.test.ts) |
| Find in terminal, select all and copy (wrapped lines joined), run selected text, run active file, auto replies, exit alert, confirm on kill | ✗ | [terminal/terminal-manager](terminal/terminal-manager.test.ts) |
| Profiles: per-platform, default profile, env null removal, variables, overrideName, automation profile, dropped path escaping per shell | ✗ | [terminal/profiles](terminal/profiles.test.ts) |

## 15. Debugging

| Feature | Here | Spec |
|---|---|---|
| launch.json: configurations, platform overrides, presentation order/group/hidden, compounds (stopAll, folder), pre/post tasks, global launch setting | ✗ | [debug/launch-config](debug/launch-config.test.ts) |
| Variable substitution (all predefined variables, env, config, command, input, workspaceFolder:Name, two-pass) | ✗ | [debug/variables](debug/variables.test.ts) |
| Breakpoints: conditional, hit count, logpoints with {expr}, triggered, inline (column), function, data, exception filters, enable/disable, verified state | ✗ (basic store specced in test/ide) | [debug/breakpoints](debug/breakpoints.test.ts) |
| Debug session (DAP): initialize/launch/configurationDone sequence, stopped → threads/stack/scopes/variables, step/continue/pause/restart/stop, output, evaluate, setVariable, runInTerminal, state | ✗ | [debug/session](debug/session.test.ts) |
| Views: call stack (subtle frames, load more), variables (lazy, paging), watch, debug console REPL (history, multiline), inline values, hover evaluation | ✗ | [debug/views](debug/views.test.ts) |

## 16. Tasks

| Feature | Here | Spec |
|---|---|---|
| tasks.json: shell/process, args, options, groups and default build task, OS overrides, presentation defaults, runOptions, hide, user tasks | ✗ | [tasks/tasks-config](tasks/tasks-config.test.ts) |
| dependsOn (parallel / sequence), cycles, inputs | ✗ | [tasks/tasks-config](tasks/tasks-config.test.ts) |
| Command and argument quoting per shell (escape, strong, weak) | ✗ | [tasks/shell-quoting](tasks/shell-quoting.test.ts) |
| Problem matchers: regexp groups, location, fileLocation modes, severity, multi-line with loop, background begin/end, built-ins ($tsc, $tsc-watch, $eslint-compact, $eslint-stylish, $go, $jshint, $mscompile, $lessc, $node-sass) | ◐ (tsc and gcc specced in test/ide) | [tasks/problem-matchers](tasks/problem-matchers.test.ts) |
| Task detection: npm scripts (package manager from lockfile), TypeScript tsconfig build/watch | ✗ | [tasks/detection](tasks/detection.test.ts) |
| Running: echo, terminal reuse, instance limit/policy, background tasks, rerun last, terminate, revealProblems | ✗ | [tasks/runner](tasks/runner.test.ts) |

## 17. Testing

| Feature | Here | Spec |
|---|---|---|
| Test tree, status aggregation, filters (text, @failed, @executed, @doc, @tag), sort, run at cursor, rerun failed, continuous run, count badge | ✗ | [testing/test-explorer](testing/test-explorer.test.ts) |
| Coverage: lcov parsing, line/branch/function percentages, displayed percent modes, folders, uncovered navigation | ✗ | [testing/coverage](testing/coverage.test.ts) |
| Reading results: JUnit XML, TAP, Vitest/Jest JSON | ✗ | [testing/reporters](testing/reporters.test.ts) |

## 18. Settings

| Feature | Here | Spec |
|---|---|---|
| Scopes and precedence (default, user, workspace, folder, language-specific, policy), object merge, multi-language blocks, restricted settings, folder-only resource settings | ✗ (layers specced simply in test/ide) | [settings/configuration](settings/configuration.test.ts) |
| Settings editor search: words, @modified, @id:, @lang:, @tag:, @feature:, advanced hidden; reset; settings URLs | ✗ | [settings/settings-search](settings/settings-search.test.ts) |
| JSON with comments: parse errors with offsets, edits that keep comments and formatting, schema validation | ✗ | [settings/jsonc](settings/jsonc.test.ts) |

## 19. Keyboard shortcuts

| Feature | Here | Spec |
|---|---|---|
| when-clause expressions: ! && \|\| == != === !== > >= < <= =~ in, not in, parentheses, quoting, regex flags | ✗ | [keybindings/when-clause](keybindings/when-clause.test.ts) |
| keybindings.json: precedence bottom to top, removal (-command), empty command, chords, args, runCommands, key normalization, scan codes, platform labels, conflicts, editor search | ◐ (Vim key trie) | [keybindings/resolver](keybindings/resolver.test.ts) |

## 20. Workspaces

| Feature | Here | Spec |
|---|---|---|
| Multi-root: .code-workspace (relative paths, names), labels, settings per folder, ${workspaceFolder:Name}, ./folder search scoping, per-folder task labels | ✗ | [workspace/multi-root](workspace/multi-root.test.ts) |
| Workspace trust: restricted mode blocks tasks/debug/terminal, trusted parent folders | ✗ | [workspace/trust](workspace/trust.test.ts) |
| Recently opened files/folders/workspaces | ✗ (recent files specced in test/ide) | [workspace/multi-root](workspace/multi-root.test.ts) |

## 21. Languages

| Feature | Here | Spec |
|---|---|---|
| Markdown: header slugs, outline, folding, link validation (files, fragments, references), path completions, update links on move, preview HTML with line mapping, paste URL as link | ✗ | [languages/markdown](languages/markdown.test.ts) |
| JSON: schema association (fileMatch, $schema) and validation | ✗ | [languages/json](languages/json.test.ts) |

## 22. Command line

| Feature | Here | Spec |
|---|---|---|
| `code` arguments: files, folders, -g file:line:col, -d, -m, -n, -r, -w, -a, --remove, -, --locale, --profile; vscode:// URLs | ✗ | [cli/args](cli/args.test.ts) |

---

## Edge case files

| Area | Edge cases |
|---|---|
| Multiple cursors | [editor/multi-cursor.edge](editor/multi-cursor.edge.test.ts) |
| Line operations | [editor/line-operations.edge](editor/line-operations.edge.test.ts) |
| Transforms | [editor/case-transforms.edge](editor/case-transforms.edge.test.ts) |
| Cursor movement | [editor/cursor-movement.edge](editor/cursor-movement.edge.test.ts) |
| Clipboard and undo | [editor/clipboard.edge](editor/clipboard.edge.test.ts) |
| Find widget | [editor/find-widget.edge](editor/find-widget.edge.test.ts) |
| Smart select, column selection, brackets, comments, indentation | [editor/editing-aids.edge](editor/editing-aids.edge.test.ts) |
| Folding | [editor/folding.edge](editor/folding.edge.test.ts) |
| Bracket pairs, guides, whitespace, unicode, word highlight, sticky scroll | [editor/decorations.edge](editor/decorations.edge.test.ts) |
| Navigation | [editor/navigation.edge](editor/navigation.edge.test.ts) |
| Encodings, save actions, file events | [files/files.edge](files/files.edge.test.ts) |
| Suggest, snippets, Emmet, Markdown, language servers, typing | [languages/languages.edge](languages/languages.edge.test.ts) |
| Tabs, groups, status bar, notifications, output, problems | [workbench/workbench.edge](workbench/workbench.edge.test.ts) |
| Quick Open and command palette | [workbench/quick-open.edge](workbench/quick-open.edge.test.ts) |
| Explorer | [explorer/explorer.edge](explorer/explorer.edge.test.ts) |
| Search and globs | [search/search.edge](search/search.edge.test.ts) |
| Source control | [source-control/source-control.edge](source-control/source-control.edge.test.ts) |
| Diff editor | [diff/diff-editor.edge](diff/diff-editor.edge.test.ts) |
| Terminal | [terminal/terminal.edge](terminal/terminal.edge.test.ts) |
| Debugging | [debug/debug.edge](debug/debug.edge.test.ts) |
| Tasks | [tasks/tasks.edge](tasks/tasks.edge.test.ts) |
| Testing | [testing/testing.edge](testing/testing.edge.test.ts) |
| Settings and keybindings | [settings/settings.edge](settings/settings.edge.test.ts) |
| Workspaces, trust, command line | [workspace/workspace.edge](workspace/workspace.edge.test.ts) |

## Where the code would go

The specs propose these modules (each spec's header has the details):

- **Editor commands** register in `ctx.commands` under their VS Code IDs.
  They need `codeWindow.selections()` / `setSelections()`,
  `ctx.configuration` and `ctx.clipboard`.
- `src/Editor/`: `folding.ts`, `indentation.ts`, `decorations/*`
  (bracket pairs, indent guides, whitespace, unicode, word highlight,
  sticky scroll)
- `src/Files/`: `encoding.ts`, `backup.ts`, `watcher.ts`
- `src/Language/`: `suggest.ts`, `snippets.ts` (extended), `emmet.ts`,
  `markdown.ts`, `json.ts`
- `src/Lsp/`: `codeActions.ts`, `semanticTokens.ts`, `inlayHints.ts`,
  `signatureHelp.ts`, `workspaceEdit.ts`, plus providers on `ctx.languages`
- `src/Workbench/`: `statusBar.ts`, `notifications.ts`, `output.ts`,
  `problems.ts`, `editorLabels.ts`, plus `ctx.editorGroups`, `ctx.editors`,
  `ctx.quickOpen`, `ctx.layout`
- `src/Explorer/`: `fileOperations.ts`, `treeModel.ts`, `outline.ts`
- `src/Search/`: `glob.ts`, `projectSearch.ts` (extended)
- `src/Scm/`: `repository.ts`, `status.ts`, `stageRanges.ts`,
  `commitMessage.ts`, `branchNames.ts`, `stash.ts`, `worktrees.ts`,
  `log.ts`, `blame.ts`, `quickDiff.ts`, `mergeConflicts.ts`,
  `mergeEditor.ts`. The `src/Tools/git.ts` from `test/ide` can become part
  of this.
- `src/Diff/diff.ts`
- `src/Terminal/`: `VirtualTerminal.ts` (extended), `shellIntegration.ts`,
  `links.ts`, `input.ts`, `terminalManager.ts`, `profiles.ts`
- `src/Debug/`: `launchConfig.ts`, `breakpoints.ts` (extended),
  `breakpointConditions.ts`, `session.ts`, `views.ts`
- `src/Tasks/`: `tasksConfig.ts`, `shellQuoting.ts`, `problemMatcher.ts`,
  `detect.ts`, `taskRunner.ts`. The simple `parseProblems` in
  `src/Tools/problemMatcher.ts` from `test/ide` can wrap the full matcher.
- `src/Testing/`: `testModel.ts`, `coverage.ts`, `reporters.ts`
- `src/Settings/`: `configuration.ts`, `settingsSearch.ts`, `jsonc.ts`
- `src/Keybindings/`: `whenClause.ts`, `resolver.ts`
- `src/Workspace/`: `variables.ts`, `workspace.ts`, `trust.ts`,
  `localHistory.ts`
- `src/Cli/args.ts`

## Choices made in the specs

These are decisions where VS Code gave no single answer. Change them if you
prefer otherwise.

- Markdown slugs follow VS Code's slugifier: it keeps emoji, which GitHub's
  drops.
- Emmet output leaves out tab stops and indents with tabs.
- A logpoint whose expression fails shows the error text in its place.
- An empty coverage file counts as 100%.
- Local history skips a save identical to the last entry.
- The debug dropdown lists entries without a presentation group last.
- A JSONC edit writes the new value on one line.
