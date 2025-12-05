// Sample Doctors Data
const doctors = [
    { id: 1, name: "Dk. John Mwamba", specialty: "Matibabu ya Jumla", experience: "Miaka 15", availability: ["08:00", "10:00", "14:00"], department: "general" },
    { id: 2, name: "Dk. Sarah Chuma", specialty: "Watoto", experience: "Miaka 10", availability: ["10:00", "12:00", "16:00"], department: "pediatrics" },
    { id: 3, name: "Dk. Robert Kimani", specialty: "Upasuaji", experience: "Miaka 20", availability: ["08:00", "14:00"], department: "surgery" },
    { id: 4, name: "Dk. Grace Mwenda", specialty: "Menyo", experience: "Miaka 8", availability: ["09:00", "11:00", "15:00"], department: "dental" },
    { id: 5, name: "Dk. David Omondi", specialty: "Macho", experience: "Miaka 12", availability: ["10:00", "13:00", "16:00"], department: "eye" },
    { id: 6, name: "Dk. Mary Achieng", specialty: "Ujauzito", experience: "Miaka 18", availability: ["08:00", "12:00", "14:00"], department: "maternity" }
];

// Sample Appointments (stored in localStorage)
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];

// DOM Elements
const doctorSelect = document.getElementById('doctor');
const doctorsList = document.getElementById('doctorsList');
const appointmentsBody = document.getElementById('appointmentsBody');
const appointmentForm = document.getElementById('appointmentForm');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationMessage = document.getElementById('confirmationMessage');
const closeModalBtn = document.getElementById('closeModalBtn');
const printBtn = document.getElementById('printBtn');
const closeModalX = document.querySelector('.close-modal');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadDoctors();
    loadAppointments();
    setupFormValidation();
    setupModalEvents();
    setupDateRestriction();
});

// Load Doctors into Select and Grid
function loadDoctors() {
    // Populate select dropdown
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `${doctor.name} - ${doctor.specialty}`;
        option.setAttribute('data-department', doctor.department);
        doctorSelect.appendChild(option);
    });
    
    // Populate doctors grid
    doctors.forEach(doctor => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'doctor-card';
        doctorCard.innerHTML = `
            <div class="doctor-img">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="doctor-info">
                <h3>${doctor.name}</h3>
                <p class="specialty">
                    <i class="fas fa-stethoscope"></i> ${doctor.specialty}
                </p>
                <p><i class="fas fa-award"></i> Uzoefu: ${doctor.experience}</p>
                <p><i class="fas fa-clock"></i> Muda: ${doctor.availability.join(', ')}</p>
                <button class="btn-primary" style="margin-top: 15px; width: 100%;" 
                        onclick="bookWithDoctor(${doctor.id})">
                    <i class="fas fa-calendar-plus"></i> Panga Miadi
                </button>
            </div>
        `;
        doctorsList.appendChild(doctorCard);
    });
}

// Load Appointments into Table
function loadAppointments() {
    appointmentsBody.innerHTML = '';
    
    if (appointments.length === 0) {
        appointmentsBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <p>Hakuna miadi iliyopangwa bado.</p>
                    <button class="btn-primary" onclick="document.querySelector('#book').scrollIntoView()">
                        <i class="fas fa-calendar-plus"></i> Panga Miadi ya Kwanza
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    appointments.forEach((apt, index) => {
        const row = document.createElement('tr');
        const doctor = doctors.find(d => d.id == apt.doctorId);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${apt.date}</td>
            <td>${apt.time}</td>
            <td>${doctor ? doctor.name : 'Unknown'}</td>
            <td>${apt.department}</td>
            <td><span class="status ${apt.status}">${apt.status}</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewAppointment(${index})">
                    <i class="fas fa-eye"></i> Angalia
                </button>
                <button class="action-btn cancel-btn" onclick="cancelAppointment(${index})" 
                        ${apt.status === 'cancelled' ? 'disabled' : ''}>
                    <i class="fas fa-times"></i> Ghairi
                </button>
            </td>
        `;
        appointmentsBody.appendChild(row);
    });
}

// Setup Form Validation
function setupFormValidation() {
    appointmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const appointment = {
            id: Date.now(),
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            department: document.getElementById('department').value,
            doctorId: parseInt(document.getElementById('doctor').value),
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            symptoms: document.getElementById('symptoms').value,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Validation
        if (!appointment.fullName || !appointment.phone || !appointment.doctorId || !appointment.date || !appointment.time) {
            alert('Tafadhali jaza sehemu zote muhimu!');
            return;
        }
        
        // Phone validation (Tanzania)
        const phoneRegex = /^0[67]\d{8}$/;
        if (!phoneRegex.test(appointment.phone)) {
            alert('Tafadhali ingiza namba halisi ya simu (07 au 06)');
            return;
        }
        
        // Check if doctor is available at selected time
        const selectedDoctor = doctors.find(d => d.id === appointment.doctorId);
        if (!selectedDoctor.availability.includes(appointment.time)) {
            alert(`Daktari ${selectedDoctor.name} hapatikani kwa muda ${appointment.time}`);
            return;
        }
        
        // Save appointment
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Show confirmation
        showConfirmation(appointment);
        
        // Reset form
        appointmentForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        
        // Reload appointments
        loadAppointments();
    });
}

// Show Confirmation Modal
function showConfirmation(appointment) {
    const doctor = doctors.find(d => d.id === appointment.doctorId);
    
    confirmationMessage.innerHTML = `
        <p><strong>Mpendwa ${appointment.fullName},</strong></p>
        <p>Umepanga miadi kwa mafanikio!</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Namba ya Miadi:</strong> #${appointment.id}</p>
            <p><strong>Daktari:</strong> ${doctor.name}</p>
            <p><strong>Tarehe:</strong> ${appointment.date}</p>
            <p><strong>Muda:</strong> ${appointment.time}</p>
            <p><strong>Idara:</strong> ${appointment.department}</p>
        </div>
        <p>Utapokea ujumbe wa SMS kabla ya miadi yako.</p>
        <p><em>Asante kwa kuchagua Hospitali Ya Jamii!</em></p>
    `;
    
    confirmationModal.style.display = 'flex';
}

// Setup Modal Events
function setupModalEvents() {
    closeModalBtn.addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });
    
    closeModalX.addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });
    
    printBtn.addEventListener('click', () => {
        window.print();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });
}

// Setup Date Restriction (no past dates)
function setupDateRestriction() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
}

// Filter Doctors by Department
document.getElementById('department').addEventListener('change', (e) => {
    const department = e.target.value;
    
    // Clear doctor select
    doctorSelect.innerHTML = '<option value="">Chagua daktari</option>';
    
    // Filter doctors
    const filteredDoctors = department 
        ? doctors.filter(d => d.department === department)
        : doctors;
    
    // Populate filtered doctors
    filteredDoctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `${doctor.name} - ${doctor.specialty}`;
        doctorSelect.appendChild(option);
    });
});

// Helper Functions
function bookWithDoctor(doctorId) {
    const doctor = doctors.find(d => d.id === doctorId);
    
    // Set form values
    document.getElementById('department').value = doctor.department;
    document.getElementById('doctor').value = doctor.id;
    
    // Scroll to form
    document.querySelector('#book').scrollIntoView({ behavior: 'smooth' });
    
    // Show notification
    alert(`Umechagua ${doctor.name}. Tafadhali jaza taarifa zako hapo chini.`);
}

function viewAppointment(index) {
    const apt = appointments[index];
    const doctor = doctors.find(d => d.id == apt.doctorId);
    
    alert(`
        MTAZAMO WA MIADI:
        =================
        Namba: #${apt.id}
        Jina: ${apt.fullName}
        Simu: ${apt.phone}
        Daktari: ${doctor ? doctor.name : 'Unknown'}
        Tarehe: ${apt.date}
        Muda: ${apt.time}
        Idara: ${apt.department}
        Hali: ${apt.status}
        Dalili: ${apt.symptoms || 'Hakuna'}
        Imeundwa: ${new Date(apt.createdAt).toLocaleDateString('sw-TZ')}
    `);
}

function cancelAppointment(index) {
    if (confirm('Una uhakika unataka kughairi miadi hii?')) {
        appointments[index].status = 'cancelled';
        localStorage.setItem('appointments', JSON.stringify(appointments));
        loadAppointments();
        alert('Miadi imeghairiwa.');
    }
}

// SMS Simulation (using localStorage)
function sendSMSNotification(phone, message) {
    const smsLog = JSON.parse(localStorage.getItem('smsLog')) || [];
    smsLog.push({
        phone,
        message,
        timestamp: new Date().toISOString(),
        status: 'sent'
    });
    localStorage.setItem('smsLog', JSON.stringify(smsLog));
    console.log(`SMS sent to ${phone}: ${message}`);
}

// Send reminder SMS (simulated)
setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    appointments.forEach(apt => {
        if ((apt.date === today || apt.date === tomorrow) && apt.status === 'pending') {
            sendSMSNotification(
                apt.phone,
                `Ukumbusho: Una miadi na Daktari kesho (${apt.date} ${apt.time}). Tafadhali wasili mapema.`
            );
        }
    });
}, 60000); // Check every minute

// Export/Import functionality
function exportAppointments() {
    const dataStr = JSON.stringify(appointments, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'appointments.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importAppointments(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imported = JSON.parse(e.target.result);
        appointments = [...appointments, ...imported];
        localStorage.setItem('appointments', JSON.stringify(appointments));
        loadAppointments();
        alert('Miadi zimeingizwa kikamilifu!');
    };
    
    reader.readAsText(file);
}

// Add to window object for global access
window.exportAppointments = exportAppointments;
window.importAppointments = importAppointments;
