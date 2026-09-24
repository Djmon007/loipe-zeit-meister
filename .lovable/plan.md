# Änderungen aus „Modifications V5“

## Umsetzung
- **Manuelle Arbeitszeit:** Im Nutzerbereich wird „Start/Stopp“ durch ein einziges Pflichtfeld **Stunden (HH:MM)** ersetzt. Manuelle Einträge speichern nur Datum, Projekt und Gesamtdauer; Start und Stopp bleiben leer.
- **Saisons verwalten:** Im Adminbereich entsteht eine Saisonverwaltung. Sie zeigt nur Saisons ab **2025–26**, erlaubt das Anlegen der nächsten Saison und das Löschen nicht mehr benötigter Saisons. Die Auswahl wird in allen Admin-Auswertungen verwendet.
- **Arbeitszeiten bearbeiten:** Jede Zeile der Admin-Arbeitszeit erhält einen Stift. Admins können Datum, Projekt und entweder Start/Stopp oder die Dauer eines manuellen Eintrags ändern.

## Technische Details
- Eine gemeinsame Saisonliste wird in der Datenbank gespeichert und mit abgesicherten Admin-Rechten verwaltet.
- Die bestehende Arbeitszeittabelle bleibt erhalten; ein manueller HH:MM-Wert wird als Dezimalstunden gespeichert, damit Summen und CSV-Exporte unverändert funktionieren.
- Die Admin-Berechtigung zum Ändern von Arbeitszeiten wird serverseitig ergänzt.
- Abschließend werden die Anmeldung, manuelle Eingabe, Saisonfilter und Admin-Bearbeitung in der laufenden Vorschau geprüft.
