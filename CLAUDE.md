# Point Collectors — Trivia Night Jeopardy Game

## Project Overview

A single-file HTML/CSS/JS Jeopardy-style trivia game built for a specific friend group. All logic, styles, and question data live in one `jeopardy.html` file. No frameworks, no build step, no backend.

---

## Current State

A working `jeopardy.html` exists with the following features:

- **Player setup screen** — enter player names before the game starts (starts with 4 empty rows, Enter adds a new one, ✕ removes)
- **Scoreboard** — persistent strip above the board showing each player's score; the leader gets a gold border highlight
- **Jeopardy board** — 8 categories as columns, questions as rows with dollar values ($100 increments per row)
- **Question modal** — click a cell to open; shows category, point value, and question; answer hidden until revealed
- **Answer reveal** — shows the answer (or "No answer recorded — group decides!" for null answers); player award buttons appear
- **Point assignment** — after reveal, click a player button to award them points; toggle off to deselect; "Done" awards + marks complete, "No Points" just marks complete
- **Completed cells** — marked with ✓, grayed out, unclickable

### Tech Stack
- Vanilla HTML/CSS/JS, single file
- Google Fonts: `Bebas Neue` (display), `Barlow Condensed` (body)
- Color palette: deep navy (`#0a1628`), gold (`#f5c842`), no external dependencies

---

## Question Data Format

Questions are a JS array of objects at the top of the `<script>` block:

```js
{
  category: "String",       // Groups questions into board columns
  question: "String",       // Displayed in the modal
  answer: "String" | null,  // null = "group decides" fallback
  points: 1                 // Currently unused in rendering (row position determines value)
}
```

### Categories (in order)
1. College
2. Gaming
3. Spice of Life
4. Food
5. Achievements
6. Sports
7. History

---

## Mechanics To Implement

### 1. Daily Double

**How many:** `Math.floor(categories.length / 2)` cells are randomly designated Daily Doubles each game. Locations are re-randomized on every fresh game start.

**Constraints:**
- No two Daily Doubles in the same category
- Placement is random within those constraints

**Flow:**
1. Player clicks a cell — instead of seeing the question, they see a "DAILY DOUBLE!" reveal screen
2. Player enters a wager between **1 and their current score** (inclusive). If their score is 0, the minimum wager is 1 (or the cell's base value — TBD, but 1 is fine for now).
3. After confirming wager, the question is revealed normally
4. GM uses the existing "Done" / "No Points" buttons — but points awarded/deducted should be the **wager amount**, not the cell's base value
5. If correct: player gains wager amount. If no one is awarded: player loses wager amount (wrong answer penalty is implicit in not awarding)

> **Open question not yet resolved:** Does a wrong answer actively deduct the wager, or does it just result in no points? Clarify with user before implementing.

---

### 2. Personal Double Down

Each player gets **one Double Down token** per game, shown as a button/indicator on the scoreboard or near their score chip.

**Flow:**
1. A question is answered and the GM is about to award points to Player A
2. Before confirming, any other player with their Double Down still available can activate it
3. This triggers a **follow-up question** specific to that original question (see data format below)
4. Player A must answer the follow-up
5. GM determines correct/incorrect — award or steal accordingly

> **Open questions not yet resolved — clarify with user before implementing:**
> - If Player A answers the follow-up correctly, do they keep the original points? Or do the points still transfer?
> - If Player A gets the follow-up wrong, does the Double Down activator automatically get the points, or does the GM still decide?
> - Can multiple players try to activate Double Down simultaneously? First one wins?
> - Does the Double Down activator risk anything (their own points), or is it pure upside?
> - Can Double Down be activated before or after the answer is revealed?

**Data format for Double Down follow-up questions:**

Add an optional `doubleDown` field to any question object:

```js
{
  category: "Gaming",
  question: "Who is the enemy in Jedi Fallen Order?",
  answer: "Sith — Trilla, Second Sister",
  points: 1,
  doubleDown: {
    question: "What is the name of the Inquisitor title held by Trilla Suduri?",
    answer: "The Second Sister"
  }
}
```

A Double Down can only be used on questions that have a `doubleDown` field. If no follow-up exists, the option should not be available (or be greyed out).

**Sample implementation question:** The Gaming question "Who is the enemy in Jedi Fallen Order?" already has a `doubleDown` entry in the data as a reference example.

**UI:** Each player's score chip should display a visual indicator of whether their Double Down token is available (e.g. a small colored badge or icon). Once used, it becomes greyed out/spent for the rest of the game.

---

## Key Design Decisions Already Made

- Points are awarded by a human GM (the person running the game), not auto-detected
- "No answer recorded" questions are decided by group consensus; the GM still awards or doesn't
- The board does not auto-advance; everything is GM-driven button clicks
- Completed questions are marked done regardless of whether points were awarded
- The scoreboard highlights the current leader with a gold border

---

## Unresolved / Future Considerations

- The original quiz PDF references a `x2` multiplier and `SS` (Sudden Death?) category modifier — not yet implemented
- The PDF also references a hidden "Lowest Score Wins" objective — could be a future secret mechanic
- No sound effects yet — could add buzzer/Daily Double fanfare
- No timer per question — purely GM-paced
- Mobile layout works but is not optimized; the board requires horizontal scroll on small screens

---

## File Location

Everything is in a single file: `jeopardy.html`