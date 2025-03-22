# Timeless Calendar Development Guide

## Project Overview
Timeless is a web-based infinitely scrolling calendar built with vanilla JavaScript, HTML, and CSS.

## Commands
- No formal build process or package manager
- Open `index.html` in a browser to run the application
- No automated testing infrastructure in place

## Code Style Guidelines
- **JavaScript**:
  - Use camelCase for variables and functions
  - Include JSDoc-style comments for functions
  - Use ES6 syntax (const/let, arrow functions)
  - Throttle/debounce scroll handlers and other performance-critical functions
  - Use meaningful variable names that describe purpose

- **CSS**:
  - Mobile-specific styles go in `mobile.css`
  - General styles go in `styles.css`
  - Use class selectors for styling
  - Follow existing naming conventions

- **HTML**:
  - Use semantic HTML elements
  - Include aria-labels for accessibility
  - Use SVG for icons

## Error Handling
- Use try/catch blocks for operations that might fail
- Display errors to users via toast notifications