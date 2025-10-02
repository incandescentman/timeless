# Changelog

All notable changes to Timeless calendar are documented in this file.

## [Unreleased]

### Added - 2025-10-02
- Integrated experimental-mode package for UI variant testing
- Added ExperimentalModeWrapper component for testing design variants
- Configured to use published `@jaydixit/experimental-mode@^1.0.0` from npm

### Fixed - 2025-10-02
- Fixed import path for `parseInstructionString` from `@jaydixit/experimental-mode` (not `/components`)
- Removed duplicate keyboard handler for Option-X (package handles it automatically)
- Fixed CSS specificity issues with global button styles overriding experimental-mode navigation
- Increased z-index to 9999 for variant switcher visibility

### Notes
- Experimental mode only activates with `?experimental=true` URL parameter
- Should be removed before final production deployment
