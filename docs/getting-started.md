# Getting Started

1. **Explore:** Look at `DATA_SOURCES.md` and `docs/data-dictionary.md`.
2. **Find an issue:** Check the `tasks/issues.md` or the Issues tab.
3. **Build:** You can use any technology stack. For example, you could write a Python script for data analysis, build a React frontend, or create a Node.js API.

## Institution comparison

Open `http://localhost:8000/` to try the interactive institution comparison page. From the repository root, start a local server with `python -m http.server 8000` (or `py -m http.server 8000` on Windows). The page reads `data/education/institutions.csv` and `data/cities/cities.csv` directly; opening `index.html` as a local file does not allow the browser to fetch the CSVs.
