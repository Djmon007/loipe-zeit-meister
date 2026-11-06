# Änderungen aus Modifications V6

## Umfang
- Ergänze eine Profilseite, auf der Mitarbeitende Vor- und Nachname ändern sowie ein neues Passwort mit Bestätigung setzen können.
- Vervollständige den Passwort-Reset-/Einladungsablauf, damit Links eine Passwortwahl ermöglichen und anschließend ins Profil bzw. zur Anmeldung führen.
- Stelle sicher, dass Namensänderungen aus dem Admin-Mitarbeiterdialog dauerhaft gespeichert und in der Übersicht angezeigt werden.
- Ergänze die Arbeiter-App um eine Fahrzeugstunden-Seite für datierte Zählerstände und den jeweils aktuellen Stand.
- Ergänze im Adminbereich eine Fahrzeugstunden-Übersicht mit Filterung nach Mitarbeiter, Woche, Monat und Saison sowie CSV-Export.

## Technische Details
- Fahrzeugstunden werden als kumulativer Maschinen-Zählerstand pro Eintrag gespeichert; der aktuelle Stand ergibt sich aus dem neuesten Eintrag.
- Neue Einträge sind dem angemeldeten Nutzer zugeordnet; Mitarbeitende sehen und erfassen eigene Werte, Admins können alle Einträge auswerten.
- Neue Datenbanktabelle erhält explizite Berechtigungen und Row-Level Security im selben Schema-Update.
- Neue Seite wird in Navigation und geschützte Routen eingebunden; Eingaben und Export werden in der Vorschau geprüft.