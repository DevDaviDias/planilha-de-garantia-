// Firebase Configuration
const firebaseConfig = {
    // Replace with your Firebase config
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase (you'll need to include Firebase SDK in your HTML)
// import { initializeApp } from 'firebase/app';
// import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
// import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// For demo purposes, we'll use localStorage as a fallback
class FirebaseService {
    constructor() {
        this.useLocalStorage = true; // Set to false when Firebase is configured
        this.storageKey = 'clientsData';
        this.archiveKey = 'archivedData';
        this.lastCheckKey = 'lastMonthCheck';
        
        // Check for automatic month closure on initialization
        this.checkAutoMonthClosure();
    }

    // Initialize Firebase (uncomment when you have Firebase config)
    /*
    init() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app);
        this.useLocalStorage = false;
    }
    */

    // Check if we need to automatically close the month
    async checkAutoMonthClosure() {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
        const lastCheck = localStorage.getItem(this.lastCheckKey);
        
        // If it's a new month and we haven't checked yet
        if (lastCheck !== currentMonth) {
            const clients = await this.getClients();
            
            // Only auto-close if there's data from the previous month
            if (clients.length > 0) {
                const hasCurrentMonthData = clients.some(client => 
                    client.serviceDate.startsWith(currentMonth)
                );
                
                // If no data from current month, it means all data is from previous month(s)
                if (!hasCurrentMonthData) {
                    await this.autoCloseMonth();
                }
            }
            
            // Update last check date
            localStorage.setItem(this.lastCheckKey, currentMonth);
        }
    }

    // Automatic month closure
    async autoCloseMonth() {
        try {
            const clients = await this.getClients();
            if (clients.length === 0) return;

            const archived = JSON.parse(localStorage.getItem(this.archiveKey) || '[]');
            
            // Get the most recent month from the data
            const dates = clients.map(client => client.serviceDate).sort();
            const lastMonth = dates[dates.length - 1].slice(0, 7);
            
            const monthData = {
                month: lastMonth,
                data: clients,
                closedAt: new Date().toISOString(),
                autoClose: true // Flag to indicate this was an automatic closure
            };
            
            archived.push(monthData);
            localStorage.setItem(this.archiveKey, JSON.stringify(archived));
            localStorage.removeItem(this.storageKey);
            
            // Show notification to user
            this.showAutoCloseNotification(lastMonth);
            
            return monthData;
        } catch (error) {
            console.error('Error in auto month closure:', error);
        }
    }

    // Show notification for auto closure
    showAutoCloseNotification(month) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'auto-close-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">📅</div>
                <div class="notification-text">
                    <strong>Mês Fechado Automaticamente</strong>
                    <p>Os dados de ${this.formatMonth(month)} foram arquivados automaticamente.</p>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add notification styles if not already added
        if (!document.getElementById('autoCloseStyles')) {
            const styles = document.createElement('style');
            styles.id = 'autoCloseStyles';
            styles.textContent = `
                .auto-close-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #059669;
                    color: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    z-index: 1001;
                    max-width: 350px;
                    animation: slideIn 0.3s ease-out;
                }
                
                .notification-content {
                    display: flex;
                    align-items: flex-start;
                    padding: 16px;
                    gap: 12px;
                }
                
                .notification-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }
                
                .notification-text strong {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 14px;
                }
                
                .notification-text p {
                    margin: 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                }
                
                .notification-close:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 640px) {
                    .auto-close-notification {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // Format month for display
    formatMonth(monthString) {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('pt-BR', { 
            year: 'numeric', 
            month: 'long' 
        }).replace(/^\w/, c => c.toUpperCase());
    }

    // Get all clients
    async getClients() {
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        }
        
        // Firebase implementation
        /*
        const querySnapshot = await getDocs(collection(this.db, 'clients'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        */
    }

    // Add new client
    async addClient(clientData) {
        if (this.useLocalStorage) {
            const clients = await this.getClients();
            const newClient = {
                id: Date.now().toString(),
                ...clientData,
                createdAt: new Date().toISOString()
            };
            clients.push(newClient);
            localStorage.setItem(this.storageKey, JSON.stringify(clients));
            return newClient.id;
        }

        // Firebase implementation
        /*
        const docRef = await addDoc(collection(this.db, 'clients'), {
            ...clientData,
            createdAt: new Date()
        });
        return docRef.id;
        */
    }

    // Update client
    async updateClient(id, clientData) {
        if (this.useLocalStorage) {
            const clients = await this.getClients();
            const index = clients.findIndex(client => client.id === id);
            if (index !== -1) {
                clients[index] = { ...clients[index], ...clientData, updatedAt: new Date().toISOString() };
                localStorage.setItem(this.storageKey, JSON.stringify(clients));
                return true;
            }
            return false;
        }

        // Firebase implementation
        /*
        await updateDoc(doc(this.db, 'clients', id), {
            ...clientData,
            updatedAt: new Date()
        });
        return true;
        */
    }

    // Delete client
    async deleteClient(id) {
        if (this.useLocalStorage) {
            const clients = await this.getClients();
            const filteredClients = clients.filter(client => client.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filteredClients));
            return true;
        }

        // Firebase implementation
        /*
        await deleteDoc(doc(this.db, 'clients', id));
        return true;
        */
    }

    // Upload photo
    async uploadPhoto(file) {
        if (this.useLocalStorage) {
            // Convert to base64 for localStorage demo
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // Firebase Storage implementation
        /*
        const storageRef = ref(this.storage, `photos/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
        */
    }

    // Manual month closure (from UI)
    async closeMonth() {
        if (this.useLocalStorage) {
            const clients = await this.getClients();
            const archived = JSON.parse(localStorage.getItem(this.archiveKey) || '[]');
            
            const monthData = {
                month: new Date().toISOString().slice(0, 7), // YYYY-MM format
                data: clients,
                closedAt: new Date().toISOString(),
                autoClose: false // Manual closure
            };
            
            archived.push(monthData);
            localStorage.setItem(this.archiveKey, JSON.stringify(archived));
            localStorage.removeItem(this.storageKey);
            
            return monthData;
        }

        // Firebase implementation would move data to an archive collection
    }

    // Get archived data
    async getArchivedData() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem(this.archiveKey) || '[]');
        }
    }

    // Force check for month closure (useful for testing)
    async forceMonthCheck() {
        localStorage.removeItem(this.lastCheckKey);
        await this.checkAutoMonthClosure();
    }
}

// Initialize Firebase service
const firebaseService = new FirebaseService();

// Utility functions
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
};

const showMessage = (elementId, message, isError = false) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
};

const showLoading = (buttonId, show = true) => {
    const button = document.getElementById(buttonId);
    const text = document.getElementById('submitText');
    const spinner = document.getElementById('loadingSpinner');
    
    if (button && text && spinner) {
        button.disabled = show;
        text.style.display = show ? 'none' : 'inline';
        spinner.style.display = show ? 'inline-block' : 'none';
    }
};

// Page-specific functionality
const initIndexPage = () => {
    const form = document.getElementById('clientForm');
    const addPartBtn = document.getElementById('addPart');
    const partsContainer = document.getElementById('partsContainer');
    const photoInput = document.getElementById('servicePhoto');
    const photoPreview = document.getElementById('photoPreview');

    // Add part functionality
    addPartBtn?.addEventListener('click', () => {
        const partItem = document.createElement('div');
        partItem.className = 'part-item';
        partItem.innerHTML = `
            <input type="text" placeholder="Nome da peça" class="part-name">
            <input type="number" placeholder="Custo (R$)" class="part-cost" step="0.01" min="0">
            <button type="button" class="btn-remove-part">❌</button>
        `;
        
        const removeBtn = partItem.querySelector('.btn-remove-part');
        removeBtn.addEventListener('click', () => partItem.remove());
        
        partsContainer.appendChild(partItem);
    });

    // Remove part functionality for existing parts
    partsContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-part')) {
            e.target.parentElement.remove();
        }
    });

    // Photo preview
    photoInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Form submission
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        showLoading('submitBtn', true);

        try {
            const formData = new FormData(form);
            
            // Collect parts data
            const partItems = partsContainer.querySelectorAll('.part-item');
            const parts = [];
            partItems.forEach(item => {
                const name = item.querySelector('.part-name').value.trim();
                const cost = parseFloat(item.querySelector('.part-cost').value) || 0;
                if (name) {
                    parts.push({ name, cost });
                }
            });

            // Upload photo if exists
            let photoURL = null;
            const photoFile = photoInput.files[0];
            if (photoFile) {
                photoURL = await firebaseService.uploadPhoto(photoFile);
            }

            // Prepare client data
            const clientData = {
                clientName: formData.get('clientName'),
                serviceDate: formData.get('serviceDate'),
                warranty: parseInt(formData.get('warranty')),
                serviceValue: parseFloat(formData.get('serviceValue')),
                paymentStatus: formData.get('paymentStatus'),
                parts: parts,
                observations: formData.get('observations'),
                photoURL: photoURL
            };

            // Save to database
            await firebaseService.addClient(clientData);

            // Show success message and reset form
            showMessage('successMessage', '✅ Cliente cadastrado com sucesso!');
            form.reset();
            photoPreview.innerHTML = '';
            
            // Reset parts to just one empty item
            partsContainer.innerHTML = `
                <div class="part-item">
                    <input type="text" placeholder="Nome da peça" class="part-name">
                    <input type="number" placeholder="Custo (R$)" class="part-cost" step="0.01" min="0">
                    <button type="button" class="btn-remove-part">❌</button>
                </div>
            `;

        } catch (error) {
            console.error('Error saving client:', error);
            showMessage('errorMessage', '❌ Erro ao cadastrar cliente. Tente novamente.', true);
        } finally {
            showLoading('submitBtn', false);
        }
    });
};

const initClientesPage = () => {
    const clientsContainer = document.getElementById('clientsContainer');
    const loadingClients = document.getElementById('loadingClients');
    const noClients = document.getElementById('noClients');
    const searchInput = document.getElementById('searchInput');
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const editForm = document.getElementById('editForm');

    let allClients = [];
    let currentEditId = null;
    let currentDeleteId = null;

    // Load and display clients
    const loadClients = async () => {
        try {
            loadingClients.style.display = 'flex';
            clientsContainer.style.display = 'none';
            noClients.style.display = 'none';

            allClients = await firebaseService.getClients();
            
            if (allClients.length === 0) {
                loadingClients.style.display = 'none';
                noClients.style.display = 'block';
                return;
            }

            displayClients(allClients);
            
        } catch (error) {
            console.error('Error loading clients:', error);
            loadingClients.style.display = 'none';
            noClients.style.display = 'block';
        }
    };

    // Display clients
    const displayClients = (clients) => {
        loadingClients.style.display = 'none';
        clientsContainer.style.display = 'grid';
        
        clientsContainer.innerHTML = clients.map(client => `
            <div class="client-card">
                ${client.photoURL ? `<img src="${client.photoURL}" alt="Foto do serviço" class="client-photo">` : '<div class="client-photo" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #9ca3af;">📷 Sem foto</div>'}
                
                <div class="client-info">
                    <h3 class="client-name">${client.clientName}</h3>
                    
                    <div class="client-details">
                        <div class="detail-item">
                            <span class="detail-label">Data:</span>
                            <span class="detail-value">${formatDate(client.serviceDate)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Garantia:</span>
                            <span class="detail-value">${client.warranty} meses</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor:</span>
                            <span class="detail-value">${formatCurrency(client.serviceValue)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pagamento:</span>
                            <span class="detail-value">
                                <span class="status-badge status-${client.paymentStatus}">
                                    ${client.paymentStatus === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                                </span>
                            </span>
                        </div>
                    </div>

                    ${client.parts && client.parts.length > 0 ? `
                        <div class="parts-list">
                            <div class="parts-title">🔧 Peças utilizadas:</div>
                            ${client.parts.map(part => `
                                <div class="part-item-display">
                                    <span>${part.name}</span>
                                    <span>${formatCurrency(part.cost)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${client.observations ? `
                        <div class="parts-list">
                            <div class="parts-title">📝 Observações:</div>
                            <p style="font-size: 0.875rem; color: var(--text-secondary);">${client.observations}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="client-actions">
                    <button class="btn-edit" onclick="editClient('${client.id}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="deleteClient('${client.id}')">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    };

    // Search functionality
    searchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredClients = allClients.filter(client => 
            client.clientName.toLowerCase().includes(searchTerm) ||
            client.observations?.toLowerCase().includes(searchTerm)
        );
        displayClients(filteredClients);
    });

    // Edit client
    window.editClient = (id) => {
        const client = allClients.find(c => c.id === id);
        if (!client) return;

        currentEditId = id;
        
        document.getElementById('editClientId').value = id;
        document.getElementById('editClientName').value = client.clientName;
        document.getElementById('editServiceDate').value = client.serviceDate;
        document.getElementById('editWarranty').value = client.warranty;
        document.getElementById('editServiceValue').value = client.serviceValue;
        document.getElementById('editPaymentStatus').value = client.paymentStatus;
        document.getElementById('editObservations').value = client.observations || '';

        editModal.style.display = 'flex';
    };

    // Delete client
    window.deleteClient = (id) => {
        currentDeleteId = id;
        deleteModal.style.display = 'flex';
    };

    // Modal event listeners
    document.querySelector('.modal-close')?.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    document.querySelector('.modal-cancel')?.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    document.getElementById('cancelDelete')?.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    document.getElementById('confirmDelete')?.addEventListener('click', async () => {
        if (currentDeleteId) {
            try {
                await firebaseService.deleteClient(currentDeleteId);
                deleteModal.style.display = 'none';
                loadClients(); // Reload clients
            } catch (error) {
                console.error('Error deleting client:', error);
                alert('Erro ao excluir cliente. Tente novamente.');
            }
        }
    });

    // Edit form submission
    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentEditId) return;

        try {
            const formData = new FormData(editForm);
            const clientData = {
                clientName: formData.get('clientName') || document.getElementById('editClientName').value,
                serviceDate: formData.get('serviceDate') || document.getElementById('editServiceDate').value,
                warranty: parseInt(formData.get('warranty') || document.getElementById('editWarranty').value),
                serviceValue: parseFloat(formData.get('serviceValue') || document.getElementById('editServiceValue').value),
                paymentStatus: formData.get('paymentStatus') || document.getElementById('editPaymentStatus').value,
                observations: formData.get('observations') || document.getElementById('editObservations').value
            };

            await firebaseService.updateClient(currentEditId, clientData);
            editModal.style.display = 'none';
            loadClients(); // Reload clients
            
        } catch (error) {
            console.error('Error updating client:', error);
            alert('Erro ao atualizar cliente. Tente novamente.');
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });

    // Load clients on page load
    loadClients();
};

const initRelatoriosPage = () => {
    const loadingReports = document.getElementById('loadingReports');
    const reportsContainer = document.getElementById('reportsContainer');
    const noData = document.getElementById('noData');
    const monthSelect = document.getElementById('monthSelect');
    const closeMonthModal = document.getElementById('closeMonthModal');

    let currentClients = [];

    // Initialize month selector
    const initMonthSelector = () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Generate last 12 months
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const monthValue = date.toISOString().slice(0, 7);
            const monthText = date.toLocaleDateString('pt-BR', { 
                year: 'numeric', 
                month: 'long' 
            });
            
            const option = document.createElement('option');
            option.value = monthValue;
            option.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);
            if (i === 0) option.selected = true;
            
            monthSelect.appendChild(option);
        }
    };

    // Load and calculate reports
    const loadReports = async () => {
        try {
            loadingReports.style.display = 'flex';
            reportsContainer.style.display = 'none';
            noData.style.display = 'none';

            currentClients = await firebaseService.getClients();
            
            if (currentClients.length === 0) {
                loadingReports.style.display = 'none';
                noData.style.display = 'block';
                return;
            }

            calculateReports(currentClients);
            
        } catch (error) {
            console.error('Error loading reports:', error);
            loadingReports.style.display = 'none';
            noData.style.display = 'block';
        }
    };

    // Calculate reports
    const calculateReports = (clients) => {
        const selectedMonth = monthSelect.value;
        
        // Filter clients by selected month
        const monthClients = clients.filter(client => 
            client.serviceDate.startsWith(selectedMonth)
        );

        if (monthClients.length === 0) {
            loadingReports.style.display = 'none';
            noData.style.display = 'block';
            return;
        }

        // Calculate metrics
        const paidClients = monthClients.filter(client => client.paymentStatus === 'pago');
        const unpaidClients = monthClients.filter(client => client.paymentStatus === 'nao-pago');
        
        const grossRevenue = paidClients.reduce((sum, client) => sum + client.serviceValue, 0);
        const unpaidValue = unpaidClients.reduce((sum, client) => sum + client.serviceValue, 0);
        
        const allParts = monthClients.flatMap(client => client.parts || []);
        const partsCost = allParts.reduce((sum, part) => sum + part.cost, 0);
        
        const netProfit = grossRevenue - partsCost;
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        // Update UI
        document.getElementById('grossRevenue').textContent = formatCurrency(grossRevenue);
        document.getElementById('paidServices').textContent = `${paidClients.length} serviços pagos`;
        
        document.getElementById('partsCost').textContent = formatCurrency(partsCost);
        document.getElementById('totalParts').textContent = `${allParts.length} peças utilizadas`;
        
        document.getElementById('netProfit').textContent = formatCurrency(netProfit);
        document.getElementById('profitMargin').textContent = `${profitMargin.toFixed(1)}% de margem`;
        
        document.getElementById('totalClients').textContent = monthClients.length;
        document.getElementById('paidCount').textContent = paidClients.length;
        document.getElementById('unpaidCount').textContent = unpaidClients.length;
        document.getElementById('unpaidValue').textContent = formatCurrency(unpaidValue);

        loadingReports.style.display = 'none';
        reportsContainer.style.display = 'grid';
    };

    // Export data
    document.getElementById('exportData')?.addEventListener('click', async () => {
        try {
            const clients = await firebaseService.getClients();
            const dataStr = JSON.stringify(clients, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `clientes_${new Date().toISOString().slice(0, 7)}.json`;
            link.click();
            
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Erro ao exportar dados. Tente novamente.');
        }
    });

    // Close month
    document.getElementById('closeMonth')?.addEventListener('click', () => {
        closeMonthModal.style.display = 'flex';
    });

    document.getElementById('cancelCloseMonth')?.addEventListener('click', () => {
        closeMonthModal.style.display = 'none';
    });

    document.getElementById('confirmCloseMonth')?.addEventListener('click', async () => {
        try {
            const archivedData = await firebaseService.closeMonth();
            
            // Export archived data
            const dataStr = JSON.stringify(archivedData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `mes_fechado_${archivedData.month}.json`;
            link.click();
            
            closeMonthModal.style.display = 'none';
            
            // Reload reports
            loadReports();
            
            alert('✅ Mês fechado com sucesso! Os dados foram exportados e arquivados.');
            
        } catch (error) {
            console.error('Error closing month:', error);
            alert('Erro ao fechar mês. Tente novamente.');
        }
    });

    // Month selector change
    monthSelect?.addEventListener('change', () => {
        if (currentClients.length > 0) {
            calculateReports(currentClients);
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === closeMonthModal) {
            closeMonthModal.style.display = 'none';
        }
    });

    // Initialize
    initMonthSelector();
    loadReports();
};

// Global function to test auto month closure (for development/testing)
window.testAutoMonthClosure = async () => {
    await firebaseService.forceMonthCheck();
};

// Initialize page based on current URL
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'index.html':
        case '':
            initIndexPage();
            break;
        case 'clientes.html':
            initClientesPage();
            break;
        case 'relatorios.html':
            initRelatoriosPage();
            break;
    }
    
    // Set up periodic check for month closure (every hour)
    setInterval(() => {
        firebaseService.checkAutoMonthClosure();
    }, 60 * 60 * 1000); // 1 hour
});