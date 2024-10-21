# workflow-coordinator Changelog

## 1.0.1 - 2024-10-21

### Fixed
- removed duplicate error response from /status/:statusCredentialId that was crashing service

## 1.0.0 - 2024-10-11

### Changed
- **BREAKING**: Convert Status List 2021 to Bitstring Status List. NOTE: If you used older versions of the workflow coordinator with a Status List 2021 service (like the DCC status-service based on git), then you'll need to setup a new status list for this version. Your old credentials will continue to validate with the old status list (provided you keep the public list available).
- Differentiate between database status service and Git status service.
- Rename environment variables.
- Update revocation and suspension instructions.
- fix revocation call to status service

see github for prior history