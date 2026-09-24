# Loipen & Zeiten

I need a small, Android-only Arbeitszeit-App in German that lets a maximum of ten team members record the hours they spend on each project and, on a dedicated screen, tick off the exact Loipen they have präpariert.

Core flow
• Start: simple, clean login via E-Mail und Passwort.
• Seite 1: Zeiterfassung. Each user picks a project, starts/stops a timer or enters hours manually, and sees the personal weekly & monthly total.
• Seite 2: Routen-Protokoll. After logging hours, the user selects any prepared routes from the fixed list below; the selection is stored with date and user name.
– Loipe Säätliboden (Rüti GL)
– Nidfurn – Leuggelbach
– Rundkurs Leuggelbach
– Schwanden - Nidfurn – Schwanden
– Luchsingen - Hätzingen (Skistübli)
– Hätzingen – Linthal
• Seite 3: Spesen. A quick camera/upload field to attach receipts (PDF / JPEG). Each receipt stays linked to the recorded shift for later export.

Auswertungen
From the admin view I export weekly and monthly Zusammenfassungen for all workers—CSV and on-screen summary are enough. Workers only see their own data; I see everyone’s.

Tech preferences
Feel free to use Kotlin + Room/Firebase or another lightweight stack as long as all data stays secure and can be backed up. The UI must remain deutschsprachig, schlicht und übersichtlich, working smoothly on current Android versions.

Deliverables
1. Signed APK & source code.
2. Brief setup/readme so I can rebuild or hand it to a future dev.

Once these items are verified and summaries match sample data, the project is complete.
Also the project has changed. here is more infomration in excel sheet

save the data on a admin panel on a server and a have an app to enter the data for the user

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://loipe-zeit-meister.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3c8f4164-8fe6-421a-88ae-82169f1478d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
