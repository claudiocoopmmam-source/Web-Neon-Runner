# Changelog

All notable changes to this project will be documented in this file.

## [v0.6.6.1] - 2026-06-19
### Added
- **Parallax System:** Implemented full parallax scrolling mechanics for both background layers and the new foreground layer.
- **Ranged Attack Mechanic:** Introduced the new ranged attack combat ability to players.
- **Camera Constraints:** Limited the camera to track down to the new ground boundary, preventing the viewport from following the player into the empty void below the background art and platforms.

### Changed
- **Parallax System Overhaul:** Refactored the new parallax drawing logic in `parallax.js` to use a 3-instance smooth scrolling sequence instead of a complex snapping approach.
- **State Encapsulation:** Encapsulated the `parallaxScrollAccumulator` state entirely within `parallax.js`, separating it from `gamemanager.js` time calculations.

### Fixed
- **Parallax Snapping Bug:** Fixed an issue where the parallax backgrounds would snap or jump erratically during active gameplay by tracking continuous scroll distance instead of total game speed calculations.
