// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyADVCKIuC_bY3JyU9t4ENQDetkBtL8b1hc",
    authDomain: "sathi-6c556.firebaseapp.com",
    projectId: "sathi-6c556",
    databaseURL: "https://sathi-6c556-default-rtdb.firebaseio.com/",
    storageBucket: "sathi-6c556.firebasestorage.app",
    messagingSenderId: "560385393645",
    appId: "1:560385393645:web:b924700f4671efccd2dde4"
};

// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: 'dhoqwv6yp',
    uploadPreset: 'Sathi101' // Create unsigned upload preset in Cloudinary
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let currentUser = null;
let userData = null;
let adminPassword = "null"; // Change this to a more secure password in production

// DOM elements
const authSection = document.getElementById('authSection');
const navBar = document.getElementById('navBar');
const containers = document.querySelectorAll('.container');
const loader = document.getElementById('loader');
const successPopup = document.getElementById('successPopup');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('hondaUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        checkUserExists(currentUser.username);
    }
    
    // Set up event listeners
    hamburgerBtn.addEventListener('click', toggleMobileNav);
});




// Get reference code from URL if available
const urlParams = new URLSearchParams(window.location.search);
const referralCodeFromURL = urlParams.get('ref') || "";

// Authentication functions
function registerLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const refCodeInput = document.getElementById('refCode').value.trim();
    const refCode = refCodeInput || referralCodeFromURL;

    if (!username || !password) {
        showPopup('Username and password are required');
        return;
    }

    showLoader();

    // Check if user exists
    database.ref('users/' + username).once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Login
            const user = snapshot.val();
            if (user.password === password) {
                loginUser(user);
            } else {
                hideLoader();
                showPopup('Invalid password');
            }
        } else {
            // Register new user
            const newUser = {
                username: username,
                password: password,
                balance: 5, // Registration bonus
                refEarnings: 0,
                refCode: generateRefCode(),
                referredBy: refCode || null,
                transactions: [],
                plans: [],
                createdAt: new Date().toISOString()
            };

            // Save user to database
            database.ref('users/' + username).set(newUser)
                .then(() => {
                    // If referred by someone, update their referral earnings
                    if (refCode) {
                        updateReferralBonus(refCode, 5);
                    }

                    loginUser(newUser);
                })
                .catch(error => {
                    hideLoader();
                    showPopup('Registration failed: ' + error.message);
                });
        }
    }).catch(error => {
        hideLoader();
        showPopup('Error: ' + error.message);
    });
}

function loginUser(user) {
    currentUser = user;
    localStorage.setItem('hondaUser', JSON.stringify(user));

    // Update UI
    authSection.style.display = 'none';
    navBar.classList.remove('hidden');
    showSection('dashboard');
    updateDashboard();
    hideLoader();

    showPopup('Login successful!');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('hondaUser');

    // Update UI
    authSection.style.display = 'block';
    navBar.classList.add('hidden');
    containers.forEach(container => container.style.display = 'none');

    // Clear form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('refCode').value = '';

    showPopup('Logged out successfully');
}

function checkUserExists(username) {
    showLoader();
    database.ref('users/' + username).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const user = snapshot.val();
            loginUser(user);
        } else {
            // User data doesn't match local storage
            localStorage.removeItem('hondaUser');
            currentUser = null;
            hideLoader();
        }
    }).catch(error => {
        hideLoader();
        showPopup('Error checking user: ' + error.message);
    });
}

// Navigation functions
function showSection(sectionId) {
    containers.forEach(container => {
        container.style.display = 'none';
    });

    document.getElementById(sectionId).style.display = 'block';

    // Update specific sections if needed
    if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'me') {
        document.getElementById('displayUsername').textContent = currentUser.username;
    } else if (sectionId === 'admin') {
        document.getElementById('adminContent').classList.add('hidden');
    }

    // Close mobile nav if open
    mobileNav.classList.remove('show');
}

function toggleMobileNav() {
    mobileNav.classList.toggle('show');
}

// Dashboard functions
function updateDashboard() {
    if (!currentUser) return;

    // Update balance and referral earnings
    document.getElementById('userBalance').textContent = currentUser.balance;
    document.getElementById('refEarnings').textContent = currentUser.refEarnings;

    // Update referral link
    const refLink = window.location.href.split('?')[0] + '?ref=' + currentUser.refCode;
    document.getElementById('refLink').value = refLink;

    // Update transactions
    updateTransactionList();
}

function copyReferralLink() {
    const refLink = document.getElementById('refLink');
    refLink.select();
    refLink.setSelectionRange(0, 99999); // For mobile compatibility
    navigator.clipboard.writeText(refLink.value).then(() => {
        showPopup('Referral link copied!');
    }).catch(err => {
        showPopup('Copy failed: ' + err);
    });
}

// Utility to generate a simple referral code
function generateRefCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Dummy function to simulate referral bonus
function updateReferralBonus(refCode, amount) {
    // Search all users for matching refCode
    database.ref('users').once('value', snapshot => {
        snapshot.forEach(child => {
            const user = child.val();
            if (user.refCode === refCode) {
                const newEarnings = (user.refEarnings || 0) + amount;
                database.ref('users/' + user.username + '/refEarnings').set(newEarnings);
            }
        });
    });
}




function updateTransactionList() {
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    
    if (!currentUser.transactions || currentUser.transactions.length === 0) {
        transactionList.innerHTML = '<li>No transactions yet</li>';
        return;
    }
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...currentUser.transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid #eee';
        
        let amountClass = '';
        if (transaction.type === 'deposit' || transaction.type === 'profit' || transaction.type === 'referral') {
            amountClass = 'style="color: green;"';
        } else if (transaction.type === 'withdrawal') {
            amountClass = 'style="color: red;"';
        }
        
        li.innerHTML = `
            <strong>${formatTransactionType(transaction.type)}</strong>: 
            <span ${amountClass}>${transaction.amount} PKR</span> - 
            ${formatDate(transaction.date)}
            ${transaction.status ? `(${transaction.status})` : ''}
        `;
        transactionList.appendChild(li);
    });
}

function formatTransactionType(type) {
    const types = {
        'deposit': 'Deposit',
        'withdrawal': 'Withdrawal',
        'profit': 'Daily Profit',
        'referral': 'Referral Bonus',
        'investment': 'Investment'
    };
    return types[type] || type;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Plan functions
function buyPlan(planId, amount, dailyProfit) {
    if (!currentUser) return;
    
    if (currentUser.balance < amount) {
        showPopup('Insufficient balance for this plan');
        return;
    }
    
    // Check if user already has this plan
    if (currentUser.plans && currentUser.plans.some(p => p.planId === planId && !p.completed)) {
        showPopup('You already have this active plan');
        return;
    }
    
    showLoader();
    
    // Deduct amount from balance
    const newBalance = currentUser.balance - amount;
    
    // Create plan object
    const plan = {
        planId: planId,
        amount: amount,
        dailyProfit: dailyProfit,
        startDate: new Date().toISOString(),
        completed: false,
        daysCompleted: 0
    };
    
    // Create transaction
    const transaction = {
        type: 'investment',
        amount: amount,
        date: new Date().toISOString(),
        planId: planId,
        status: 'completed'
    };
    
    // Update user data
    const updates = {};
    updates['/users/' + currentUser.username + '/balance'] = newBalance;
    updates['/users/' + currentUser.username + '/plans'] = [...(currentUser.plans || []), plan];
    updates['/users/' + currentUser.username + '/transactions'] = [...(currentUser.transactions || []), transaction];
    
    database.ref().update(updates)
        .then(() => {
            // Update local user data
            currentUser.balance = newBalance;
            currentUser.plans = [...(currentUser.plans || []), plan];
            currentUser.transactions = [...(currentUser.transactions || []), transaction];
            
            localStorage.setItem('hondaUser', JSON.stringify(currentUser));
            updateDashboard();
            hideLoader();
            showPopup(`Plan ${planId} purchased successfully!`);
        })
        .catch(error => {
            hideLoader();
            showPopup('Error purchasing plan: ' + error.message);
        });
}

// Recharge functions
async function submitRechargeRequest() {
    const tillId = document.getElementById('tillId').value.trim();
    const trxId = document.getElementById('trxId').value.trim();
    const paymentProof = document.getElementById('paymentProof').files[0];
    
    if (!tillId && !trxId) {
        showPopup('Please provide either TILL ID or TRX ID');
        return;
    }
    
    if (!paymentProof) {
        showPopup('Please upload payment proof');
        return;
    }
    
    const amount = tillId ? 500 : 900; // 500 for Jazzcash, 900 for Easypaisa
    const paymentMethod = tillId ? 'Jazzcash' : 'Easypaisa';
    const transactionId = tillId || trxId;
    
    showLoader();
    
    try {
        // Upload payment proof to Cloudinary
        const imageUrl = await uploadPaymentProof(paymentProof);
        
        // Create recharge request with image URL
        const rechargeRequest = {
            username: currentUser.username,
            amount: amount,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            paymentProof: imageUrl,
            date: new Date().toISOString(),
            status: 'pending'
        };
        
        // Add to recharge requests
        const newRequestKey = database.ref('rechargeRequests').push().key;
        const updates = {};
        updates['/rechargeRequests/' + newRequestKey] = rechargeRequest;
        
        await database.ref().update(updates);
        
        hideLoader();
        showPopup('Recharge request submitted successfully!');
        document.getElementById('tillId').value = '';
        document.getElementById('trxId').value = '';
        document.getElementById('paymentProof').value = '';
    } catch (error) {
        hideLoader();
        showPopup('Error submitting request: ' + error.message);
    }
}

async function uploadPaymentProof(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    if (!response.ok) {
        throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.secure_url;
}

function toggleWithdrawFields() {
    const method = document.getElementById('withdrawMethod').value;
    const fieldsDiv = document.getElementById('withdrawFields');
    fieldsDiv.style.display = method ? 'block' : 'none';
}

// Withdraw function with method and limits
function submitWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const holder = document.getElementById('withdrawHolder').value.trim();
    const number = document.getElementById('withdrawNumber').value.trim();

    if (!amount || amount <= 0) {
        showPopup('Please enter a valid amount');
        return;
    }

    if (amount < 1400 || amount > 20000) {
        showPopup('Withdrawal amount must be between PKR 1400 and PKR 20,000');
        return;
    }

    if (!method) {
        showPopup('Please select a withdrawal method');
        return;
    }

    if (!holder || !number) {
        showPopup('Please provide account details');
        return;
    }

    if (currentUser.balance < amount) {
        showPopup('Insufficient balance for withdrawal');
        return;
    }

    showLoader();

    const withdrawRequest = {
        username: currentUser.username,
        amount: amount,
        method: method,
        accountHolder: holder,
        accountNumber: number,
        date: new Date().toISOString(),
        status: 'pending'
    };

    const newRequestKey = database.ref('withdrawRequests').push().key;
    const updates = {};
    updates['/withdrawRequests/' + newRequestKey] = withdrawRequest;

    database.ref().update(updates)
        .then(() => {
            hideLoader();
            showPopup('Withdrawal request submitted successfully!');
            
            // Clear form fields
            document.getElementById('withdrawAmount').value = '';
            document.getElementById('withdrawMethod').value = '';
            document.getElementById('withdrawHolder').value = '';
            document.getElementById('withdrawNumber').value = '';
            document.getElementById('withdrawFields').style.display = 'none';
        })
        .catch(error => {
            hideLoader();
            showPopup('Error submitting request: ' + error.message);
        });
}

// Earning functions
// Earning functions
function receiveProfit() {
    if (!currentUser || !currentUser.plans || currentUser.plans.length === 0) {
        showPopup('No active plans to receive profit from');
        return;
    }

    // Check if 24 hours have passed since last profit claim
    const lastProfitTransaction = currentUser.transactions?.reverse().find(t => t.type === 'profit');
    if (lastProfitTransaction) {
        const lastClaimTime = new Date(lastProfitTransaction.date).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceLastClaim = (currentTime - lastClaimTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastClaim < 24) {
            const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
            showPopup(`Please wait ${hoursRemaining} more hours before claiming next profit`);
            return;
        }
    }

    showLoader();
    
    // Calculate total daily profit from all active plans
    let totalProfit = 0;
    const updatedPlans = currentUser.plans.map(plan => {
        if (!plan.completed) {
            totalProfit += plan.dailyProfit;
            
            // Check if plan is completed (100 days)
            const daysCompleted = (plan.daysCompleted || 0) + 1;
            if (daysCompleted >= 100) {
                plan.completed = true;
            }
            plan.daysCompleted = daysCompleted;
        }
        return plan;
    });
    
    if (totalProfit === 0) {
        hideLoader();
        showPopup('No active plans to receive profit from');
        return;
    }
    
    // Update user balance and transactions
    const newBalance = currentUser.balance + totalProfit;
    
    const transaction = {
        type: 'profit',
        amount: totalProfit,
        date: new Date().toISOString(),
        status: 'completed'
    };
    
    const updates = {};
    updates['/users/' + currentUser.username + '/balance'] = newBalance;
    updates['/users/' + currentUser.username + '/plans'] = updatedPlans;
    updates['/users/' + currentUser.username + '/transactions'] = [...(currentUser.transactions || []), transaction];
    
    database.ref().update(updates)
        .then(() => {
            // Update local user data
            currentUser.balance = newBalance;
            currentUser.plans = updatedPlans;
            currentUser.transactions = [...(currentUser.transactions || []), transaction];
            
            localStorage.setItem('hondaUser', JSON.stringify(currentUser));
            updateDashboard();
            hideLoader();
            showPopup(`Daily profit of ${totalProfit} PKR received! Come back in 24 hours for next profit.`);
        })
        .catch(error => {
            hideLoader();
            showPopup('Error receiving profit: ' + error.message);
        });
}

// Admin functions
function loadAdminPanel() {
    const password = document.getElementById('adminPass').value;
    
    if (password !== adminPassword) {
        showPopup('Invalid admin password');
        return;
    }
    
    showLoader();
    
    // Load recharge requests
    database.ref('rechargeRequests').once('value').then(snapshot => {
        const requests = snapshot.val() || {};
        const rechargeTable = document.getElementById('rechargeTable');
        
        // Create table header
        rechargeTable.innerHTML = `
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Transaction ID</th>
                    <th>Payment Proof</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = rechargeTable.querySelector('tbody');
        
        // Add each request to table
        Object.entries(requests).forEach(([key, request]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${request.username}</td>
                <td>${request.amount} PKR</td>
                <td>${request.paymentMethod}</td>
                <td>${request.transactionId}</td>
                <td><a href="${request.paymentProof}" target="_blank">View Proof</a></td>
                <td>${formatDate(request.date)}</td>
                <td>${request.status}</td>
                <td>
                    ${request.status === 'pending' ? `
                        <button onclick="approveRecharge('${key}', '${request.username}', ${request.amount})" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Approve
                        </button>
                        <button onclick="rejectRecharge('${key}')" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Reject
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
      // Load withdraw requests
  database.ref('withdrawRequests').once('value').then(snapshot => {
    const requests = snapshot.val() || {};
    const withdrawTable = document.getElementById('withdrawTable');
    
    // Create table header
    withdrawTable.innerHTML = `
        <thead>
            <tr>
                <th>Username</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Account Holder</th>
                <th>Account Number</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = withdrawTable.querySelector('tbody');
    
    // Add each request to table
    Object.entries(requests).forEach(([key, request]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${request.username}</td>
            <td>${request.amount} PKR</td>
            <td>${request.method || 'N/A'}</td>
            <td>${request.accountHolder}</td>
            <td>${request.accountNumber}</td>
            <td>${formatDate(request.date)}</td>
            <td>${request.status}</td>
            <td>
                ${request.status === 'pending' ? `
                    <button onclick="approveWithdraw('${key}', '${request.username}', ${request.amount})" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Approve
                    </button>
                    <button onclick="rejectWithdraw('${key}', '${request.username}', ${request.amount})" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reject
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
});

        
        // Show admin content
        document.getElementById('adminContent').classList.remove('hidden');
        hideLoader();
    }).catch(error => {
        hideLoader();
        showPopup('Error loading admin panel: ' + error.message);
    });
}

function approveRecharge(requestKey, username, amount) {
    if (!confirm(`Approve recharge of ${amount} PKR for ${username}?`)) return;
    
    showLoader();
    
    // Update request status
    const updates = {};
    updates['/rechargeRequests/' + requestKey + '/status'] = 'approved';
    
    // Update user balance and transactions
    database.ref('users/' + username).once('value').then(snapshot => {
        const user = snapshot.val();
        const newBalance = (user.balance || 0) + amount;
        
        const transaction = {
            type: 'deposit',
            amount: amount,
            date: new Date().toISOString(),
            status: 'completed'
        };
        
        updates['/users/' + username + '/balance'] = newBalance;
        updates['/users/' + username + '/transactions'] = [...(user.transactions || []), transaction];
        
        return database.ref().update(updates);
    }).then(() => {
        hideLoader();
        showPopup('Recharge approved successfully!');
        loadAdminPanel(); // Refresh admin panel
    }).catch(error => {
        hideLoader();
        showPopup('Error approving recharge: ' + error.message);
    });
}

function rejectRecharge(requestKey) {
    if (!confirm('Reject this recharge request?')) return;
    
    showLoader();
    
    database.ref('rechargeRequests/' + requestKey + '/status').set('rejected')
        .then(() => {
            hideLoader();
            showPopup('Recharge rejected!');
            loadAdminPanel(); // Refresh admin panel
        })
        .catch(error => {
            hideLoader();
            showPopup('Error rejecting recharge: ' + error.message);
        });
}

function approveWithdraw(requestKey, username, amount) {
    if (!confirm(`Approve withdrawal of ${amount} PKR for ${username}?`)) return;
    
    showLoader();
    
    // Update request status
    const updates = {};
    updates['/withdrawRequests/' + requestKey + '/status'] = 'approved';
    
    // Update user balance and transactions
    database.ref('users/' + username).once('value').then(snapshot => {
        const user = snapshot.val();
        const newBalance = (user.balance || 0) - amount;
        
        const transaction = {
            type: 'withdrawal',
            amount: amount,
            date: new Date().toISOString(),
            status: 'completed'
        };
        
        updates['/users/' + username + '/balance'] = newBalance;
        updates['/users/' + username + '/transactions'] = [...(user.transactions || []), transaction];
        
        return database.ref().update(updates);
    }).then(() => {
        hideLoader();
        showPopup('Withdrawal approved successfully!');
        loadAdminPanel(); // Refresh admin panel
    }).catch(error => {
        hideLoader();
        showPopup('Error approving withdrawal: ' + error.message);
    });
}

function rejectWithdraw(requestKey, username, amount) {
    if (!confirm(`Reject withdrawal of ${amount} PKR for ${username}?`)) return;
    
    showLoader();
    
    database.ref('withdrawRequests/' + requestKey + '/status').set('rejected')
        .then(() => {
            hideLoader();
            showPopup('Withdrawal rejected!');
            loadAdminPanel(); // Refresh admin panel
        })
        .catch(error => {
            hideLoader();
            showPopup('Error rejecting withdrawal: ' + error.message);
        });
}

// Helper functions
function generateRefCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function updateReferralBonus(refCode, amount) {
    // Find user by refCode and update their referral earnings
    database.ref('users').orderByChild('refCode').equalTo(refCode).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const username = Object.keys(userData)[0];
                const user = userData[username];
                
                const newRefEarnings = (user.refEarnings || 0) + amount;
                
                // Create transaction for referral bonus
                const transaction = {
                    type: 'referral',
                    amount: amount,
                    date: new Date().toISOString(),
                    status: 'completed',
                    referredUser: currentUser.username
                };
                
                const updates = {};
                updates['/users/' + username + '/refEarnings'] = newRefEarnings;
                updates['/users/' + username + '/transactions'] = [...(user.transactions || []), transaction];
                
                return database.ref().update(updates);
            }
        })
        .catch(error => {
            console.error('Error updating referral bonus:', error);
        });
}

function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

function showPopup(message) {
    successPopup.textContent = message;
    successPopup.classList.add('show');
    
    setTimeout(() => {
        successPopup.classList.remove('show');
    }, 3000);
}
