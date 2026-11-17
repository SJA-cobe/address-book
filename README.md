# Contacts — Address Book

A software engineering course project with an English interface. It supports contact management, favorites, multiple contact methods, search, groups, and Excel import and export. Contacts are stored in the current browser, with demo data kept separate from personal data.

| Name | Student ID | Contribution |
|---|---|---:|
| Sun Jun | 832402118 | 50% |
| Zeng Jingkang | 832402101 | 50% |

## Project Links

- [GitHub Repository](https://github.com/SJA-cobe/address-book)
- [Coding Standards](https://github.com/SJA-cobe/address-book/blob/main/CODE/_STANDARDS.md)
- [GitHub Pages Demo](https://sja-cobe.github.io/address-book/)
- [Cloud Server Deployment](http://60.205.104.32)

## Getting Started

Download or clone the repository, then run the following command from the repository root:

```powershell
python -m http.server 5173
```

Open `http://localhost:5173` in your browser. You can also open the root `index.html` file directly. Fonts and the Excel library are included in the repository. No npm dependencies or backend configuration are required.

To publish with GitHub Pages, open **Settings → Pages**, select **Deploy from a branch**, choose the `main` branch and `/(root)` directory, then save. Use the website address shown after deployment completes.

## Features

- Create, edit, and delete contacts, with an option to undo deletion.
- Mark contacts as favorites and combine keyword, group, and favorite filters.
- Store multiple phone numbers, email addresses, and custom contact methods for each person.
- Export `.xlsx` files and preview imports before confirmation, skipping exact duplicates and reporting invalid rows.
- Switch between list and card views, with layouts for desktop and mobile devices.

Excel exports use one row per contact. The hidden `Contact methods JSON` column preserves the complete structure of multiple contact methods. Before editing visible contact-method columns in spreadsheet software, clear the hidden cell in the corresponding row.

## Project Files

| Path | Purpose |
|---|---|
| `index.html`, `style.css` | Page structure and styles |
| `core.js`, `app.js` | Data processing, interactions, and local storage |
| `vendor/`, `fonts/`, `icon.svg` | Runtime resources and third-party licenses |
| [Design Documentation](docs/设计说明.md) | Requirements, architecture, data structures, and implementation |
| [Acceptance Report](docs/验收报告.md), `TEST/` | Test results, coverage, and test code |
| [Coding Standards](CODE/_STANDARDS.md) | Coding conventions |
| `images/` | Application screenshots |
| `examples/` | An Excel import template and fictional sample data |

## Testing

Install Node.js 18 or later, then run the following commands from the repository root:

```powershell
node --test TEST/core.test.cjs
node --check core.js
node --check app.js
```

After starting the local HTTP server, open `http://localhost:5173/TEST/browser-tests.html` to run the browser acceptance tests.

These tests temporarily modify storage for the same site. Run them in a separate browser profile and avoid editing real contacts during testing.

The recorded results show that all 13 core tests and 19 browser acceptance checks passed. See the acceptance report for test methods and limitations.

## Data Storage

Clearing browser site data removes the address book. Contacts do not automatically synchronize between browsers, devices, or website addresses.

Export Excel backups regularly. All sample contacts are fictional.
