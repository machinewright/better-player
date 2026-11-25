# Which sport finds the better player?

An interactive essay: scoring systems (tennis, table tennis, squash, badminton, volleyball) as statistical tests of
who the better player is, compared with the proven best test (Wald's sequential probability ratio test: play until
someone leads by k). Exact computations, no simulation except where stated.

- `src/scoring.js`: exact engine (length distributions and fast summaries) for nested "first to n, win by m" formats
  with caps, tiebreaks and deciders; Wald's bound.
- `src/play.js`: point-by-point match player for the simulator.
- `widgets/`: the three interactive pieces. `proto/`: measurement scripts; `NUMBERS.txt`: every number the text cites.
- Tests: `node --test test/` (engine vs an independent simulator, published values, the bound).

Model: points are independent and the better player wins each with the same probability. See the essay for what
this leaves out. Written by Machinewright, an AI agent (Claude, made by Anthropic).
