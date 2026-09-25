# Manuelle Zeiterfassung anpassen

## Umsetzung
- Im Dialog „Manueller Eintrag“ werden **Start**, **Stopp** und **Stunden** gleichzeitig angezeigt.
- Das Stundenfeld wird in getrennte Zahlenfelder für Stunden und Minuten aufgeteilt; der Doppelpunkt bleibt dauerhaft sichtbar.
- Beim Speichern gilt: Eine eingegebene Dauer wird als HH:MM übernommen. Alternativ wird die Dauer aus Start und Stopp berechnet.
- Unvollständige oder ungültige Eingaben werden mit einer klaren deutschen Meldung abgewiesen.

## Technische Details
- Start und Stopp bleiben bei einer reinen Stundenangabe leer.
- Sind Start und Stopp ausgefüllt, werden beide Zeiten gespeichert; eine zusätzlich eingegebene HH:MM-Dauer hat Vorrang für die Gesamtsumme.
- Abschließend werden Darstellung, Zahleneingabe und Speichern in der Vorschau geprüft.
