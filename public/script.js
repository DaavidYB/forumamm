// script.js
const REFERENCE_DATE = new Date('2024-11-14');
REFERENCE_DATE.setHours(0, 0, 0, 0);

let companies = [];
let bookings = new Map();
let timeSlots = [];


function generateTimeSlots() {
    const slots = [];
    
    const startTime = new Date(REFERENCE_DATE);
    startTime.setHours(10, 0, 0);
    const endTime = new Date(REFERENCE_DATE);
    endTime.setHours(12, 0, 0);

    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
        slots.push(new Date(currentTime));
        currentTime.setMinutes(currentTime.getMinutes() + 10);
    }
    return slots;
}

// Fonction utilitaire pour normaliser une date en utilisant la date de référence
function normalizeTimeSlot(date) {
    const normalizedDate = new Date(REFERENCE_DATE);
    normalizedDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    return normalizedDate;
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
        bookings.clear();
        
        bookingsData.forEach(booking => {
            // Normaliser la date du booking pour la comparaison
            const bookingDate = new Date(booking.timeSlot);
            const normalizedDate = normalizeTimeSlot(bookingDate);
            const key = `${booking.companyId}-${normalizedDate.getTime()}`;
            bookings.set(key, booking);
        });
        
        return bookings;
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

async function createBooking(bookingData) {
    try {
        // Normaliser la date avant l'envoi
        bookingData.timeSlot = normalizeTimeSlot(new Date(bookingData.timeSlot));
        
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
        
        await fetchBookings();
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
        await showCompanySlots(companyId);
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
    
    await fetchBookings();
    
    const grid = document.getElementById('slots-grid');
    grid.innerHTML = timeSlots.map(time => {
        const normalizedTime = normalizeTimeSlot(time);
        const booking = bookings.get(`${companyId}-${normalizedTime.getTime()}`);
        const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const isBooked = booking !== undefined;
        
        return `
            <div class="slot-card ${isBooked ? 'booked' : ''}" ${!isBooked ? `onclick="showBookingModal(${companyId}, '${normalizedTime.getTime()}')"` : ''}>
                <h3>${timeStr}</h3>
                <p>${isBooked ? booking.studentName : 'Disponible'}</p>
            </div>
        `;
    }).join('');

    showPage('slots-page');
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    timeSlots = generateTimeSlots(); // Générer les créneaux une seule fois au chargement
    await fetchBookings();
    await showPage('home-page');
    await fetchCompanies();
});