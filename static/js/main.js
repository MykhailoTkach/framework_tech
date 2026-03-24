

var charts = {};


var clientsState = {
  all: [], 
  filtered: [], 
  sortKey: "probability",
  sortDir: -1, 
  page: 1,
  perPage: 20,
};

function go(id, btn) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.remove("active");
  });
  document.getElementById("page-" + id).classList.add("active");
  btn.classList.add("active");
  if (id === "log") loadLog();
  if (id === "clients") loadClients();
}

function showAlert(id, msg, type) {
  var el = document.getElementById(id);
  el.className = "alert show " + (type === "ok" ? "ao" : "ae");
  el.textContent = msg;
}
function hideAlert(id) {
  document.getElementById(id).className = "alert";
}

function doGen() {
  var n = parseInt(document.getElementById("genN").value);
  if (isNaN(n) || n < 50 || n > 3000) {
    showAlert("aGen", "Від 50 до 3000");
    return;
  }
  hideAlert("aGen");
  var btn = document.getElementById("btnGen");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';

  fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n: n }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d.ok) throw new Error(d.error);
      document.getElementById("dataInfo").style.display = "block";
      document.getElementById("dataKPIs").innerHTML =
        '<div class="kpi"><div class="kpi-label">Клієнтів</div><div class="kpi-val blue">' +
        d.rows +
        "</div></div>" +
        '<div class="kpi"><div class="kpi-label">Відтік</div><div class="kpi-val red">' +
        d.churn +
        "</div></div>" +
        '<div class="kpi"><div class="kpi-label">Частка</div><div class="kpi-val orange">' +
        d.rate +
        "%</div></div>" +
        '<div class="kpi"><div class="kpi-label">Збережено</div><div class="kpi-val green" style="font-size:12px;margin-top:4px">data/customers.csv</div></div>';
      document.getElementById("btnTrain").disabled = false;
      clientsState.all = [];
      showAlert("aGen", "Згенеровано " + d.rows + " клієнтів", "ok");
    })
    .catch(function (e) {
      showAlert("aGen", "Помилка: " + e.message);
    })
    .finally(function () {
      btn.disabled = false;
      btn.innerHTML = "⚡ Згенерувати";
    });
}

function doTrain() {
  var btn = document.getElementById("btnTrain");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';
  hideAlert("aTrain");

  fetch("/api/train", { method: "POST" })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d.ok) throw new Error(d.error);
      document.getElementById("btnPred").disabled = false;
      showAlert(
        "aTrain",
        "AUC=" + d.metrics.roc_auc + "  Accuracy=" + d.metrics.accuracy,
        "ok",
      );
      buildResults(d);
      clientsState.all = [];
    })
    .catch(function (e) {
      showAlert("aTrain", "Помилка: " + e.message);
    })
    .finally(function () {
      btn.disabled = false;
      btn.innerHTML = "🧠 Навчити";
    });
}

function buildResults(d) {
  var m = d.metrics;
  document.getElementById("noRes").style.display = "none";
  document.getElementById("hasRes").style.display = "block";

  var rows = [
    ["Accuracy", m.accuracy, "blue"],
    ["ROC AUC", m.roc_auc, m.roc_auc >= 0.7 ? "green" : "orange"],
    ["F1-Score", m.f1, "blue"],
    ["Precision", m.precision, "blue"],
    ["Recall", m.recall, "blue"],
    ["Train", m.train_size, ""],
    ["Test", m.test_size, ""],
    ["Алгоритм", "RF", ""],
  ];
  document.getElementById("resKPIs").innerHTML = rows
    .map(function (k) {
      return (
        '<div class="kpi"><div class="kpi-label">' +
        k[0] +
        "</div>" +
        '<div class="kpi-val ' +
        k[2] +
        '">' +
        k[1] +
        "</div></div>"
      );
    })
    .join("");

  buildROCChart(d.roc);
  buildCMGrid(m.confusion_matrix);
  buildMChart(m);
  document.getElementById("chartImg").src = "data:image/png;base64," + d.chart;
}

function buildROCChart(roc) {
  destroyChart("rocChart");
  var fprLabels = roc.fpr.map(function (v) {
    return Math.round(v * 1000) / 1000;
  });
  charts["rocChart"] = new Chart(
    document.getElementById("rocChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: fprLabels,
        datasets: [
          {
            label: "ROC (AUC=" + roc.auc + ")",
            data: roc.tpr,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.12)",
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.1,
          },
          {
            label: "Random",
            data: roc.fpr.slice(),
            borderColor: "#475569",
            borderWidth: 1.5,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: lStyle() }, tooltip: tStyle() },
        scales: {
          x: {
            title: { display: true, text: "FPR", color: "#4d7aa8" },
            ticks: tkStyle(),
            grid: gStyle(),
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: "TPR", color: "#4d7aa8" },
            ticks: tkStyle(),
            grid: gStyle(),
          },
        },
      },
    },
  );
}

function buildCMGrid(cm) {
  document.getElementById("cmGrid").innerHTML =
    '<div></div><div class="cm-l">Pred: 0</div><div class="cm-l">Pred: 1</div>' +
    '<div class="cm-l r">Fact: 0</div>' +
    '<div class="cm-cell cm-tn">' +
    cm[0][0] +
    '<div style="font-size:9px;opacity:.7">TN</div></div>' +
    '<div class="cm-cell cm-fp">' +
    cm[0][1] +
    '<div style="font-size:9px;opacity:.7">FP</div></div>' +
    '<div class="cm-l r">Fact: 1</div>' +
    '<div class="cm-cell cm-fn">' +
    cm[1][0] +
    '<div style="font-size:9px;opacity:.7">FN</div></div>' +
    '<div class="cm-cell cm-tp">' +
    cm[1][1] +
    '<div style="font-size:9px;opacity:.7">TP</div></div>';
}

function buildMChart(m) {
  destroyChart("mChart");
  charts["mChart"] = new Chart(
    document.getElementById("mChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: ["Accuracy", "Precision", "Recall", "F1", "AUC"],
        datasets: [
          {
            data: [m.accuracy, m.precision, m.recall, m.f1, m.roc_auc],
            backgroundColor: [
              "#6366f1",
              "#22d3ee",
              "#f97316",
              "#a78bfa",
              "#10b981",
            ],
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: tStyle() },
        scales: {
          x: { ticks: tkStyle(), grid: gStyle() },
          y: { min: 0, max: 1, ticks: tkStyle(), grid: gStyle() },
        },
      },
    },
  );
}


function loadClients() {
  if (clientsState.all.length > 0) {
    applyClientsFilter();
    return;
  }

  var tbody = document.getElementById("clientsTbody");
  var noEl = document.getElementById("noClients");

  fetch("/api/clients")
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d.ok) {
        noEl.style.display = "block";
        noEl.textContent =
          "⚠️ " + (d.error || "Спочатку згенеруйте дані та навчіть модель");
        document.getElementById("clientsTable").style.display = "none";
        return;
      }
      noEl.style.display = "none";
      document.getElementById("clientsTable").style.display = "";
      clientsState.all = d.clients;
      clientsState.page = 1;
      applyClientsFilter();
    })
    .catch(function (e) {
      noEl.style.display = "block";
      noEl.textContent = "⚠️ Помилка завантаження: " + e.message;
      document.getElementById("clientsTable").style.display = "none";
    });
}

function filterClients() {
  clientsState.page = 1;
  applyClientsFilter();
}

function applyClientsFilter() {
  var search = (
    document.getElementById("clientSearch").value || ""
  ).toLowerCase();
  var risk = document.getElementById("filterRisk").value || "";
  var pred = document.getElementById("filterPred").value || "";
  var contract = document.getElementById("filterContract").value || "";

  clientsState.filtered = clientsState.all.filter(function (c) {
    if (search && c.CustomerID.toLowerCase().indexOf(search) === -1)
      return false;
    if (risk && c.risk !== risk) return false;
    if (pred && c.prediction !== pred) return false;
    if (contract && c["Тип договору"] !== contract) return false;
    return true;
  });

  var key = clientsState.sortKey;
  var dir = clientsState.sortDir;
  clientsState.filtered.sort(function (a, b) {
    var av = a[key],
      bv = b[key];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  renderClientsTable();
  renderPagination();
  document.getElementById("clientsCount").textContent =
    clientsState.filtered.length + " / " + clientsState.all.length;
}

function sortClients(key) {
  if (clientsState.sortKey === key) {
    clientsState.sortDir *= -1;
  } else {
    clientsState.sortKey = key;
    clientsState.sortDir = -1;
  }
  clientsState.page = 1;
  applyClientsFilter();
}

function renderClientsTable() {
  var tbody = document.getElementById("clientsTbody");
  var start = (clientsState.page - 1) * clientsState.perPage;
  var rows = clientsState.filtered.slice(start, start + clientsState.perPage);

  if (rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="12" style="text-align:center;padding:30px;color:var(--muted)">Нічого не знайдено</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(function (c) {
      var prob = c.probability;
      var pct = Math.round(prob * 100);
      var probClr =
        prob >= 0.7
          ? "var(--red)"
          : prob >= 0.4
            ? "var(--orange)"
            : "var(--green)";

      var riskCls =
        prob >= 0.7 ? "badge-high" : prob >= 0.4 ? "badge-mid" : "badge-low";
      var predCls = c.prediction === "Відтік" ? "badge-churn" : "badge-stay";

      return (
        "<tr>" +
        '<td class="td-id">' +
        c.CustomerID +
        "</td>" +
        "<td>" +
        c["Термін (міс)"] +
        "</td>" +
        "<td>" +
        c["Місячна оплата"].toFixed(2) +
        "</td>" +
        "<td>" +
        c["Загальна оплата"].toFixed(2) +
        "</td>" +
        "<td>" +
        c["Дзвінки підтримки"] +
        "</td>" +
        '<td><span class="td-chip">' +
        c["Тип договору"] +
        "</span></td>" +
        "<td>" +
        c["Інтернет"] +
        "</td>" +
        '<td class="td-center">' +
        (c["Онлайн-захист"] ? "✔" : "—") +
        "</td>" +
        '<td class="td-center">' +
        (c["Пенсіонер"] ? "✔" : "—") +
        "</td>" +
        '<td><span style="color:' +
        probClr +
        ';font-family:var(--mono);font-weight:700">' +
        pct +
        "%" +
        '<div class="mini-bar-wrap"><div class="mini-bar" style="width:' +
        pct +
        "%;background:" +
        probClr +
        '"></div></div>' +
        "</span></td>" +
        '<td><span class="badge ' +
        predCls +
        '">' +
        c.prediction +
        "</span></td>" +
        '<td><span class="badge ' +
        riskCls +
        '">' +
        c.risk +
        "</span></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderPagination() {
  var total = clientsState.filtered.length;
  var pages = Math.ceil(total / clientsState.perPage);
  var cur = clientsState.page;
  var el = document.getElementById("pagination");

  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }

  var html = "";
  html +=
    '<button class="pg-btn" ' +
    (cur === 1 ? "disabled" : "") +
    ' onclick="goPage(' +
    (cur - 1) +
    ')">‹</button>';

  var lo = Math.max(1, cur - 2),
    hi = Math.min(pages, cur + 2);
  if (lo > 1)
    html +=
      '<button class="pg-btn" onclick="goPage(1)">1</button>' +
      (lo > 2 ? '<span class="pg-dots">…</span>' : "");
  for (var i = lo; i <= hi; i++) {
    html +=
      '<button class="pg-btn' +
      (i === cur ? " pg-active" : "") +
      '" onclick="goPage(' +
      i +
      ')">' +
      i +
      "</button>";
  }
  if (hi < pages)
    html +=
      (hi < pages - 1 ? '<span class="pg-dots">…</span>' : "") +
      '<button class="pg-btn" onclick="goPage(' +
      pages +
      ')">' +
      pages +
      "</button>";

  // Next
  html +=
    '<button class="pg-btn" ' +
    (cur === pages ? "disabled" : "") +
    ' onclick="goPage(' +
    (cur + 1) +
    ')">›</button>';

  el.innerHTML = html;
}

function goPage(p) {
  clientsState.page = p;
  renderClientsTable();
  renderPagination();
  document
    .getElementById("clientsTable")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function doPred() {
  hideAlert("aPred");
  var fields = [
    { wrap: "ff-tenure", inp: "p-tenure", min: 1, max: 120 },
    { wrap: "ff-monthly", inp: "p-monthly", min: 0, max: 500 },
    { wrap: "ff-support", inp: "p-support", min: 0, max: 50 },
  ];
  var valid = true;
  fields.forEach(function (f) {
    var v = parseFloat(document.getElementById(f.inp).value);
    var el = document.getElementById(f.wrap);
    if (isNaN(v) || v < f.min || v > f.max) {
      el.classList.add("invalid");
      valid = false;
    } else {
      el.classList.remove("invalid");
    }
  });
  if (!valid) {
    showAlert("aPred", "Виправте помилки у формі");
    return;
  }

  var body = {
    tenure: parseFloat(document.getElementById("p-tenure").value),
    monthly: parseFloat(document.getElementById("p-monthly").value),
    support: parseFloat(document.getElementById("p-support").value),
    contract: document.getElementById("p-contract").value,
    internet: document.getElementById("p-internet").value,
    security: document.getElementById("p-security").value,
    senior: document.getElementById("p-senior").value,
  };

  var btn = document.getElementById("btnPred");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';

  fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d.ok) throw new Error(d.errors ? JSON.stringify(d.errors) : d.error);
      showProb(d);
    })
    .catch(function (e) {
      showAlert("aPred", "Помилка: " + e.message);
    })
    .finally(function () {
      btn.disabled = false;
      btn.innerHTML = "🔮 Розрахувати ймовірність";
    });
}

function showProb(d) {
  var prob = d.probability;
  var pct = Math.round(prob * 100);
  var color = prob >= 0.7 ? "#ef4444" : prob >= 0.4 ? "#f97316" : "#10b981";
  var bg =
    prob >= 0.7
      ? "rgba(239,68,68,.15)"
      : prob >= 0.4
        ? "rgba(249,115,22,.15)"
        : "rgba(16,185,129,.15)";
  var desc =
    prob >= 0.7
      ? "ВИСОКИЙ РИЗИК — потрібні термінові дії"
      : prob >= 0.4
        ? "СЕРЕДНІЙ РИЗИК — спостерігайте за клієнтом"
        : "НИЗЬКИЙ РИЗИК — стабільний клієнт";

  document.getElementById("probBox").classList.add("show");
  document.getElementById("probNum").textContent = pct + "%";
  document.getElementById("probNum").style.color = color;
  document.getElementById("riskBadge").textContent = d.risk;
  document.getElementById("riskBadge").style.cssText =
    "background:" +
    bg +
    ";color:" +
    color +
    ";font-size:16px;font-weight:700;padding:4px 14px;border-radius:20px";
  document.getElementById("riskDesc").textContent = desc;

  var bar = document.getElementById("probBar");
  bar.style.width = "0%";
  bar.style.background = color;
  setTimeout(function () {
    bar.style.width = pct + "%";
  }, 50);
}

function loadLog() {
  fetch("/api/log")
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      var box = document.getElementById("logBox");
      box.innerHTML = (d.lines || [])
        .map(function (l) {
          var cls =
            l.indexOf("ERROR") !== -1
              ? "le"
              : l.indexOf("WARNING") !== -1
                ? "lw"
                : "li";
          return '<div class="' + cls + '">' + l + "</div>";
        })
        .join("");
      document.getElementById("logCnt").textContent =
        (d.lines || []).length + " рядків";
      box.scrollTop = box.scrollHeight;
    })
    .catch(function () {
      document.getElementById("logBox").textContent =
        "Помилка завантаження логу";
    });
}

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}
function tStyle() {
  return {
    backgroundColor: "#111f33",
    borderColor: "#1a3050",
    borderWidth: 1,
    titleColor: "#dbeafe",
    bodyColor: "#4d7aa8",
  };
}
function lStyle() {
  return { color: "#dbeafe", font: { size: 11 } };
}
function tkStyle() {
  return { color: "#4d7aa8", font: { size: 10 } };
}
function gStyle() {
  return { color: "rgba(26,48,80,.5)" };
}

window.addEventListener("load", loadLog);
