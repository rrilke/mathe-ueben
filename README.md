# Mathe Üben – Rechnen Lernen

A browser-based educational program designed to help children practice basic math calculations, with visual helpers that model *what each operation does*.

## Overview

This interactive web application helps children practice:
- **Plus** (addition)
- **Minus** (subtraction)
- **Gemischt** (mixed plus & minus)
- **Malnehmen** (multiplication / times tables)

### Features
- **Profiles** – pick who's practising (Alja, Juri, Mama, Papa, Gast); scores are tracked per profile
- **Four operations** – plus, minus, mixed, and multiplication
- **Difficulty ranges** – 0–5 (easy), 0–10 (medium), 0–20 (hard); multiplication stays within the times tables
- **Adjustable quiz length** – 5, 10, or 20 questions
- **Visual helper symbols** (Hilfssymbole) that model the operation, not just the numbers:
  - **Plus** – a number line that hops *forward* from the first number to the sum
  - **Minus** – a number line that hops *back* (count-back model) to the answer
  - **Malnehmen** – repeated addition (e.g. `4 + 4 + 4 = 12`) with grouped icons
  - Helpers hide automatically when there would be too many icons to count
- **Sound effects** – happy chime for correct, buzz for wrong, fanfare at the finish (toggleable)
- **Streak counter** and end-of-quiz **badges** (Perfekt 🌟, Serie 🔥, Blitzschnell ⚡)
- **Timer** and a per-profile **leaderboard** (Bestenliste) saved in the browser
- **On-screen number pad** for tablets and touch devices
- Real-time score tracking and immediate feedback

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Running the Program

1. Open `index.html` in your web browser by:
   - Double-clicking the file, or
   - Right-clicking and selecting "Open with" → your browser, or
   - Dragging the file into your browser window

2. Choose a profile
3. Choose an operation, number range, and how many questions
4. Click **Los geht's!**
5. Answer the questions and view your results & leaderboard

## Project Structure

```
mathe/
├── .github/
│   └── copilot-instructions.md    # Workspace-specific instructions
├── index.html                      # Main HTML page (structure only)
├── style.css                       # Styling and layout
├── script.js                       # Quiz logic, visuals, sound, scoring
├── main.py                         # Legacy Python entry point (not used)
├── requirements.txt                # Python dependencies (not used)
└── README.md                       # This file
```

## How It Works

1. **Settings page** – pick profile, operation, range, and question count
2. **Quiz page** – answer the questions, helped by the visual number line / groups
3. **Results page** – final score, badges, time, and the per-profile leaderboard

### Customising

Most behaviour is data-driven from the `CONFIG` object at the top of `script.js`:
adding a child is one line in `CONFIG.profiles`, and operations, ranges, and
question-count choices are defined there too — the buttons build themselves.

Scores are stored in the browser's `localStorage` under the key `mathResults`
(a versioned `{ version, results }` object).

## Future Development

Potential features to add:
- Division
- Practising a specific times table (e.g. only the 7s)
- Per-profile progress charts over time

## License

Educational use – customize as needed for personal study purposes.
