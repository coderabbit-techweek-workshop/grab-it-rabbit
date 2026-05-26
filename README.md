# Carrot Bug Bash

A small browser arcade game where an orange bunny defends the garden by launching carrots at a bouncing bug. Built with plain HTML, CSS, and JavaScript — no build tools, no frameworks, no dependencies.

## Setup

Open `index.html` in your browser. No install required.

## Controls

- **Left Arrow** or **A** — move the bunny left
- **Right Arrow** or **D** — move the bunny right
- **Space** — shoot a carrot
- **R** — restart the game
- **Restart** button — restart the game from the page

## Current Game Behavior

- The bunny sits at the bottom of the canvas and moves horizontally within the play area. It cannot move outside the canvas.
- The bunny can launch one carrot at a time. The carrot travels straight up and disappears when it leaves the screen.
- A single large bug bounces around the canvas, reflecting off each wall.
- When a carrot hits the bug:
  - The score increases by one.
  - The carrot disappears.
  - Active gameplay pauses and the status reads **"Bug hit! Press R to restart."**
  - The bug remains on the canvas; the game is not marked as won.
- If the bug collides with the bunny, the status reads **"Game over"** and active gameplay stops.
- Pressing **R** or clicking **Restart** fully resets the bunny, carrot, bug, score, and status.

## About This Project

This project is the starter app for a **CodeRabbit workshop**. It is intentionally small and approachable so that participants can focus on the pull-request review experience.
