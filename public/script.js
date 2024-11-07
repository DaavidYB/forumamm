// script.js
let companies = [];
let bookings = new Map();

const timeSlots = generateTimeSlots();

function generateTimeSlots() {
    const slots = [];
    const startTime = new Date();
    startTime.setHours(10, 0, 0);
    const endTime = new Date();
    endTime.setHours(12, 0, 0);

    while (startTime < endTime) {
        slots.push(new Date(startTime));
        startTime.setMinutes(startTime.getMinutes() + 10);
    }
    return slots;
}

// Gestion de la navigation
async function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');

    if (pageId === 'companies-page') {
        await fetchCompanies();
        renderCompanies();
    }
}

async function fetchCompanies() {
    try {
        const response = await fetch('/api/companies');
        companies = await response.json();
    } catch (error) {
        console.error('Error fetching companies:', error);
    }
}

async function fetchBookings() {
    try {
        const response = await fetch('/api/bookings');
        const bookingsData = await response.json();
        bookings.clear(); // Nettoyer la Map avant de la remplir
        bookingsData.forEach(booking => {
            bookings.set(`${booking.companyId}-${new Date(booking.timeSlot).getTime()}`, booking);
        });
        return bookings;
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

async function createBooking(bookingData) {
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create booking');
        }
        
        await fetchBookings(); // Recharger les réservations après création
    } catch (error) {
        console.error('Error creating booking:', error);
        alert('Une erreur est survenue lors de la réservation');
    }
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

function showBookingModal(companyId, timeStamp) {
    const modal = document.getElementById('booking-modal');
    modal.classList.remove('hidden');
    
    const form = document.getElementById('booking-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        const bookingData = {
            companyId: companyId,
            timeSlot: new Date(parseInt(timeStamp)),
            studentName: `${formData.get('firstName')} ${formData.get('lastName')}`,
            studentClass: formData.get('class'),
            searchType: formData.get('searchType')
        };
        
        await createBooking(bookingData);
        closeModal();
        await showCompanySlots(companyId); // Attendre la mise à jour et recharger les créneaux
    };
}

function renderCompanies() {
    const grid = document.getElementById('companies-grid');
    grid.innerHTML = companies.map(company => `
        <div class="company-wrapper">
            <div class="company-card" onclick="showCompanySlots(${company.id})">
                <img src="${company.logo}" alt="${company.name}">
            </div>
            <div class="company-name">${company.name}</div>
        </div>
    `).join('');
}

// Affichage des créneaux d'une entreprise
async function showCompanySlots(companyId) {
    const company = companies.find(c => c.id === companyId);
    document.getElementById('company-name').textContent = company.name;
    
    await fetchBookings(); // Recharger les réservations avant d'afficher les créneaux
    
    const grid = document.getElementById('slots-grid');
    grid.innerHTML = timeSlots.map(time => {
        const booking = bookings.get(`${companyId}-${time.getTime()}`);
        const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const isBooked = booking !== undefined;
        return `
            <div class="slot-card ${isBooked ? 'booked' : ''}" ${!isBooked ? `onclick="showBookingModal(${companyId}, '${time.getTime()}')"` : ''}>
                <h3>${timeStr}</h3>
                <p>${isBooked ? booking.studentName : 'Disponible'}</p>
            </div>
        `;
    }).join('');

    showPage('slots-page');
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await fetchBookings(); // Charger les réservations au démarrage
    await showPage('home-page');
    await fetchCompanies();
});