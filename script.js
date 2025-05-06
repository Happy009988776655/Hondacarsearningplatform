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
    
    // Set up navigation for history pages
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            
            // Load specific data when these sections are shown
            if (sectionId === 'RechargeHistory') {
                loadUserRechargeHistory();
            } else if (sectionId === 'WithdrawHistory') {
                loadUserWithdrawHistory();
            }
        });
    });
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
                balance: 0, // Removed registration bonus
                refEarnings: 0,
                refCode: generateRefCode(),
                referredBy: refCode || null,
                transactions: [],
                plans: [],
                hasBoughtPlan: false, // Track if user has bought any plan
                rechargeHistory: [],
                withdrawHistory: [],
                createdAt: new Date().toISOString()
            };

            // Save user to database
            database.ref('users/' + username).set(newUser)
                .then(() => {
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
    } else if (sectionId === 'RechargeHistory') {
        loadUserRechargeHistory();
    } else if (sectionId === 'WithdrawHistory') {
        loadUserWithdrawHistory();
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

// Update transaction list function
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
            ${transaction.referredUser ? `from ${transaction.referredUser}` : ''}
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

// Plan functions with referral bonus
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
    
    // Check if this is user's first plan purchase and they were referred by someone
    if (!currentUser.hasBoughtPlan && currentUser.referredBy) {
        updates['/users/' + currentUser.username + '/hasBoughtPlan'] = true;
        
        // Give referral bonus (50 PKR for first plan purchase)
        const referralBonus = 50;
        updateReferralBonus(currentUser.referredBy, referralBonus);
    }
    
    database.ref().update(updates)
        .then(() => {
            // Update local user data
            currentUser.balance = newBalance;
            currentUser.plans = [...(currentUser.plans || []), plan];
            currentUser.transactions = [...(currentUser.transactions || []), transaction];
            if (!currentUser.hasBoughtPlan && currentUser.referredBy) {
                currentUser.hasBoughtPlan = true;
            }
            
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

// Updated referral bonus function (50 PKR when referred user buys first plan)
function updateReferralBonus(refCode, amount) {
    // Search all users for matching refCode
    database.ref('users').once('value', snapshot => {
        snapshot.forEach(child => {
            const user = child.val();
            if (user.refCode === refCode) {
                const newEarnings = (user.refEarnings || 0) + amount;
                database.ref('users/' + user.username + '/refEarnings').set(newEarnings);
                
                // Also update the balance
                const newBalance = (user.balance || 0) + amount;
                database.ref('users/' + user.username + '/balance').set(newBalance);
                
                // Add transaction record
                const transaction = {
                    type: 'referral',
                    amount: amount,
                    date: new Date().toISOString(),
                    status: 'completed',
                    referredUser: currentUser.username
                };
                
                const transactions = [...(user.transactions || []), transaction];
                database.ref('users/' + user.username + '/transactions').set(transactions);
            }
        });
    });
}

// Recharge functions
async function submitRechargeRequest() {
    const tillId = document.getElementById('tillId').value.trim();
    const depositAmount = document.getElementById('depositAmount').value;
    const paymentProof = document.getElementById('paymentProof').files[0];
    
    // Validation
    if (!tillId) {
        showPopup('Please provide your Easypaisa Till ID');
        return;
    }
    
    if (!paymentProof) {
        showPopup('Please upload payment proof');
        return;
    }
    
    showLoader();
    
    try {
        // Upload payment proof to Cloudinary
        const imageUrl = await uploadPaymentProof(paymentProof);
        
        // Create recharge request with image URL
        const rechargeRequest = {
            username: currentUser.username,
            amount: parseInt(depositAmount),
            paymentMethod: 'Easypaisa',
            transactionId: tillId,
            paymentProof: imageUrl,
            date: new Date().toISOString(),
            status: 'pending',
            selectedAmount: depositAmount
        };
        
        // Add to recharge requests
        const newRequestKey = database.ref('rechargeRequests').push().key;
        const updates = {};
        updates['/rechargeRequests/' + newRequestKey] = rechargeRequest;
        
        // Add to user's recharge history
        const userRecharge = {
            amount: parseInt(depositAmount),
            date: new Date().toISOString(),
            status: 'pending',
            requestId: newRequestKey,
            paymentMethod: 'Easypaisa',
            transactionId: tillId
        };
        
        updates['/users/' + currentUser.username + '/rechargeHistory'] = [...(currentUser.rechargeHistory || []), userRecharge];
        
        await database.ref().update(updates);
        
        // Update local user data
        currentUser.rechargeHistory = [...(currentUser.rechargeHistory || []), userRecharge];
        localStorage.setItem('hondaUser', JSON.stringify(currentUser));
        
        hideLoader();
        showPopup(`Recharge request submitted successfully!\nAmount: ${depositAmount} PKR\nTill ID: ${tillId}`);
        
        // Reset form
        document.getElementById('tillId').value = '';
        document.getElementById('paymentProof').value = '';
        
        // Update recharge history
        loadUserRechargeHistory();
    } catch (error) {
        hideLoader();
        showPopup('Error submitting request: ' + error.message);
        console.error('Recharge error:', error);
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

// Withdraw functions
function toggleWithdrawFields() {
    const method = document.getElementById('withdrawMethod').value;
    const fieldsDiv = document.getElementById('withdrawFields');
    fieldsDiv.style.display = method ? 'block' : 'none';
}

function submitWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const holder = document.getElementById('withdrawHolder').value.trim();
    const number = document.getElementById('withdrawNumber').value.trim();

    if (!amount || amount <= 0) {
        showPopup('Please enter a valid amount');
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

    // Add to user's withdraw history
    const userWithdraw = {
        amount: amount,
        date: new Date().toISOString(),
        status: 'pending',
        method: method,
        accountHolder: holder,
        accountNumber: number,
        requestId: newRequestKey
    };
    
    updates['/users/' + currentUser.username + '/withdrawHistory'] = [...(currentUser.withdrawHistory || []), userWithdraw];
    
    // Deduct amount from balance (temporarily until approved)
    updates['/users/' + currentUser.username + '/balance'] = currentUser.balance - amount;

    database.ref().update(updates)
        .then(() => {
            // Update local user data
            currentUser.withdrawHistory = [...(currentUser.withdrawHistory || []), userWithdraw];
            currentUser.balance -= amount;
            localStorage.setItem('hondaUser', JSON.stringify(currentUser));
            
            hideLoader();
            showPopup('Withdrawal request submitted successfully!');
            
            // Clear form fields
            document.getElementById('withdrawAmount').value = '';
            document.getElementById('withdrawMethod').value = '';
            document.getElementById('withdrawHolder').value = '';
            document.getElementById('withdrawNumber').value = '';
            document.getElementById('withdrawFields').style.display = 'none';
            
            // Update dashboard and history
            updateDashboard();
            loadUserWithdrawHistory();
        })
        .catch(error => {
            hideLoader();
            showPopup('Error submitting request: ' + error.message);
        });
}

// Earning functions
function receiveProfit() {
    if (!currentUser || !currentUser.plans || currentUser.plans.length === 0) {
        showPopup('No active plans to receive profit from');
        return;
    }

    const now = Date.now();
    let totalProfit = 0;
    const updatedPlans = [];
    const cooldownErrors = [];

    for (let plan of currentUser.plans) {
        if (plan.completed) {
            updatedPlans.push(plan);
            continue;
        }

        const lastReceived = plan.lastReceived ? new Date(plan.lastReceived).getTime() : 0;
        const elapsedHours = (now - lastReceived) / (1000 * 60 * 60);

        if (elapsedHours < 24) {
            const remaining = Math.ceil(24 - elapsedHours);
            cooldownErrors.push(`• ${plan.name}: wait ${remaining}h`);
            updatedPlans.push(plan);
            continue;
        }

        // Add profit
        totalProfit += plan.dailyProfit;

        // Update plan
        plan.daysCompleted = (plan.daysCompleted || 0) + 1;
        if (plan.daysCompleted >= 100) {
            plan.completed = true;
        }

        plan.lastReceived = new Date().toISOString();
        updatedPlans.push(plan);
    }

    if (totalProfit === 0) {
        showPopup(`No eligible plans for profit.\n${cooldownErrors.join('\n')}`);
        return;
    }

    showLoader();

    // Update user balance and transactions
    const newBalance = currentUser.balance + totalProfit;

    const transaction = {
        type: 'profit',
        amount: totalProfit,
        date: new Date().toISOString(),
        status: 'completed'
    };

    const updates = {};
    updates[`/users/${currentUser.username}/balance`] = newBalance;
    updates[`/users/${currentUser.username}/plans`] = updatedPlans;
    updates[`/users/${currentUser.username}/transactions`] = [...(currentUser.transactions || []), transaction];

    database.ref().update(updates)
        .then(() => {
            // Update local user object
            currentUser.balance = newBalance;
            currentUser.plans = updatedPlans;
            currentUser.transactions = [...(currentUser.transactions || []), transaction];

            localStorage.setItem('hondaUser', JSON.stringify(currentUser));
            updateDashboard();
            hideLoader();
            showPopup(`You received ${totalProfit} PKR profit!\nCome back in 24 hours for next claim.`);
        })
        .catch(error => {
            hideLoader();
            showPopup('Error receiving profit: ' + error.message);
        });
}

// History functions
function loadUserRechargeHistory() {
    if (!currentUser) return;
    
    const tbody = document.getElementById('userRechargeTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!currentUser.rechargeHistory || currentUser.rechargeHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No recharge history found</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedHistory = [...currentUser.rechargeHistory].sort((a, b) => 
        new Date(b.date) - new Date(a.date));
    
    sortedHistory.forEach(item => {
        const tr = document.createElement('tr');
        
        let statusClass = '';
        if (item.status === 'approved') statusClass = 'status-approved';
        else if (item.status === 'rejected') statusClass = 'status-rejected';
        else statusClass = 'status-pending';
        
        tr.innerHTML = `
            <td>${item.amount} PKR</td>
            <td>${item.paymentMethod || 'Easypaisa'}</td>
            <td>${formatDate(item.date)}</td>
            <td class="${statusClass}">${item.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function loadUserWithdrawHistory() {
    if (!currentUser) return;
    
    const tbody = document.getElementById('userWithdrawTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!currentUser.withdrawHistory || currentUser.withdrawHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No withdraw history found</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedHistory = [...currentUser.withdrawHistory].sort((a, b) => 
        new Date(b.date) - new Date(a.date));
    
    sortedHistory.forEach(item => {
        const tr = document.createElement('tr');
        
        let statusClass = '';
        if (item.status === 'approved') statusClass = 'status-approved';
        else if (item.status === 'rejected') statusClass = 'status-rejected';
        else statusClass = 'status-pending';
        
        tr.innerHTML = `
            <td>${item.amount} PKR</td>
            <td>${item.method || 'N/A'}</td>
            <td>${formatDate(item.date)}</td>
            <td class="${statusClass}">${item.status}</td>
        `;
        tbody.appendChild(tr);
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
            
            // Show admin content
            document.getElementById('adminContent').classList.remove('hidden');
            hideLoader();
        });
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
        
        // Update user's recharge history
        const rechargeIndex = user.rechargeHistory.findIndex(r => r.requestId === requestKey);
        if (rechargeIndex !== -1) {
            updates['/users/' + username + '/rechargeHistory/' + rechargeIndex + '/status'] = 'approved';
        }
        
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
    
    // Get the request to find the username
    database.ref('rechargeRequests/' + requestKey).once('value').then(snapshot => {
        const request = snapshot.val();
        if (!request) throw new Error('Request not found');
        
        const updates = {};
        updates['/rechargeRequests/' + requestKey + '/status'] = 'rejected';
        
        // Update user's recharge history
        return database.ref('users/' + request.username + '/rechargeHistory').once('value')
            .then(snapshot => {
                const rechargeHistory = snapshot.val() || [];
                const rechargeIndex = rechargeHistory.findIndex(r => r.requestId === requestKey);
                if (rechargeIndex !== -1) {
                    updates['/users/' + request.username + '/rechargeHistory/' + rechargeIndex + '/status'] = 'rejected';
                }
                
                return database.ref().update(updates);
            });
    }).then(() => {
        hideLoader();
        showPopup('Recharge rejected!');
        loadAdminPanel(); // Refresh admin panel
    }).catch(error => {
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
    
    // Update user's withdraw history
    database.ref('users/' + username + '/withdrawHistory').once('value')
        .then(snapshot => {
            const withdrawHistory = snapshot.val() || [];
            const withdrawIndex = withdrawHistory.findIndex(w => w.requestId === requestKey);
            if (withdrawIndex !== -1) {
                updates['/users/' + username + '/withdrawHistory/' + withdrawIndex + '/status'] = 'approved';
            }
            
            return database.ref().update(updates);
        })
        .then(() => {
            hideLoader();
            showPopup('Withdrawal approved successfully!');
            loadAdminPanel(); // Refresh admin panel
        })
        .catch(error => {
            hideLoader();
            showPopup('Error approving withdrawal: ' + error.message);
        });
}

function rejectWithdraw(requestKey, username, amount) {
    if (!confirm(`Reject withdrawal of ${amount} PKR for ${username}?`)) return;
    
    showLoader();
    
    const updates = {};
    updates['/withdrawRequests/' + requestKey + '/status'] = 'rejected';
    
    // Update user's withdraw history and return the amount
    database.ref('users/' + username).once('value').then(snapshot => {
        const user = snapshot.val();
        
        // Find the withdraw request in user's history
        const withdrawIndex = user.withdrawHistory.findIndex(w => w.requestId === requestKey);
        if (withdrawIndex !== -1) {
            updates['/users/' + username + '/withdrawHistory/' + withdrawIndex + '/status'] = 'rejected';
        }
        
        // Return the amount to balance
        updates['/users/' + username + '/balance'] = (user.balance || 0) + amount;
        
        return database.ref().update(updates);
    }).then(() => {
        hideLoader();
        showPopup('Withdrawal rejected and amount returned to balance!');
        loadAdminPanel(); // Refresh admin panel
    }).catch(error => {
        hideLoader();
        showPopup('Error rejecting withdrawal: ' + error.message);
    });
}

// Helper functions
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
