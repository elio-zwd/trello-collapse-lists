# Collapsible Trello Lists — current Chrome

A small Manifest V3 Chrome extension that adds collapsible lists to Trello boards.

This branch targets the current Chrome extension platform and the current Trello web UI. It intentionally does not maintain Firefox, Manifest V2, or old-Trello compatibility code.

## What changed from the old extension

- Uses Manifest V3 only.
- Uses a static Chrome `content_scripts` entry instead of `tabs` + `scripting` + a background service worker.
- Keeps only the `storage` permission.
- Handles Trello's SPA navigation and React DOM replacement with a `MutationObserver`.
- Uses current Trello `data-testid` hooks (`list`, `list-wrapper`, `list-header`, `list-name`) instead of fixed `parentNode.parentNode.parentNode` traversal.
- Stores collapsed state in `chrome.storage.local`.
- Keeps the old storage-key format (`board:list-name`) so previously stored collapse state can still be recognized when the board/list names match.
- Shows the list name and current card count while collapsed.

## Install in Chrome

1. Download or clone this repository and check out the `chrome-current-2026` branch.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository root — the folder that contains `manifest.json`.
6. Open or refresh a Trello board.

## Active files

The extension loaded from the repository root uses only:

- `manifest.json`
- `content.js`
- `styles.css`
- `manifest_v3/icon.png` (icon asset only)

The historical `manifest_v2/` and `manifest_v3/` folders are retained only as upstream reference snapshots. Do not load those folders for this version.

## Behavior

- Click the small chevron at the left of a Trello list header to collapse it.
- Click the collapsed vertical strip to expand it.
- Collapse state is remembered locally by Chrome per board + list name.
- List additions, renames, board navigation, and Trello React re-renders are detected without reloading the extension.

## Scope / known limitations

- Chrome only.
- Trello web only (`https://trello.com/`).
- If two lists on the same board have exactly the same name, they share the same saved collapse key. This preserves compatibility with the original extension's storage model.
- Trello is a private web application and may change its DOM. The extension deliberately relies on `data-testid` attributes rather than generated CSS class names to reduce breakage.

## Legacy source

This repository originated from the older Collapsible Trello Lists extension. The old MV2/MV3 snapshots are kept for comparison, but the root implementation is the maintained Chrome version.
