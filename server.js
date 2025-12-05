const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));

// Database file
const DB_FILE = 'database.json';

// Initialize database
async function initDB() {
    try {
        await fs.access(DB_FILE);
    } catch {
        await fs.writeFile(DB_FILE, JSON.stringify({
            appointments: [],
            doctors: [],
            patients: []
        }, null, 2));
    }
}

// API Routes

// Get all appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DB_FILE));
        res.json(data.appointments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read appointments' });
    }
});

// Create new appointment
app.post('/api/appointments', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DB_FILE));
        const newAppointment = {
            id: Date.now(),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        data.appointments.push(newAppointment);
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
        
        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});

// Update appointment status
app.patch('/api/appointments/:id', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DB_FILE));
        const index = data.appointments.findIndex(a => a.id == req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        data.appointments[index] = {
            ...data.appointments[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
        res.json(data.appointments[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Get available doctors
app.get('/api/doctors', (req, res) => {
    const doctors = [
        { id: 1, name: "Dk. John Mwamba", specialty: "General Medicine", department: "general" },
        { id: 2, name: "Dk. Sarah Chuma", specialty: "Pediatrics", department: "pediatrics" },
        { id: 3, name: "Dk. Robert Kimani", specialty: "Surgery", department: "surgery" },
        { id: 4, name: "Dk. Grace Mwenda", specialty: "Dentistry", department: "dental" },
        { id: 5, name: "Dk. David Omondi", specialty: "Eye Care", department: "eye" },
        { id: 6, name: "Dk. Mary Achieng", specialty: "Maternity", department: "maternity" }
    ];
    res.json(doctors);
});

// Export appointments
app.get('/api/export', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DB_FILE));
        res.setHeader('Content-Disposition', 'attachment; filename=appointments.json');
        res.json(data.appointments);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Open in browser: http://localhost:${PORT}`);
    });
});
