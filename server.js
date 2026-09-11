// LPU Campus Hub - beginner-friendly Node.js backend
// No installation is required: Node.js has everything this file needs.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'library-data.json');

function createInitialData() {
  const bookedSeats = new Set([
    'F1-S005', 'F1-S012', 'F1-S026', 'F1-S041', 'F1-S077', 'F1-S103',
    'F2-S009', 'F2-S034', 'F2-S055', 'F2-S081', 'F2-S119',
    'F3-S016', 'F3-S021', 'F3-S063', 'F3-S088', 'F3-S140',
    'F4-S004', 'F4-S029', 'F4-S073', 'F4-S108', 'F4-S129',
    'F5-S017', 'F5-S049', 'F5-S096', 'F5-S133',
    'F6-S008', 'F6-S038', 'F6-S069', 'F6-S111', 'F6-S147'
  ]);

  const seats = [];
  for (let floor = 1; floor <= 6; floor += 1) {
    for (let number = 1; number <= 150; number += 1) {
      const id = `F${floor}-S${String(number).padStart(3, '0')}`;
      seats.push({
        id,
        floor,
        number,
        status: bookedSeats.has(id) ? 'booked' : 'available',
        bookedBy: bookedSeats.has(id) ? 'Demo Student' : null,
        bookingUntil: bookedSeats.has(id) ? 'Today, 6:00 PM' : null
      });
    }
  }

  return {
    seats,
    books: [
      { id: 1, title: 'Clean Code', author: 'Robert C. Martin', totalCopies: 8, availableCopies: 3, dueDate: '18 September 2026' },
      { id: 2, title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', totalCopies: 5, availableCopies: 1, dueDate: '15 September 2026' },
      { id: 3, title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', totalCopies: 6, availableCopies: 0, dueDate: '13 September 2026' },
      { id: 4, title: 'Computer Networks', author: 'Andrew S. Tanenbaum', totalCopies: 10, availableCopies: 7, dueDate: null },
      { id: 5, title: 'Atomic Habits', author: 'James Clear', totalCopies: 12, availableCopies: 5, dueDate: '22 September 2026' },
      { id: 6, title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', totalCopies: 7, availableCopies: 2, dueDate: '17 September 2026' }
    ],
    lostAndFound: [
      { id: 'LF-1001', reportType: 'found', category: 'ID card', title: 'LPU Student ID card', description: 'Found near the self-checkout counter. The name is intentionally hidden for safety.', location: 'Central Library, Ground Floor', eventDate: '11 September 2026', reportedDate: '11 September 2026', status: 'open', reporterName: 'Library Help Desk', contact: 'Visit the library help desk', claimRequests: [] },
      { id: 'LF-1002', reportType: 'lost', category: 'Accessories', title: 'Black wireless earbuds case', description: 'Small matte-black charging case, possibly left on a study table.', location: 'Block 34, First Floor', eventDate: '10 September 2026', reportedDate: '11 September 2026', status: 'open', reporterName: 'Student', contact: 'Claim through Campus Hub', claimRequests: [] },
      { id: 'LF-1003', reportType: 'found', category: 'Keys', title: 'Set of two silver keys', description: 'Two keys on a blue LPU keychain.', location: 'Food Court', eventDate: '10 September 2026', reportedDate: '10 September 2026', status: 'open', reporterName: 'Campus Support', contact: 'Visit Campus Support Desk', claimRequests: [] },
      { id: 'LF-1004', reportType: 'lost', category: 'Books', title: 'Engineering Mathematics notebook', description: 'Blue spiral notebook with handwritten formulae inside.', location: 'Uni Mall seating area', eventDate: '9 September 2026', reportedDate: '10 September 2026', status: 'claim-pending', reporterName: 'Student', contact: 'Claim through Campus Hub', claimRequests: [{ name: 'Demo Student', contact: 'demo@lpu.in', details: 'I can describe the first page and cover.', requestedAt: '10 September 2026' }] }
    ]
  };
}

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createInitialData(), null, 2));
  }
}

function readData() {
  ensureDataFile();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  // Existing installations created before Lost & Found was added keep their old bookings.
  let changed = false;
  if (!Array.isArray(data.lostAndFound)) {
    data.lostAndFound = createInitialData().lostAndFound;
    changed = true;
  }
  data.lostAndFound.forEach(report => {
    if (typeof report.publicContact !== 'boolean') { report.publicContact = true; changed = true; }
    if (typeof report.imageData !== 'string') { report.imageData = ''; changed = true; }
    if (typeof report.imageName !== 'string') { report.imageName = ''; changed = true; }
  });
  if (changed) saveData(data);
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 404, { error: 'Page not found.' });
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
    response.end(content);
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      // Supports an optional photo up to 600 KB after the browser encodes it.
      if (body.length > 900_000) tooLarge = true;
    });
    request.on('end', () => {
      if (tooLarge) return reject(new Error('The photo is too large. Please choose an image smaller than 600 KB.'));
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Please send valid JSON.'));
      }
    });
  });
}

function publicReport(report) {
  return {
    ...report,
    contact: report.publicContact ? report.contact : null,
    // Claim details belong to Campus Support, never to other students.
    claimRequests: []
  };
}

function getStatistics(data) {
  return {
    totalSeats: data.seats.length,
    availableSeats: data.seats.filter(seat => seat.status === 'available').length,
    bookedSeats: data.seats.filter(seat => seat.status === 'booked').length,
    availableBooks: data.books.reduce((sum, book) => sum + book.availableCopies, 0),
    activeReports: data.lostAndFound.filter(report => report.status === 'open').length
  };
}

async function handleApi(request, response, pathname) {
  const data = readData();

  if (request.method === 'GET' && pathname === '/api/library') {
    return sendJson(response, 200, { ...data, lostAndFound: data.lostAndFound.map(publicReport), statistics: getStatistics(data) });
  }

  const seatMatch = pathname.match(/^\/api\/seats\/([A-Z0-9-]+)\/(book|cancel)$/);
  if (seatMatch && request.method === 'POST') {
    const [, seatId, action] = seatMatch;
    const seat = data.seats.find(item => item.id === seatId);
    if (!seat) return sendJson(response, 404, { error: 'Seat not found.' });

    if (action === 'book') {
      if (seat.status === 'booked') return sendJson(response, 409, { error: 'Sorry, this seat was just booked by someone else.' });
      const body = await readRequestBody(request);
      const studentName = String(body.studentName || '').trim();
      const bookingUntil = String(body.bookingUntil || '').trim();
      if (!studentName || !bookingUntil) return sendJson(response, 400, { error: 'Please enter your name and booking time.' });
      seat.status = 'booked';
      seat.bookedBy = studentName;
      seat.bookingUntil = bookingUntil;
      saveData(data);
      return sendJson(response, 200, { message: `${seat.id} is booked successfully.`, seat, statistics: getStatistics(data) });
    }

    seat.status = 'available';
    seat.bookedBy = null;
    seat.bookingUntil = null;
    saveData(data);
    return sendJson(response, 200, { message: `${seat.id} is available again.`, seat, statistics: getStatistics(data) });
  }

  const bookMatch = pathname.match(/^\/api\/books\/(\d+)\/(borrow|return)$/);
  if (bookMatch && request.method === 'POST') {
    const [, bookId, action] = bookMatch;
    const book = data.books.find(item => item.id === Number(bookId));
    if (!book) return sendJson(response, 404, { error: 'Book not found.' });

    if (action === 'borrow') {
      if (book.availableCopies === 0) return sendJson(response, 409, { error: 'No copies are available at the moment.' });
      book.availableCopies -= 1;
      book.dueDate = '25 September 2026';
    } else if (book.availableCopies < book.totalCopies) {
      book.availableCopies += 1;
      if (book.availableCopies === book.totalCopies) book.dueDate = null;
    }
    saveData(data);
    return sendJson(response, 200, { message: `${book.title} updated.`, book, statistics: getStatistics(data) });
  }

  if (request.method === 'POST' && pathname === '/api/lost-found') {
    const body = await readRequestBody(request);
    const reportType = String(body.reportType || '').trim();
    const category = String(body.category || '').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const location = String(body.location || '').trim();
    const eventDate = String(body.eventDate || '').trim();
    const reporterName = String(body.reporterName || '').trim();
    const contact = String(body.contact || '').trim();
    const publicContact = body.publicContact === true;
    const imageData = String(body.imageData || '');
    const imageName = String(body.imageName || '').trim();

    if (!['lost', 'found'].includes(reportType)) return sendJson(response, 400, { error: 'Choose whether the item is lost or found.' });
    if (!category || !title || !description || !location || !eventDate || !reporterName || !contact) return sendJson(response, 400, { error: 'Please complete every field in the report.' });
    if (title.length > 80 || description.length > 500 || location.length > 100 || reporterName.length > 60 || contact.length > 100) return sendJson(response, 400, { error: 'One of the fields is too long. Please shorten it and try again.' });
    if (imageData && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageData) || imageData.length > 850_000)) return sendJson(response, 400, { error: 'Upload a PNG, JPG or WebP image smaller than 600 KB.' });

    const report = {
      id: `LF-${Date.now()}`,
      reportType,
      category,
      title,
      description,
      location,
      eventDate,
      reportedDate: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
      status: 'open',
      reporterName,
      contact,
      publicContact,
      imageData,
      imageName,
      claimRequests: []
    };
    data.lostAndFound.unshift(report);
    saveData(data);
    return sendJson(response, 201, { message: `Report ${report.id} submitted. Campus Support can now help verify it.`, report: publicReport(report), statistics: getStatistics(data) });
  }

  const claimMatch = pathname.match(/^\/api\/lost-found\/([A-Za-z0-9-]+)\/claim$/);
  if (claimMatch && request.method === 'POST') {
    const report = data.lostAndFound.find(item => item.id === claimMatch[1]);
    if (!report) return sendJson(response, 404, { error: 'Lost & Found report not found.' });
    if (report.status !== 'open') return sendJson(response, 409, { error: 'This item already has a claim under verification.' });

    const body = await readRequestBody(request);
    const name = String(body.name || '').trim();
    const contact = String(body.contact || '').trim();
    const details = String(body.details || '').trim();
    if (!name || !contact || !details) return sendJson(response, 400, { error: 'Please give your name, contact and proof of ownership.' });
    if (name.length > 60 || contact.length > 100 || details.length > 500) return sendJson(response, 400, { error: 'One of the claim fields is too long. Please shorten it and try again.' });

    report.claimRequests.push({ name, contact, details, requestedAt: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()) });
    report.status = 'claim-pending';
    saveData(data);
    return sendJson(response, 200, { message: 'Claim request submitted. Campus Support will verify ownership before releasing the item.', report: publicReport(report), statistics: getStatistics(data) });
  }

  return sendJson(response, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(request, response, pathname);
      return;
    }

    const requestedFile = pathname === '/' ? 'index.html' : pathname.slice(1);
    const safeFile = path.normalize(requestedFile).replace(/^(\.\.([\\/]|$))+/, '');
    sendFile(response, path.join(PUBLIC_DIR, safeFile));
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message || 'Something went wrong.' });
  }
});

ensureDataFile();
server.listen(PORT, () => console.log(`LPU Campus Hub is running at http://localhost:${PORT}`));
