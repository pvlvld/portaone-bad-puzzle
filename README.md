# PortaOne Puzzle Solver

This repository contains my solution to the PortaOne "Become a Developer" program test task. The original assignment is in [TASK.md](TASK.md).

## Overview

- Finds the longest single-line numeric puzzle chain where adjacent fragments match on their first/last two digits.
- Implements recursive depth-first search (DFS) over a directed adjacency list.
- Uses a compact `BitSet` to track visited nodes, improving data locality so more fits in CPU cache and cutting runtime from about **9.5s** to **2.5s** on my runs.
- [Multithreaded version](workers.ts) using Node Workers.

## Running

1. Ensure Node.js v25+ is available.
2. Run that piece of greatest software ever written:
    ```sh
    time node index.ts data.txt
    ```
    Multithreaded version:
    ```sh
    time node workers.ts data.txt
    ```
3. The solver prints the concatenated maximum chain and the elapsed time (excluding file read).

## How it works

- Builds a graph where an edge `a -> b` exists when the last two digits of `a` equal the first two digits of `b`.
- DFS explores all possible paths while the `BitSet` makes visited set go brrr.
- The best path is turned into the final number by overlapping the shared digits (as per example in the [task](TASK.md)).

## Benchmark

| Solution                                                                  | Runtime            | Language   |
| ------------------------------------------------------------------------- | ------------------ | ---------- |
| [My multithreaded](workers.ts)                                            | ~600ms             | JavaScript |
| [My single threaded](index.ts)                                            | ~2200ms            | JavaScript |
| [@demkom58 solution](https://github.com/demkom58/portaone-test-task/)     | ~5000ms            | Java       |
| [@Alina978 solution](https://github.com/Alina9782/Digital-puzzle-solver)  | ~11500ms           | JavaScript |
| [@bohdanbohiv solution](https://github.com/bohdanbohiv/portaone_bad_2025) | ~1410000ms (23.5m) | Python     |

**Setup:**

- **Kernel:** Linux 6.18.7-2-cachyos
- **CPU:** Ryzen 5 5600g @ 4.4GHz all cores
- **RAM:** DDR4 4400MHz
- **Node:** v25.4.0
- **Python:** v3.14.2
- **Java:** openjdk 21.0.10 2026-01-20
