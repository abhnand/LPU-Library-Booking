# LPU Library Seat Booking

A beginner-friendly, full-stack hackathon prototype for an LPU campus hub. It shows a live seat map for six floors (150 seats on each floor), lets a student book an empty seat, shows book availability, and includes a campus-wide Lost & Found system.

## Run it in VS Code

1. Install [Node.js LTS](https://nodejs.org/) if `node --version` does not work in your VS Code terminal.
2. In VS Code, choose **File → Open Folder** and select this `LPU-Library-Booking` folder.
3. Open the terminal with **Terminal → New Terminal**.
4. Run `node server.js`.
5. Open `http://localhost:3000` in your browser.
6. To stop the app, click in the terminal and press `Ctrl + C`.

No `npm install` is required for this first version.

## What you can demonstrate

- Select any of six floors and view the 150 seats on it.
- Click a green seat and reserve it with a name and end time.
- Watch the availability numbers update immediately.
- Search the book catalogue and see available copies and the next expected return date.
- Click **Borrow demo** to simulate a book being borrowed.
- Report a lost or found item from anywhere on campus.
- Attach an optional item photo (PNG, JPG, or WebP up to 600 KB) and choose whether to share the reporter's name and contact details publicly.
- Filter campus reports by type/category, and submit a claim request with proof of ownership. A claim stays **pending** until Campus Support verifies it.

The initial occupied seats and books are **demo data**. After you make a booking, data is saved in `data/library-data.json` automatically. This file is intentionally ignored by Git, so every team member can keep their own local demo data.

## Project structure

```
LPU-Library-Booking/
├── public/
│   ├── index.html     # Page structure
│   ├── styles.css     # Design and mobile layout
│   └── app.js         # Buttons, rendering, frontend API calls
├── data/              # Auto-created local data (not committed)
├── server.js          # Backend/API + local data storage
└── README.md
```

## GitHub workflow for beginners

In the VS Code terminal, from this folder:

```powershell
git init
git add .
git commit -m "Build LPU Library seat booking prototype"
```

Then make an empty repository on GitHub. GitHub will show commands similar to these; replace the URL with your repository URL:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/lpu-library-booking.git
git push -u origin main
```

For each later change: `git add .`, `git commit -m "Describe what changed"`, then `git push`.

## Upgrade ideas for your presentation

1. LPU student login / email verification so a seat can only be booked by its owner.
2. Automatic cancellation if a student does not check in within 15 minutes.
3. QR code at each seat for check-in and check-out.
4. Real book data connected to LPU library’s catalogue, subject to library permission/API access.
5. Campus Support admin dashboard that verifies claims, marks items returned, and protects student contact details.
6. QR codes at help desks to make a Lost & Found report in seconds.

## Important honest note

This is a working hackathon prototype, not connected to LPU’s actual library system. Say that clearly during your demo. For real deployment, the university would need to provide an official student-authentication method and access to its library catalogue/database.
