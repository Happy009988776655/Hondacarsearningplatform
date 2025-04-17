// Firebase config — replace with your own
const firebaseConfig = {
    apiKey: "AIzaSyADVCKIuC_bY3JyU9t4ENQDetkBtL8b1hc",
    authDomain: "sathi-6c556.firebaseapp.com",
    projectId: "sathi-6c556",
    databaseURL: "https://sathi-6c556-default-rtdb.firebaseio.com/",
    storageBucket: "sathi-6c556.firebasestorage.app",
    messagingSenderId: "560385393645",
    appId: "1:560385393645:web:b924700f4671efccd2dde4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUser = localStorage.getItem("username");

function showSection(sectionId) {
    document.querySelectorAll(".container").forEach(div => div.style.display = "none");
    document.getElementById(sectionId).style.display = "block";
}

function showSuccessPopup(message) {
    const popup = document.getElementById("popupOverlay");
    document.getElementById("popupMessage").innerText = message;
    popup.style.display = "flex";
    setTimeout(() => popup.style.display = "none", 3000);
}

document.getElementById("popupClose").addEventListener("click", () => {
    document.getElementById("popupOverlay").style.display = "none";
});

function registerLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const refCode = document.getElementById("refCode").value.trim();

    if (!username || !password) return alert("Enter valid credentials");

    db.ref("users/" + username).once("value", snap => {
        if (snap.exists()) {
            if (snap.val().password === password) {
                localStorage.setItem("username", username);
                startSession(username);
            } else alert("Wrong password");
        } else {
            db.ref("users/" + username).set({
                password, balance: 5, refEarnings: 0, transactions: { tx0: "+5 Registration Bonus" }
            });
            if (refCode) {
                db.ref("users/" + refCode + "/refEarnings").transaction(v => (v || 0) + 5);
                db.ref("users/" + refCode + "/transactions").push("+5 from referral");
            }
            localStorage.setItem("username", username);
            startSession(username);
        }
    });
}

function startSession(username) {
    currentUser = username;
    document.getElementById("authSection").style.display = "none";
    document.getElementById("navBar").style.display = "flex";
    showSection("dashboard");
    document.getElementById("displayUsername").innerText = username;
    document.getElementById("refLink").value = `https://hondacarsrealearningplatform.netlify.app/?ref=${username}`;

    db.ref("users/" + username).on("value", snap => {
        const data = snap.val();
        document.getElementById("userBalance").innerText = data.balance;
        document.getElementById("refEarnings").innerText = data.refEarnings;
        const txList = document.getElementById("transactionList");
        txList.innerHTML = "";
        for (let key in data.transactions) {
            const li = document.createElement("li");
            li.textContent = data.transactions[key];
            txList.appendChild(li);
        }
    });

    updateEarningPage();
}

function logout() {
    localStorage.removeItem("username");
    location.reload();
}

function copyReferralLink() {
    const refLink = document.getElementById("refLink");
    refLink.select();
    document.execCommand("copy");
    alert("Referral link copied");
}

function buyPlan(planId, cost, daily) {
    const userRef = db.ref("users/" + currentUser);
    userRef.once("value", snap => {
        const data = snap.val();
        if (data.balance >= cost) {
            userRef.update({ balance: data.balance - cost });
            userRef.child("transactions").push(`-${cost} Plan ${planId}`);
            db.ref("plans/" + currentUser).set({ planId, dailyProfit: daily, daysLeft: 100 });
            showSuccessPopup("✅ Plan subscribed successfully!");
            updateEarningPage();
        } else alert("Insufficient balance");
    });
}

function submitRechargeRequest() {
    const tillId = document.getElementById("tillId").value;
    const trxId = document.getElementById("trxId").value;
    if (tillId && trxId) return alert("Fill only one method");
    if (!tillId && !trxId) return alert("Provide either TILL ID or TRX ID");
   
    const method = tillId ? "jazzcash" : "easypaisa";
    const amount = tillId ? 500 : 900;
    const ref = db.ref("rechargeRequests").push();
    ref.set({ user: currentUser, method, id: tillId || trxId, amount, status: "pending" });
    showSuccessPopup("✅ Recharge request submitted! Wait for admin approval");
}

function submitWithdrawRequest() {
    const amount = parseInt(document.getElementById("withdrawAmount").value);
    const holder = document.getElementById("withdrawHolder").value;
    const number = document.getElementById("withdrawNumber").value;
    if (!amount || !holder || !number) return alert("Fill all fields");

    db.ref("withdrawRequests").push({ user: currentUser, amount, holder, number, status: "pending" });
    showSuccessPopup("✅ Withdraw request submitted! Wait for admin approval.");
}
function showSuccessPopup(message) {
    const popup = document.getElementById("successPopup");
    popup.textContent = message;
    popup.classList.add("show");
    
    // Hide after 3 seconds
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }
  
function receiveProfit() {
    const userRef = db.ref("users/" + currentUser);
    const planRef = db.ref("plans/" + currentUser);

    planRef.once("value", snapshot => {
        const plan = snapshot.val();
        if (!plan || plan.daysLeft <= 0) {
            alert("No active plan or days left!");
            return;
        }

        const now = Date.now();
        const lastClaim = plan.lastClaim || 0;

        if (now - lastClaim < 86400000) {
            const hoursLeft = Math.ceil((86400000 - (now - lastClaim)) / 3600000);
            alert(`You can claim again in about ${hoursLeft} hour(s).`);
            return;
        }

        userRef.child("balance").transaction(balance => (balance || 0) + plan.dailyProfit);
        userRef.child("transactions").push("+" + plan.dailyProfit + " Claimed Daily Profit");
        planRef.update({
            lastClaim: now,
            daysLeft: plan.daysLeft - 1
        });

        showSuccessPopup("✅ Daily profit added to your balance!");
        updateEarningPage();
    });
}

function loadAdminPanel() {
    const pass = document.getElementById("adminPass").value;
    if (pass !== "Lavaithan") return alert("Wrong admin password");

    document.getElementById("adminContent").classList.remove("hidden");
    const rechargeTable = document.getElementById("rechargeTable");
    const withdrawTable = document.getElementById("withdrawTable");

    db.ref("rechargeRequests").on("value", snap => {
        rechargeTable.innerHTML = "<tr><th>User</th><th>Method</th><th>ID</th><th>Amount</th><th>Status</th><th>Action</th></tr>";
        snap.forEach(child => {
            const data = child.val();
            const row = `<tr><td>${data.user}</td><td>${data.method}</td><td>${data.id}</td><td>${data.amount}</td><td>${data.status}</td><td>${data.status === "pending" ? `<button onclick='approveRecharge("${child.key}", "${data.user}", ${data.amount})'>Approve</button>` : ""}</td></tr>`;
            rechargeTable.innerHTML += row;
        });
    });

    db.ref("withdrawRequests").on("value", snap => {
        withdrawTable.innerHTML = "<tr><th>User</th><th>Amount</th><th>Holder</th><th>Number</th><th>Status</th></tr>";
        snap.forEach(child => {
            const data = child.val();
            const row = `<tr><td>${data.user}</td><td>${data.amount}</td><td>${data.holder}</td><td>${data.number}</td><td>${data.status}</td></tr>`;
            withdrawTable.innerHTML += row;
        });
    });
}

function approveRecharge(id, user, amount) {
    db.ref("users/" + user + "/balance").transaction(b => (b || 0) + amount);
    db.ref("users/" + user + "/transactions").push("+" + amount + " Recharge Approved");
    db.ref("rechargeRequests/" + id + "/status").set("success");
    showSuccessPopup("✅ Recharge approved for " + user);
}

function updateEarningPage() {
    const planRef = db.ref("plans/" + currentUser);
    planRef.once("value", snapshot => {
        const plan = snapshot.val();
        if (plan) {
            document.getElementById("planName").innerText = `Plan ${plan.planId}`;
            document.getElementById("dailyProfit").innerText = plan.dailyProfit;
        } else {
            document.getElementById("planName").innerText = "No Active Plan";
            document.getElementById("dailyProfit").innerText = "0";
        }
    });
}

setInterval(() => {
    db.ref("plans").once("value", snap => {
        snap.forEach(child => {
            const user = child.key;
            const plan = child.val();
            if (plan.daysLeft > 0) {
                db.ref("users/" + user + "/balance").transaction(b => (b || 0) + plan.dailyProfit);
                db.ref("users/" + user + "/transactions").push("+" + plan.dailyProfit + " Daily Profit");
                db.ref("plans/" + user + "/daysLeft").set(plan.daysLeft - 1);
            }
        });
    });
}, 86400000);

if (currentUser) startSession(currentUser);
