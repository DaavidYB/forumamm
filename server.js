const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Configuration pour la production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://votre-app.onrender.com' 
    : 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.static('public'));

// Connexion MongoDB avec retry
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    });
    console.log('✅ MongoDB connecté');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    console.log('🔄 Nouvelle tentative dans 5s...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Gestion des erreurs MongoDB
mongoose.connection.on('error', err => {
  console.error('🔴 Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB déconnecté');
  connectWithRetry();
});

// Route de santé pour Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    mongoStatus: mongoose.connection.readyState
  });
});

// Modèles
const Company = mongoose.model('Company', {
  id: Number,
  name: String,
  logo: String
});

// Dans la définition du modèle Booking
const Booking = mongoose.model('Booking', {
    companyId: Number,
    timeSlot: { type: Date, index: true },
    studentName: String,
    studentClass: String,
    searchType: String
  });

/*const Booking = mongoose.model('Booking', {
  companyId: Number,
  timeSlot: Date,
  studentName: String,
  studentClass: String,
  searchType: String
});*/

// Routes API
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour servir l'application frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('🔴 Erreur:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Une erreur est survenue' 
        : err.message
    });
  });
  
const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});