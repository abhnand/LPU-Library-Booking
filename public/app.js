let libraryData = { seats: [], books: [], statistics: {} };
let selectedSeat = null;

const elements = {
  floorSelect: document.querySelector('#floorSelect'),
  seatGrid: document.querySelector('#seatGrid'),
  bookList: document.querySelector('#bookList'),
  bookSearch: document.querySelector('#bookSearch'),
  dialog: document.querySelector('#bookingDialog'),
  bookingForm: document.querySelector('#bookingForm'),
  selectedSeatName: document.querySelector('#selectedSeatName'),
  toast: document.querySelector('#toast')
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 3300);
}

function renderStatistics() {
  const stats = libraryData.statistics;
  document.querySelector('#totalSeats').textContent = stats.totalSeats ?? '--';
  document.querySelector('#availableSeats').textContent = stats.availableSeats ?? '--';
  document.querySelector('#bookedSeats').textContent = stats.bookedSeats ?? '--';
  document.querySelector('#availableBooks').textContent = stats.availableBooks ?? '--';
  document.querySelector('#heroAvailable').textContent = stats.availableSeats ?? '--';
}

function renderSeats() {
  const floor = Number(elements.floorSelect.value);
  const seats = libraryData.seats.filter(seat => seat.floor === floor);
  elements.seatGrid.replaceChildren();

  seats.forEach(seat => {
    const button = document.createElement('button');
    button.className = `seat ${seat.status}${selectedSeat?.id === seat.id ? ' selected' : ''}`;
    button.textContent = String(seat.number).padStart(3, '0');
    button.disabled = seat.status === 'booked';
    button.title = seat.status === 'booked' ? `${seat.id}: Booked until ${seat.bookingUntil}` : `${seat.id}: Available — click to book`;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => openBooking(seat));
    elements.seatGrid.append(button);
  });
}

function renderBooks() {
  const term = elements.bookSearch.value.trim().toLowerCase();
  const books = libraryData.books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(term));
  elements.bookList.replaceChildren();

  if (!books.length) {
    elements.bookList.innerHTML = '<p class="hint">No books matched your search.</p>';
    return;
  }

  books.forEach(book => {
    const card = document.createElement('article');
    const unavailable = book.availableCopies === 0;
    card.className = `book${unavailable ? ' unavailable' : ''}`;
    card.innerHTML = `
      <div><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)} · ${book.totalCopies} copies in library</p></div>
      <div class="book-status"><strong>${book.availableCopies} of ${book.totalCopies} available</strong><span>${book.dueDate ? `Next expected return: ${escapeHtml(book.dueDate)}` : 'All copies are in the library'}</span></div>
      <button class="mini-button" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Unavailable' : 'Borrow demo'}</button>`;
    const button = card.querySelector('button');
    if (!unavailable) button.addEventListener('click', () => borrowBook(book.id));
    elements.bookList.append(card);
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function openBooking(seat) {
  selectedSeat = seat;
  renderSeats();
  elements.selectedSeatName.textContent = `Seat ${seat.number}`;
  document.querySelector('#seatDescription').textContent = `Floor ${seat.floor} · Seat ID: ${seat.id}. It is currently available.`;
  elements.dialog.showModal();
  document.querySelector('#studentName').focus();
}

async function bookSelectedSeat(event) {
  event.preventDefault();
  if (!selectedSeat) return;
  const form = new FormData(elements.bookingForm);
  try {
    const result = await api(`/api/seats/${selectedSeat.id}/book`, {
      method: 'POST',
      body: JSON.stringify({ studentName: form.get('studentName'), bookingUntil: form.get('bookingUntil') })
    });
    updateSeat(result.seat);
    libraryData.statistics = result.statistics;
    selectedSeat = null;
    renderStatistics(); renderSeats();
    elements.dialog.close(); elements.bookingForm.reset();
    showToast(result.message);
  } catch (error) { showToast(error.message); }
}

function updateSeat(updatedSeat) {
  const index = libraryData.seats.findIndex(seat => seat.id === updatedSeat.id);
  if (index !== -1) libraryData.seats[index] = updatedSeat;
}

async function borrowBook(bookId) {
  try {
    const result = await api(`/api/books/${bookId}/borrow`, { method: 'POST', body: '{}' });
    const index = libraryData.books.findIndex(book => book.id === result.book.id);
    libraryData.books[index] = result.book;
    libraryData.statistics = result.statistics;
    renderStatistics(); renderBooks(); showToast('Demo borrow recorded. In the real version, use LPU login here.');
  } catch (error) { showToast(error.message); }
}

async function loadLibrary() {
  try {
    libraryData = await api('/api/library');
    for (let floor = 1; floor <= 6; floor += 1) {
      const option = new Option(`Floor ${floor}`, floor);
      elements.floorSelect.add(option);
    }
    renderStatistics(); renderSeats(); renderBooks();
  } catch (error) {
    showToast(`Could not load the library: ${error.message}`);
  }
}

elements.floorSelect.addEventListener('change', () => { selectedSeat = null; renderSeats(); });
elements.bookSearch.addEventListener('input', renderBooks);
elements.bookingForm.addEventListener('submit', bookSelectedSeat);
document.querySelector('#closeDialog').addEventListener('click', () => { selectedSeat = null; elements.dialog.close(); renderSeats(); });
loadLibrary();
