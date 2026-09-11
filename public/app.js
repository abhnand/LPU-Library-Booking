let libraryData = { seats: [], books: [], lostAndFound: [], statistics: {} };
let selectedSeat = null;
let selectedReport = null;

const elements = {
  floorSelect: document.querySelector('#floorSelect'),
  seatGrid: document.querySelector('#seatGrid'),
  bookList: document.querySelector('#bookList'),
  bookSearch: document.querySelector('#bookSearch'),
  lostFoundList: document.querySelector('#lostFoundList'),
  reportTypeFilter: document.querySelector('#reportTypeFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  reportSearch: document.querySelector('#reportSearch'),
  reportDialog: document.querySelector('#reportDialog'),
  reportForm: document.querySelector('#reportForm'),
  reportImage: document.querySelector('#reportImage'),
  imagePreview: document.querySelector('#imagePreview'),
  claimDialog: document.querySelector('#claimDialog'),
  claimForm: document.querySelector('#claimForm'),
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
  document.querySelector('#activeReports').textContent = stats.activeReports ?? '--';
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

function renderLostFound() {
  const type = elements.reportTypeFilter.value;
  const category = elements.categoryFilter.value;
  const term = elements.reportSearch.value.trim().toLowerCase();
  const reports = libraryData.lostAndFound.filter(report => {
    const typeMatches = type === 'all' || (type === 'claim-pending' ? report.status === 'claim-pending' : report.reportType === type);
    const categoryMatches = category === 'all' || report.category === category;
    const textMatches = `${report.title} ${report.description} ${report.location}`.toLowerCase().includes(term);
    return typeMatches && categoryMatches && textMatches;
  });

  elements.lostFoundList.replaceChildren();
  if (!reports.length) {
    elements.lostFoundList.innerHTML = '<p class="hint">No matching item reports. You can submit a new report above.</p>';
    return;
  }

  reports.forEach(report => {
    const card = document.createElement('article');
    const pending = report.status === 'claim-pending';
    card.className = `report-card ${report.reportType}${pending ? ' claim-pending' : ''}`;
    card.innerHTML = `
      <div class="report-top"><span class="report-badge">${pending ? 'Verification pending' : `${report.reportType} · ${report.category}`}</span><span class="report-id">${escapeHtml(report.id)}</span></div>
      ${report.imageData ? `<img class="report-image" src="${report.imageData}" alt="Photo of ${escapeHtml(report.title)}" />` : ''}
      <h3>${escapeHtml(report.title)}</h3>
      <p>${escapeHtml(report.description)}</p>
      <span class="report-location">⌖ ${escapeHtml(report.location)} · ${escapeHtml(report.eventDate)}</span>
      <span class="report-contact">${report.publicContact ? `Posted by ${escapeHtml(report.reporterName)} · Contact: ${escapeHtml(report.contact)}` : 'Contact: Campus Support with this report ID'}</span>
      <button class="mini-button" ${pending ? 'disabled' : ''}>${pending ? 'Staff reviewing claim' : 'Claim / I have information'}</button>`;
    const button = card.querySelector('button');
    if (!pending) button.addEventListener('click', () => openClaim(report));
    elements.lostFoundList.append(card);
  });
}

function openClaim(report) {
  selectedReport = report;
  document.querySelector('#claimItemName').textContent = report.title;
  elements.claimDialog.showModal();
  elements.claimForm.querySelector('input').focus();
}

async function submitReport(event) {
  event.preventDefault();
  const form = new FormData(elements.reportForm);
  try {
    const image = form.get('image');
    const payload = Object.fromEntries(form);
    delete payload.image;
    payload.publicContact = form.get('publicContact') === 'on';
    payload.imageData = await imageFileToDataUrl(image);
    payload.imageName = image?.name || '';
    const result = await api('/api/lost-found', { method: 'POST', body: JSON.stringify(payload) });
    libraryData.lostAndFound.unshift(result.report);
    libraryData.statistics = result.statistics;
    renderStatistics(); renderLostFound();
    elements.reportDialog.close(); elements.reportForm.reset(); clearImagePreview();
    showToast(result.message);
  } catch (error) { showToast(error.message); }
}

function imageFileToDataUrl(file) {
  if (!file || !file.size) return Promise.resolve('');
  const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) return Promise.reject(new Error('Please choose a PNG, JPG, or WebP image.'));
  if (file.size > 600 * 1024) return Promise.reject(new Error('Please choose an image smaller than 600 KB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read. Please try another one.'));
    reader.readAsDataURL(file);
  });
}

async function previewSelectedImage() {
  try {
    const imageData = await imageFileToDataUrl(elements.reportImage.files[0]);
    if (!imageData) return clearImagePreview();
    elements.imagePreview.src = imageData;
    elements.imagePreview.hidden = false;
  } catch (error) {
    clearImagePreview();
    elements.reportImage.value = '';
    showToast(error.message);
  }
}

function clearImagePreview() {
  elements.imagePreview.src = '';
  elements.imagePreview.hidden = true;
}

async function submitClaim(event) {
  event.preventDefault();
  if (!selectedReport) return;
  const form = new FormData(elements.claimForm);
  try {
    const result = await api(`/api/lost-found/${selectedReport.id}/claim`, { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
    const index = libraryData.lostAndFound.findIndex(report => report.id === result.report.id);
    libraryData.lostAndFound[index] = result.report;
    libraryData.statistics = result.statistics;
    selectedReport = null;
    renderStatistics(); renderLostFound();
    elements.claimDialog.close(); elements.claimForm.reset();
    showToast(result.message);
  } catch (error) { showToast(error.message); }
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
    renderStatistics(); renderSeats(); renderBooks(); renderLostFound();
  } catch (error) {
    showToast(`Could not load the library: ${error.message}`);
  }
}

elements.floorSelect.addEventListener('change', () => { selectedSeat = null; renderSeats(); });
elements.bookSearch.addEventListener('input', renderBooks);
elements.bookingForm.addEventListener('submit', bookSelectedSeat);
elements.reportTypeFilter.addEventListener('change', renderLostFound);
elements.categoryFilter.addEventListener('change', renderLostFound);
elements.reportSearch.addEventListener('input', renderLostFound);
elements.reportForm.addEventListener('submit', submitReport);
elements.reportImage.addEventListener('change', previewSelectedImage);
elements.claimForm.addEventListener('submit', submitClaim);
document.querySelector('#openReportDialog').addEventListener('click', () => elements.reportDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => { selectedSeat = null; elements.dialog.close(); renderSeats(); });
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeDialog}`).close()));
loadLibrary();
