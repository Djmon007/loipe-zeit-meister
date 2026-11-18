# Project architecture
- Keep worker data entry and administrator reporting in separate pages and protected routes; this lets each view follow its own access rules and workflow.
- Treat vehicle-hour entries as cumulative readings for the shared machine and derive the current reading from the latest dated entry so worker and admin views agree.
- Resolve admin receipt references through the shared private-storage viewer, never as relative page links; uploaded file paths need signed access URLs, not application routing.