
let lastMessage = null; 

let currentFilter = "all";


const activities = [
  { time: "Today, 11:42 PM",    amount: 15000, newPayee: true,  base: 60,  score: 100, boosted: true,  matched: ["otp", "blocked"] },
  { time: "Today, 3:10 PM",     amount: 450,   newPayee: false, base: 0,   score: 0,   boosted: false, matched: [] },
  { time: "Yesterday, 9:58 PM", amount: 22000, newPayee: true,  base: 55,  score: 55,  boosted: false, matched: [] },
  { time: "2 days ago, 1:20 PM", amount: 8000, newPayee: false, base: 20,  score: 20,  boosted: false, matched: [] }
];

const exampleMessages = [
  { label: "OTP scam",    text: "Your account will be blocked. Share your OTP now, this is urgent." },
  { label: "Fake refund", text: "You have a refund pending. Pay a processing fee and act now to claim it." },
  { label: "Fake KYC",    text: "Your KYC expired. Verify immediately or your account will be suspended." },
  { label: "Lottery",     text: "You won lottery of 50 lakh! Claim your prize, share your PIN to confirm your identity." }
];


const SCAM_PHRASES = [
  "otp", "blocked", "block your account", "urgent", "verify immediately",
  "kyc expired", "share your pin", "won lottery", "claim your prize",
  "customs fee", "refund", "act now", "suspended", "unauthorized login",
  "confirm your identity", "account will be deactivated", "government scheme",
  "processing fee", "call this number", "last warning", "income tax refund",
  "insurance maturity", "lucky draw", "registration fee", "do not tell anyone"
];


function calculateTransactionRisk(amount, hour, isNewPayee, velocity) {
  let score = 0;
  const reasons = [];

  
  if (amount > 30000)      { score += 50; reasons.push("very large amount"); }
  else if (amount > 15000) { score += 35; reasons.push("large amount"); }
  else if (amount > 5000)  { score += 20; reasons.push("above-average amount"); }

  if (hour >= 22 || hour < 5) { score += 25; reasons.push("late-night timing"); }
  if (isNewPayee)             { score += 20; reasons.push("new or unknown payee"); }
  if (velocity >= 3)          { score += 25; reasons.push("many transactions in the last hour"); }

  return { score: Math.min(score, 100), reasons: reasons };
}


function calculateMessageRisk(text) {
  const lower = text.toLowerCase();
  const matched = SCAM_PHRASES.filter(function (phrase) {
    return lower.includes(phrase);
  });
  
  return { score: Math.min(matched.length / 5, 1), matched: matched };
}


function fuseRiskScore(transactionScore) {
  const FIFTEEN_MIN = 15 * 60 * 1000;
  const isRecent = lastMessage !== null && (Date.now() - lastMessage.time) < FIFTEEN_MIN;

  if (isRecent && lastMessage.score > 0.5) {
    const boosted = transactionScore * 1.5 + lastMessage.score * 20;
    return { score: Math.round(Math.min(boosted, 100)), boosted: true };
  }
  return { score: Math.round(transactionScore), boosted: false };
}


function getRiskBand(score) {
  if (score <= 30) return "safe";
  if (score <= 60) return "caution";
  return "risk";
}


function byId(id) { return document.getElementById(id); }

function showError(id, message) {
  byId(id).textContent = message;
  byId(id).classList.remove("hidden");
}
function clearError(id) { byId(id).classList.add("hidden"); }

function hourLabel(h) {
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return hour12 + ":00 " + suffix;
}


function openApp(name, email) {
  byId("userName").textContent = name;
  byId("userEmail").textContent = email;
  byId("loginScreen").classList.add("hidden");
  byId("mainApp").classList.remove("hidden");
  showPage("dashboardPage");
  animateStats();
  renderRecent();
  renderActivity();
}

byId("loginForm").addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading
  const email = byId("emailInput").value.trim();
  const password = byId("passwordInput").value;

  if (!/\S+@\S+\.\S+/.test(email)) {
    showError("loginError", "Please enter a valid email address.");
    return;
  }
  if (password === "") {
    showError("loginError", "Please enter your password.");
    return;
  }
  clearError("loginError");
  openApp(email.split("@")[0], email);
});

byId("demoLoginBtn").addEventListener("click", function () {
  openApp("Demo User", "demo@family.com");
});

byId("logoutBtn").addEventListener("click", function () {
  byId("mainApp").classList.add("hidden");
  byId("loginScreen").classList.remove("hidden");
  byId("loginForm").reset();
});


function showPage(pageId) {
  document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
  document.querySelectorAll(".nav-link").forEach(function (l) {
    l.classList.toggle("active", l.dataset.page === pageId);
  });
  byId(pageId).classList.add("active");
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-link").forEach(function (link) {
  link.addEventListener("click", function () { showPage(link.dataset.page); });
});
document.querySelectorAll("[data-goto]").forEach(function (btn) {
  btn.addEventListener("click", function () { showPage(btn.dataset.goto); });
});


function animateStats() {
  document.querySelectorAll(".stat-number").forEach(function (el) {
    const target = Number(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const step = Math.max(1, Math.round(target / 40));
    let current = 0;

    const timer = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current + suffix;
    }, 20);
  });
}

function renderRecent() {
  const list = byId("recentList");
  list.innerHTML = "";
  activities.slice(0, 3).forEach(function (a) {
    const row = document.createElement("div");
    row.className = "recent-row";
    row.innerHTML = "<span>" + a.time + " - ₹" + a.amount.toLocaleString("en-IN") + "</span>" +
                    '<span class="badge ' + getRiskBand(a.score) + '">' + a.score + "</span>";
    list.appendChild(row);
  });
}


byId("txHour").addEventListener("input", function () {
  byId("txHourLabel").textContent = hourLabel(Number(byId("txHour").value));
});

byId("checkTxBtn").addEventListener("click", function () {
  const amount = parseFloat(byId("txAmount").value);
  const hour = parseInt(byId("txHour").value);
  const velocity = parseInt(byId("txVelocity").value) || 0;
  const isNewPayee = byId("txNewPayee").checked;


  if (isNaN(amount) || amount <= 0) {
    showError("txError", "Please enter a valid amount greater than 0.");
    return;
  }
  clearError("txError");

  const base = calculateTransactionRisk(amount, hour, isNewPayee, velocity);
  const fused = fuseRiskScore(base.score);
  const band = getRiskBand(fused.score);
  const colours = { safe: "var(--color-safe)", caution: "var(--color-caution)", risk: "var(--color-risk)" };

  byId("txResult").classList.remove("hidden");


  byId("gaugeArc").style.strokeDashoffset = 314 - (fused.score / 100) * 314;
  byId("gaugeArc").style.stroke = colours[band];
  byId("gaugeScore").textContent = fused.score;
  byId("gaugeScore").style.color = colours[band];

  const badge = byId("txBadge");
  badge.className = "badge " + band;
  badge.textContent = band === "safe" ? "✅ Looks normal" : band === "caution" ? "⚠️ Caution" : "🚨 Flagged as suspicious";

  let text = base.reasons.length ? "Factors: " + base.reasons.join(", ") + ". " : "No unusual factors found. ";
  text += "Base score " + base.score + ".";
  if (fused.boosted) {
    const mins = Math.round((Date.now() - lastMessage.time) / 60000);
    text += " ⚡ Boosted to " + fused.score + " because a suspicious message was checked " +
            (mins < 1 ? "just now" : mins + " min ago") + ".";
  }
  byId("txExplain").textContent = text;
  byId("txExplain").className = "result-box " + band;

  
  activities.unshift({
    time: "Just now", amount: amount, newPayee: isNewPayee, base: base.score,
    score: fused.score, boosted: fused.boosted,
    matched: fused.boosted ? lastMessage.matched : []
  });
  renderActivity();
  renderRecent();
});


exampleMessages.forEach(function (ex) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.textContent = ex.label;
  chip.addEventListener("click", function () { byId("smsText").value = ex.text; });
  byId("exampleChips").appendChild(chip);
});

byId("checkSmsBtn").addEventListener("click", function () {
  const text = byId("smsText").value.trim();
  if (text === "") {
    showError("smsError", "Please paste a message first.");
    return;
  }
  clearError("smsError");

  const result = calculateMessageRisk(text);
  lastMessage = { score: result.score, matched: result.matched, time: Date.now() };

  const percent = Math.round(result.score * 100);
  const band = getRiskBand(percent);
  const colours = { safe: "var(--color-safe)", caution: "var(--color-caution)", risk: "var(--color-risk)" };

  byId("smsResult").classList.remove("hidden");
  byId("smsPercent").textContent = percent + "%";
  byId("smsBar").style.width = percent + "%";
  byId("smsBar").style.background = colours[band];

  const box = byId("smsPhrases");
  box.innerHTML = "";
  if (result.matched.length === 0) {
    box.innerHTML = '<span class="muted">No suspicious phrases detected.</span>';
  }
  result.matched.forEach(function (phrase) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = phrase;
    box.appendChild(pill);
  });
});


document.querySelectorAll(".filter-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderActivity();
  });
});

function renderActivity() {
  const body = byId("activityBody");
  body.innerHTML = "";

  const shown = activities.filter(function (a) {
    return currentFilter === "all" || getRiskBand(a.score) === currentFilter;
  });
  byId("activityEmpty").classList.toggle("hidden", shown.length > 0);

  shown.forEach(function (a) {
    const row = document.createElement("tr");
    row.className = "row";
    row.innerHTML = "<td>" + a.time + "</td><td>₹" + a.amount.toLocaleString("en-IN") + "</td>" +
                    "<td>" + (a.newPayee ? "New" : "Known") + "</td>" +
                    '<td><span class="badge ' + getRiskBand(a.score) + '">' + a.score + "</span></td>";

    const detail = document.createElement("tr");
    detail.className = "detail-row hidden";
    detail.innerHTML = '<td colspan="4">Base score: ' + a.base +
      " | Message boost applied: " + (a.boosted ? "Yes" : "No") +
      (a.matched.length ? " | Phrases: " + a.matched.join(", ") : "") + "</td>";

    row.addEventListener("click", function () { detail.classList.toggle("hidden"); });
    body.appendChild(row);
    body.appendChild(detail);
  });
}