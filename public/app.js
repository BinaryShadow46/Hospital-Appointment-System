// ================ GLOBAL VARIABLES ================
let appointments = [];
let doctors = [];
let currentAppointmentId = null;
const API_BASE = '/api';

// ================ DOM ELEMENTS ================
const loadingSpinner = document.getElementById('loadingSpinner');
const apiStatus = document.getElementById('apiStatus');
const apiStatusDot = apiStatus?.querySelector('.dot');
const searchAppointments = document.getElementById('searchAppointments');
const bookingForm = document.getElementById('bookingForm');
const confirmationModal = document.getElementById('confirmationModal');
const detailsModal = document.getElementById('detailsModal');

// ================ INITIALIZATION ================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    showLoading();
    
    try {
        // Check API health
        await checkApiHealth();
        
        // Load initial data
        await Promise.all([
            loadDoctors(),
            loadAppointments(),
            loadStats()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('appointmentDate').min = today;
        document.getElementById('appointmentDate').value = today;
        
        // Update form summary on input change
        setupFormListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Hitilafu katika mfumo. Tafadhali jaribu tena baadaye.', 'error');
    } finally {
        hideLoading();
    }
}

// ================ API HEALTH CHECK ================
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            updateApiStatus('online');
            console.log('✅ API is connected');
        } else {
            updateApiStatus('offline');
            console.warn('⚠️ API is offline');
        }
    } catch (error) {
        updateApiStatus('offline');
        console.error('❌ API connection failed:', error);
    }
}

function updateApiStatus(status) {
    if (!apiStatusDot) return;
    
    apiStatusDot.className = 'dot';
    if (status === 'online') {
        apiStatusDot.classList.add('online');
        apiStatus.textContent = ' API Inatumika';
    } else {
        apiStatusDot.classList.add('offline');
        apiStatus.textContent = ' API Haipatikani';
    }
}

// ================ LOAD DOCTORS ================
async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE}/doctors`);
        if (response.ok) {
            const data = await response.json();
            doctors = data.data;
            populateDoctorsGrid();
            updateDoctorsCount();
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        // Fallback doctors
        doctors = [
            { id: 1, name: "Dr. John Mwamba", specialty: "General Medicine", department: "general" },
            { id: 2, name: "Dr. Sarah Chuma", specialty: "Pediatrics", department: "pediatrics" },
            { id: 3, name: "Dr. Robert Kimani", specialty: "Surgery", department: "surgery" },
            { id: 4, name: "Dr. Grace Mwenda", specialty: "Dentistry", department: "dental" },
            { id: 5, name: "Dr. David Omondi", specialty: "Eye Care", department: "eye" },
            { id: 6, name: "Dr. Mary Achieng", specialty: "Maternity", department: "maternity" }
        ];
        populateDoctorsGrid();
        updateDoctorsCount();
    }
}

function populateDoctorsGrid() {
    const doctorsGrid = document.getElementById('doctorsGrid');
    if (!doctorsGrid) return;
    
    doctorsGrid.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-image">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="doctor-info">
                <h3 class="doctor-name">${doctor.name}</h3>
                <p class="doctor-specialty">
                    <i class="fas fa-stethoscope"></i> ${doctor.specialty}
                </p>
                <p class="doctor-details">
                    <i class="fas fa-hospital"></i> ${doctor.department}<br>
                    <i class="fas fa-clock"></i> 8:00 AM - 5:00 PM<br>
                    <i class="fas ${doctor.available ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}"></i>
                    ${doctor.available ? 'Inapatikana' : 'Haipatikani'}
                </p>
                <div class="doctor-actions">
                    <button class="btn btn-primary" onclick="bookWithDoctor(${doctor.id})">
                        <i class="fas fa-calendar-plus"></i> Panga Miadi
                    </button>
                    <button class="btn btn-secondary" onclick="viewDoctor(${doctor.id})">
                        <i class="fas fa-eye"></i> Angalia
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateDoctorsCount() {
    const totalDoctors = document.getElementById('totalDoctors');
    const footerTotalDoctors = document.getElementById('footerTotalDoctors');
    
    if (totalDoctors) totalDoctors.textContent = doctors.length;
    if (footerTotalDoctors) footerTotalDoctors.textContent = doctors.length;
}

// ================ LOAD APPOINTMENTS ================
async function loadAppointments(searchPhone = '') {
    try {
        let url = `${API_BASE}/appointments`;
        if (searchPhone) {
            url = `${API_BASE}/appointments/search/${searchPhone}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            appointments = data.data;
            displayAppointments(appointments);
            updateAppointmentCounts();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        // Fallback to empty array
        appointments = [];
        displayAppointments([]);
        updateAppointmentCounts();
    }
}

function displayAppointments(appointmentsList) {
    const appointmentsTable = document.getElementById('appointmentsTable');
    const noAppointments = document.getElementById('noAppointments');
    
    if (!appointmentsTable || !noAppointments) return;
    
    if (appointmentsList.length === 0) {
        appointmentsTable.innerHTML = '';
        noAppointments.style.display = 'block';
        return;
    }
    
    noAppointments.style.display = 'none';
    
    appointmentsTable.innerHTML = appointmentsList.map((apt, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(apt.date)}</td>
            <td>${apt.time}</td>
            <td>
                <strong>${apt.patientName}</strong><br>
                <small>${apt.patientPhone}</small>
            </td>
            <td>${apt.doctorName}</td>
            <td>${getDepartmentName(apt.department)}</td>
            <td>
                <span class="status-badge status-${apt.status}">
                    ${getStatusText(apt.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view" onclick="viewAppointment('${apt.id}')" title="Angalia">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${apt.status === 'pending' ? `
                        <button class="action-btn btn-edit" onclick="confirmAppointment('${apt.id}')" title="Thibitisha">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn btn-cancel" onclick="cancelAppointment('${apt.id}')" title="Ghairi">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function updateAppointmentCounts() {
    const counts = {
        all: appointments.length,
        pending: appointments.filter(a => a.status === 'pending').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length
    };
    
    // Update filter buttons
    Object.keys(counts).forEach(status => {
        const element = document.getElementById(`count${status.charAt(0).toUpperCase() + status.slice(1)}`);
        if (element) {
            element.textContent = counts[status];
        }
    });
    
    // Update today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayCount = appointments.filter(a => a.date === today).length;
    const todayElement = document.getElementById('todayAppointments');
    const footerTodayElement = document.getElementById('footerTodayAppointments');
    
    if (todayElement) todayElement.textContent = todayCount;
    if (footerTodayElement) footerTodayElement.textContent = todayCount;
}

// ================ BOOKING FORM ================
function setupFormListeners() {
    const formInputs = bookingForm.querySelectorAll('input, select, textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('input', updateFormSummary);
        input.addEventListener('change', updateFormSummary);
    });
    
    // Department change - load doctors
    document.getElementById('department').addEventListener('change', function() {
        const department = this.value;
        const doctorSelect = document.getElementById('doctor');
        
        if (!department) {
            doctorSelect.innerHTML = '<option value="">Chagua daktari...</option>';
            doctorSelect.disabled = true;
            return;
        }
        
        // Filter doctors by department
        const filteredDoctors = doctors.filter(d => d.department === department && d.available);
        
        doctorSelect.innerHTML = '<option value="">Chagua daktari...</option>' +
            filteredDoctors.map(d => 
                `<option value="${d.id}">${d.name} - ${d.specialty}</option>`
            ).join('');
        
        doctorSelect.disabled = filteredDoctors.length === 0;
        
        if (filteredDoctors.length > 0) {
            doctorSelect.disabled = false;
        }
        
        updateFormSummary();
    });
    
    // Doctor change - load available time slots
    document.getElementById('doctor').addEventListener('change', async function() {
        const doctorId = this.value;
        const date = document.getElementById('appointmentDate').value;
        const timeSelect = document.getElementById('appointmentTime');
        
        if (!doctorId || !date) {
            timeSelect.innerHTML = '<option value="">Chagua muda...</option>';
            timeSelect.disabled = true;
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/availability/${doctorId}/${date}`);
            if (response.ok) {
                const data = await response.json();
                const slots = data.availableSlots;
                
                timeSelect.innerHTML = '<option value="">Chagua muda...</option>' +
                    slots.map(slot => `<option value="${slot}">${formatTime(slot)}</option>`).join('');
                
                timeSelect.disabled = slots.length === 0;
                
                // Also show visual time slots
                showTimeSlots(slots, data.bookedSlots);
            }
        } catch (error) {
            console.error('Error loading time slots:', error);
            timeSelect.innerHTML = '<option value="">Hitilafu katika kupata muda</option>';
            timeSelect.disabled = true;
        }
        
        updateFormSummary();
    });
    
    // Date change - trigger doctor change if doctor is selected
    document.getElementById('appointmentDate').addEventListener('change', function() {
        const doctorSelect = document.getElementById('doctor');
        if (doctorSelect.value) {
            doctorSelect.dispatchEvent(new Event('change'));
        }
        updateFormSummary();
    });
}

function showTimeSlots(availableSlots, bookedSlots) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (!timeSlotsContainer) return;
    
    timeSlotsContainer.innerHTML = '';
    
    const allSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
    
    allSlots.forEach(slot => {
        const isAvailable = availableSlots.includes(slot);
        const isBooked = bookedSlots.includes(slot);
        
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        slotElement.textContent = formatTime(slot);
        
        if (isBooked) {
            slotElement.classList.add('booked');
            slotElement.title = 'Imejaa';
        } else if (isAvailable) {
            slotElement.addEventListener('click', () => {
                document.getElementById('appointmentTime').value = slot;
                updateFormSummary();
                
                // Update visual selection
                timeSlotsContainer.querySelectorAll('.time-slot').forEach(s => {
                    s.classList.remove('selected');
                });
                slotElement.classList.add('selected');
            });
        } else {
            slotElement.classList.add('booked');
            slotElement.title = 'Haipatikani';
        }
        
        timeSlotsContainer.appendChild(slotElement);
    });
}

function updateFormSummary() {
    const formData = {
        name: document.getElementById('patientName').value,
        phone: document.getElementById('patientPhone').value,
        date: document.getElementById('appointmentDate').value,
        time: document.getElementById('appointmentTime').value,
        doctor: document.getElementById('doctor').value,
        department: document.getElementById('department').value
    };
    
    // Update summary elements
    document.getElementById('summaryName').textContent = formData.name || '-';
    document.getElementById('summaryPhone').textContent = formData.phone || '-';
    document.getElementById('summaryDate').textContent = formData.date ? formatDate(formData.date) : '-';
    document.getElementById('summaryTime').textContent = formData.time ? formatTime(formData.time) : '-';
    
    // Get doctor name
    const doctor = doctors.find(d => d.id == formData.doctor);
    document.getElementById('summaryDoctor').textContent = doctor ? doctor.name : '-';
    
    // Get department name
    document.getElementById('summaryDepartment').textContent = 
        formData.department ? getDepartmentName(formData.department) : '-';
}

// Handle form submission
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            patientName: document.getElementById('patientName').value.trim(),
            patientPhone: document.getElementById('patientPhone').value.trim(),
            patientEmail: document.getElementById('patientEmail').value.trim(),
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            doctorId: parseInt(document.getElementById('doctor').value),
            department: document.getElementById('department').value,
            symptoms: document.getElementById('symptoms').value.trim()
        };
        
        // Validation
        if (!formData.patientName || !formData.patientPhone || !formData.date || !formData.time || !formData.doctorId) {
            showMessage('Tafadhali jaza sehemu zote muhimu.', 'error');
            return;
        }
        
        // Phone validation
        const phoneRegex = /^0[67]\d{8}$/;
        if (!phoneRegex.test(formData.patientPhone)) {
            showMessage('Tafadhali ingiza namba halisi ya simu (07 au 06).', 'error');
            return;
        }
        
        // Email validation (if provided)
        if (formData.patientEmail && !isValidEmail(formData.patientEmail)) {
            showMessage('Tafadhali ingiza barua pepe sahihi.', 'error');
            return;
        }
        
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Show confirmation modal
                showConfirmation(data.data);
                
                // Reset form
                bookingForm.reset();
                
                // Reset date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('appointmentDate').value = today;
                
                // Reload appointments
                await loadAppointments();
                
                showMessage('Miadi imepangwa kikamilifu!', 'success');
            } else {
                showMessage(data.message || 'Hitilafu katika kupanga miadi.', 'error');
            }
        } catch (error) {
            console.error('Booking error:', error);
            showMessage('Hitilafu ya mtandao. Tafadhali jaribu tena.', 'error');
        } finally {
            hideLoading();
        }
    });
}

// ================ APPOINTMENT ACTIONS ================
async function viewAppointment(id) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}`);
        if (response.ok) {
            const data = await response.json();
            showAppointmentDetails(data.data);
        }
    } catch (error) {
        console.error('Error viewing appointment:', error);
        showMessage('Hitilafu katika kuona maelezo ya miadi.', 'error');
    }
}

async function confirmAppointment(id) {
    if (!confirm('Una uhakika unataka kuthibitisha miadi hii?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (response.ok) {
            await loadAppointments();
            showMessage('Miadi imethibitishwa.', 'success');
        }
    } catch (error) {
        console.error('Error confirming appointment:', error);
        showMessage('Hitilafu katika kuthibitisha miadi.', 'error');
    }
}

async function cancelAppointment(id) {
    if (!confirm('Una uhakika unataka kughairi miadi hii?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (response.ok) {
            await loadAppointments();
            showMessage('Miadi imeghairiwa.', 'success');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showMessage('Hitilafu katika kughairi miadi.', 'error');
    }
}

async function deleteAppointment(id) {
    if (!confirm('Una uhakika unataka kufuta miadi hii kabisa?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadAppointments();
            showMessage('Miadi imefutwa.', 'success');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showMessage('Hitilafu katika kufuta miadi.', 'error');
    }
}

// ================ MODAL FUNCTIONS ================
function showConfirmation(appointment) {
    currentAppointmentId = appointment.id;
    
    document.getElementById('modalAppointmentId').textContent = appointment.id;
    document.getElementById('modalPatientName').textContent = appointment.patientName;
    document.getElementById('modalDoctorName').textContent = appointment.doctorName;
    document.getElementById('modalDateTime').textContent = 
        `${formatDate(appointment.date)} saa ${formatTime(appointment.time)}`;
    
    confirmationModal.style.display = 'flex';
}

function closeModal() {
    confirmationModal.style.display = 'none';
    currentAppointmentId = null;
}

function printConfirmation() {
    const printContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="text-align: center; color: #2563eb;">🏥 Hospitali Ya Jamii</h2>
            <h3 style="text-align: center;">Tiketi ya Miadi</h3>
            <hr>
            <table style="width: 100%; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Namba ya Miadi:</td>
                    <td style="padding: 10px;">${document.getElementById('modalAppointmentId').textContent}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Mgonjwa:</td>
                    <td style="padding: 10px;">${document.getElementById('modalPatientName').textContent}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Daktari:</td>
                    <td style="padding: 10px;">${document.getElementById('modalDoctorName').textContent}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Tarehe na Muda:</td>
                    <td style="padding: 10px;">${document.getElementById('modalDateTime').textContent}</td>
                </tr>
            </table>
            <hr>
            <p style="text-align: center; font-size: 12px; color: #666;">
                Tiketi hii imetoka Hospitali Ya Jamii<br>
                Tafadhali wasili dakika 15 mapema<br>
                Simu: 0712 345 678
            </p>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function shareAppointment() {
    const appointmentDetails = `
🏥 Hospitali Ya Jamii - Tiketi ya Miadi
────────────────────
Namba ya Miadi: ${document.getElementById('modalAppointmentId').textContent}
Mgonjwa: ${document.getElementById('modalPatientName').textContent}
Daktari: ${document.getElementById('modalDoctorName').textContent}
Tarehe na Muda: ${document.getElementById('modalDateTime').textContent}
────────────────────
Tafadhali wasili dakika 15 mapema
Simu: 0712 345 678
    `;
    
    if (navigator.share) {
        navigator.share({
            title: 'Tiketi ya Miadi - Hospitali Ya Jamii',
            text: appointmentDetails,
            url: window.location.href
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(appointmentDetails).then(() => {
            alert('Maelezo ya miadi yamepangwa kwenye clipboard!');
        });
    }
}

function showAppointmentDetails(appointment) {
    const detailsContainer = document.getElementById('appointmentDetails');
    
    detailsContainer.innerHTML = `
        <div class="confirmation-details">
            <div class="detail-item">
                <span class="label">Namba ya Miadi:</span>
                <span class="value">${appointment.id}</span>
            </div>
            <div class="detail-item">
                <span class="label">Jina la Mgonjwa:</span>
                <span class="value">${appointment.patientName}</span>
            </div>
            <div class="detail-item">
                <span class="label">Namba ya Simu:</span>
                <span class="value">${appointment.patientPhone}</span>
            </div>
            ${appointment.patientEmail ? `
            <div class="detail-item">
                <span class="label">Barua Pepe:</span>
                <span class="value">${appointment.patientEmail}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="label">Daktari:</span>
                <span class="value">${appointment.doctorName}</span>
            </div>
            <div class="detail-item">
                <span class="label">Idara:</span>
                <span class="value">${getDepartmentName(appointment.department)}</span>
            </div>
            <div class="detail-item">
                <span class="label">Tarehe:</span>
                <span class="value">${formatDate(appointment.date)}</span>
            </div>
            <div class="detail-item">
                <span class="label">Muda:</span>
                <span class="value">${formatTime(appointment.time)}</span>
            </div>
            <div class="detail-item">
                <span class="label">Hali:</span>
                <span class="value">
                    <span class="status-badge status-${appointment.status}">
                        ${getStatusText(appointment.status)}
                    </span>
                </span>
            </div>
            ${appointment.symptoms ? `
            <div class="detail-item">
                <span class="label">Dalili/Maelezo:</span>
                <span class="value">${appointment.symptoms}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="label">Iliyopangwa:</span>
                <span class="value">${formatDateTime(appointment.createdAt)}</span>
            </div>
            ${appointment.updatedAt !== appointment.createdAt ? `
            <div class="detail-item">
                <span class="label">Iliyorekebishwa:</span>
                <span class="value">${formatDateTime(appointment.updatedAt)}</span>
            </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            ${appointment.status === 'pending' ? `
            <button class="btn btn-success" onclick="confirmAppointment('${appointment.id}'); closeDetailsModal();">
                <i class="fas fa-check"></i> Thibitisha
            </button>
            <button class="btn btn-danger" onclick="cancelAppointment('${appointment.id}'); closeDetailsModal();">
                <i class="fas fa-times"></i> Ghairi
            </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="closeDetailsModal()">
                <i class="fas fa-times"></i> Funga
            </button>
        </div>
    `;
    
    detailsModal.style.display = 'flex';
}

function closeDetailsModal() {
    detailsModal.style.display = 'none';
}

// ================ HELPER FUNCTIONS ================
function setupEventListeners() {
    // Search appointments
    if (searchAppointments) {
        searchAppointments.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
                loadAppointments(searchTerm);
            }
        });
    }
    
    // Filter appointments by status
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.dataset.status;
            
            // Update active filter
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter appointments
            let filteredAppointments = appointments;
            if (status !== 'all') {
                filteredAppointments = appointments.filter(a => a.status === status);
            }
            
            displayAppointments(filteredAppointments);
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            closeModal();
        }
        if (e.target === detailsModal) {
            closeDetailsModal();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDetailsModal();
        }
    });
    
    // Mobile menu toggle
    window.toggleMenu = function() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    };
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('formMessage');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (response.ok) {
            const data = await response.json();
            updateFooterStats(data.data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateFooterStats(stats) {
    const footerTotalPatients = document.getElementById('footerTotalPatients');
    if (footerTotalPatients) {
        footerTotalPatients.textContent = stats.totalPatients;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('sw-TZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('sw-TZ');
}

function getDepartmentName(departmentCode) {
    const departments = {
        'general': 'Matibabu ya Jumla',
        'pediatrics': 'Watoto',
        'surgery': 'Upasuaji',
        'dental': 'Menyo',
        'eye': 'Macho',
        'maternity': 'Ujauzito'
    };
    return departments[departmentCode] || departmentCode;
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Inasubiri',
        'confirmed': 'Imethibitishwa',
        'completed': 'Imekamilika',
        'cancelled': 'Imesitishwa'
    };
    return statusTexts[status] || status;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Quick appointment with doctor
function bookWithDoctor(doctorId) {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return;
    
    document.getElementById('department').value = doctor.department;
    document.getElementById('department').dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        document.getElementById('doctor').value = doctorId;
        document.getElementById('doctor').dispatchEvent(new Event('change'));
    }, 100);
    
    // Scroll to booking section
    document.querySelector('#book').scrollIntoView({ behavior: 'smooth' });
    
    showMessage(`Umechagua ${doctor.name}. Tafadhali kamilisha fomu.`, 'success');
}

function viewDoctor(doctorId) {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return;
    
    alert(`
        MAELEZO YA DAKTARI:
        ===================
        Jina: ${doctor.name}
        Utaalamu: ${doctor.specialty}
        Idara: ${getDepartmentName(doctor.department)}
        Hali: ${doctor.available ? 'Inapatikana' : 'Haipatikani'}
        ===================
        ${doctor.available ? 
            'Bonyeza "Panga Miadi" kuendesha kukodisha.' : 
            'Daktari huyu hayupo kwa sasa. Tafadhali chagua mwingine.'
        }
    `);
}

// Auto-refresh appointments every 30 seconds
setInterval(() => {
    loadAppointments();
    checkApiHealth();
}, 30000);

// Export functions for global access
window.bookWithDoctor = bookWithDoctor;
window.viewDoctor = viewDoctor;
window.viewAppointment = viewAppointment;
window.confirmAppointment = confirmAppointment;
window.cancelAppointment = cancelAppointment;
window.deleteAppointment = deleteAppointment;
window.closeModal = closeModal;
window.closeDetailsModal = closeDetailsModal;
window.printConfirmation = printConfirmation;
window.shareAppointment = shareAppointment;
window.toggleMenu = toggleMenu;
window.loadAppointments = loadAppointments;
