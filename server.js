const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration MongoDB avec gestion d'erreurs
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('La variable d\'environnement MONGODB_URI n\'est pas définie');
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connecté à MongoDB avec succès');
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        // Afficher l'URI (en masquant le mot de passe pour la sécurité)
        const safeURI = process.env.MONGODB_URI ? 
            process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@') : 
            'non défini';
        console.log('URI MongoDB utilisé:', safeURI);
        process.exit(1);
    }
};

// Appeler la connexion
connectDB();

// Modèles
const Company = mongoose.model('Company', {
  id: Number,
  name: String,
  logo: String
});

const Booking = mongoose.model('Booking', {
  companyId: Number,
  timeSlot: Date,
  studentName: String,
  studentClass: String,
  searchType: String
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});