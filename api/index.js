const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// In-memory database
let appointments = [];
let patients = [];
let doctors = [
    { id: 1, name: "Dr. John Mwamba", specialty: "General Medicine", department: "general", available: true },
    { id: 2, name: "Dr. Sarah Chuma", specialty: "Pediatrics", department: "pediatrics", available: true },
    { id: 3, name: "Dr. Robert Kimani", specialty: "Surgery", department: "surgery", available: true },
    { id: 4, name: "Dr. Grace Mwenda", specialty: "Dentistry", department: "dental", available: true },
    { id: 5, name: "Dr. David Omondi", specialty: "Eye Care", department: "eye", available: true },
    { id: 6, name: "Dr. Mary Achieng", specialty: "Maternity", department: "maternity", available: true }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Hospital Appointment System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        appointments: appointments.length,
        patients: patients.length
    });
});

// Get all doctors
app.get('/api/doctors', (req, res) => {
    res.json({
        success: true,
        count: doctors.length,
        data: doctors
    });
});

// Get doctor by ID
app.get('/api/doctors/:id', (req, res) => {
    const doctor = doctors.find(d => d.id === parseInt(req.params.id));
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, data: doctor });
});

// Get all appointments
app.get('/api/appointments', (req, res) => {
    res.json({
        success: true,
        count: appointments.length,
        data: appointments
    });
});

// Get appointment by ID
app.get('/api/appointments/:id', (req, res) => {
    const appointment = appointments.find(a => a.id === req.params.id);
    if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, data: appointment });
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
    try {
        const { patientName, phone, email, date, time, doctorId, department, symptoms } = req.body;
        
        // Validation
        if (!patientName || !phone || !date || !time || !doctorId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: patientName, phone, date, time, doctorId' 
            });
        }
        
        // Check if doctor exists
        const doctor = doctors.find(d => d.id === doctorId);
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        
        // Check for duplicate appointment (same patient, doctor, date, time)
        const existingAppointment = appointments.find(a => 
            a.patientPhone === phone && 
            a.doctorId === doctorId && 
            a.date === date && 
            a.time === time
        );
        
        if (existingAppointment) {
            return res.status(409).json({ 
                success: false, 
                message: 'Appointment already exists for this patient at the same time' 
            });
        }
        
        // Create appointment
        const appointment = {
            id: 'APT' + Date.now(),
            patientName,
            patientPhone: phone,
            patientEmail: email || '',
            date,
            time,
            doctorId,
            doctorName: doctor.name,
            department: department || doctor.department,
            symptoms: symptoms || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        appointments.push(appointment);
        
        // Add to patients list if new
        const existingPatient = patients.find(p => p.phone === phone);
        if (!existingPatient) {
            patients.push({
                id: 'PAT' + Date.now(),
                name: patientName,
                phone: phone,
                email: email || '',
                createdAt: new Date().toISOString()
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
        
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
});

// Update appointment status
app.put('/api/appointments/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be: pending, confirmed, completed, or cancelled' 
            });
        }
        
        const appointmentIndex = appointments.findIndex(a => a.id === req.params.id);
        if (appointmentIndex === -1) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        
        appointments[appointmentIndex].status = status;
        appointments[appointmentIndex].updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: `Appointment ${status} successfully`,
            data: appointments[appointmentIndex]
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
    const appointmentIndex = appointments.findIndex(a => a.id === req.params.id);
    if (appointmentIndex === -1) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    const deletedAppointment = appointments.splice(appointmentIndex, 1)[0];
    
    res.json({
        success: true,
        message: 'Appointment deleted successfully',
        data: deletedAppointment
    });
});

// Search appointments
app.get('/api/appointments/search/:phone', (req, res) => {
    const phone = req.params.phone;
    const patientAppointments = appointments.filter(a => a.patientPhone === phone);
    
    res.json({
        success: true,
        count: patientAppointments.length,
        data: patientAppointments
    });
});

// Get today's appointments
app.get('/api/appointments/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === today);
    
    res.json({
        success: true,
        count: todayAppointments.length,
        data: todayAppointments
    });
});

// Get available time slots for a doctor on a date
app.get('/api/availability/:doctorId/:date', (req, res) => {
    const { doctorId, date } = req.params;
    const doctorAppointments = appointments.filter(a => 
        a.doctorId === parseInt(doctorId) && 
        a.date === date && 
        a.status !== 'cancelled'
    );
    
    // Doctor's working hours
    const workingHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
    const bookedSlots = doctorAppointments.map(a => a.time);
    const availableSlots = workingHours.filter(slot => !bookedSlots.includes(slot));
    
    res.json({
        success: true,
        doctorId,
        date,
        availableSlots,
        bookedSlots
    });
});

// Statistics
app.get('/api/stats', (req, res) => {
    const stats = {
        totalAppointments: appointments.length,
        pending: appointments.filter(a => a.status === 'pending').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        todayAppointments: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length
    };
    
    res.json({ success: true, data: stats });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found' 
    });
});

// Export for Vercel
module.exports = app;
