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

async function fetchCompanies() {
    try {
        const response = await fetch('/api/companies');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        companies = data; // Met à jour la variable globale
        return data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

function showPage(pageId) {
    try {
        // Cache toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        // Affiche la page demandée
        const pageToShow = document.getElementById(pageId);
        if (!pageToShow) {
            throw new Error(`Page ${pageId} non trouvée`);
        }
        pageToShow.classList.remove('hidden');
    } catch (error) {
        console.error('Erreur dans showPage:', error);
        throw error;
    }
}

async function fetchBookings() {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des réservations');
      }
      
      const bookingsData = await response.json();
      bookings.clear();
      
      bookingsData.forEach(booking => {
        const key = `${booking.companyId}-${new Date(booking.timeSlot).getTime()}`;
        bookings.set(key, booking);
      });
      
      return bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
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
      
      if (response.status === 409) {
        throw new Error('Ce créneau est déjà réservé');
      }
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la réservation');
      }
      
      const newBooking = await response.json();
      
      // Mettre à jour la Map locale avec le nouveau booking
      const key = `${newBooking.companyId}-${new Date(newBooking.timeSlot).getTime()}`;
      bookings.set(key, newBooking);
      
      // Forcer un rafraîchissement des réservations
      await fetchBookings();
      
      // Rafraîchir l'affichage
      await showCompanySlots(newBooking.companyId);
      
      return newBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error.message);
      throw error;
    }
  }

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

async function showBookingModal(companyId, timeStamp) {
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
        
        try {
            await createBooking(bookingData);
            closeModal();
            // Rafraîchir les réservations après la création
            await fetchBookings();
            showCompanySlots(companyId);
        } catch (error) {
            console.error('Booking creation failed:', error);
        }
    };
}


async function showCompanySlots(companyId) {
    try {
      await fetchBookings();
      
      const company = companies.find(c => c.id === companyId);
      if (!company) {
        throw new Error('Entreprise non trouvée');
      }
      
      document.getElementById('company-name').textContent = company.name;
      
      const grid = document.getElementById('slots-grid');
      grid.innerHTML = timeSlots.map(time => {
        const key = `${companyId}-${time.getTime()}`;
        const booking = bookings.get(key);
        const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const isBooked = booking !== undefined;
        
        return `
          <div class="slot-card ${isBooked ? 'booked' : ''}" 
               ${!isBooked ? `onclick="showBookingModal(${companyId}, '${time.getTime()}')"` : ''}>
            <h3>${timeStr}</h3>
            <p>${isBooked ? booking.studentName : 'Disponible'}</p>
          </div>
        `;
      }).join('');
  
      showPage('slots-page');
    } catch (error) {
      console.error('Error showing company slots:', error);
      alert('Une erreur est survenue lors du chargement des créneaux');
    }
  }

document.addEventListener('DOMContentLoaded', async () => {
    try {
        showPage('home-page');
        console.log('Début du chargement...');
        const [companiesResult, bookingsResult] = await Promise.all([
            fetchCompanies().catch(e => {
                console.error('Erreur fetchCompanies:', e);
                throw e;
            }),
            fetchBookings().catch(e => {
                console.error('Erreur fetchBookings:', e);
                throw e;
            })
        ]);
        console.log('Chargement terminé:', { companiesResult, bookingsResult });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        alert('Une erreur est survenue lors du chargement initial: ' + error.message);
    }
});