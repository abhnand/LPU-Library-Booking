// LPU Library Seat Booking - beginner-friendly Node.js backend
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
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Please send valid JSON.'));
      }
    });
  });
}

function getStatistics(data) {
  return {
    totalSeats: data.seats.length,
    availableSeats: data.seats.filter(seat => seat.status === 'available').length,
    bookedSeats: data.seats.filter(seat => seat.status === 'booked').length,
    availableBooks: data.books.reduce((sum, book) => sum + book.availableCopies, 0)
  };
}

async function handleApi(request, response, pathname) {
  const data = readData();

  if (request.method === 'GET' && pathname === '/api/library') {
    return sendJson(response, 200, { ...data, statistics: getStatistics(data) });
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
server.listen(PORT, () => console.log(`LPU Library app is running at http://localhost:${PORT}`));
