(function () {
  const reportMeta = document.getElementById("reportMeta");
  const usageTableBody = document.getElementById("usageTableBody");
  const historyTableBody = document.getElementById("historyTableBody");
  const map = document.getElementById("map");
  const heatLayer = document.getElementById("heatLayer");

  const refreshBtn = document.getElementById("refreshBtn");
  const excelBtn = document.getElementById("excelBtn");
  const csvBtn = document.getElementById("csvBtn");
  const printBtn = document.getElementById("printBtn");

  let barChart = null;
  let pieChart = null;
  let heatmap = null;
  let reportRows = [];
  let heatRowsCache = [];

  function parseTimestamp(ts) {
    if (!ts) return null;
    const s = String(ts).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
      return new Date(s.replace(" ", "T") + "Z");
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function minutesAgo(ts) {
    const d = parseTimestamp(ts);
    if (!d) return null;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  }

  function formatLocal(ts) {
    const d = parseTimestamp(ts);
    if (!d) return "never";
    try {
      return d.toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" });
    } catch (e) {
      return d.toLocaleString();
    }
  }

  function setMeta() {
    reportMeta.textContent =
      "Generated: " +
      new Intl.DateTimeFormat("fi-FI", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());
  }

  function loadNavbar() {
    fetch("/components/navbar.html")
      .then((r) => r.text())
      .then((html) => {
        const nav = document.getElementById("navbar");
        if (nav) nav.innerHTML = html;
        if (window.markActiveNav) window.markActiveNav();
        if (window.adjustNavbarAuth) window.adjustNavbarAuth();
      })
      .catch(() => {});
  }

  function normalizeRows(statusRows, rankingRows) {
    const usageByBin = {};
    rankingRows.forEach((r) => {
      if (!r) return;
      const binId = Number(r.bin_id);
      if (!Number.isFinite(binId) || binId <= 0) return;
      usageByBin[String(binId)] = Number(r.total) || 0;
    });

    return statusRows
      .map((s) => {
        const id = Number(s.id);
        return {
          bin_id: id,
          total_empties: usageByBin[String(id)] || 0,
          last_emptied: s.last || null,
          minutes_since_last: minutesAgo(s.last),
          x: Number(s.x) || 0,
          y: Number(s.y) || 0,
        };
      })
      .filter((row) => Number.isFinite(row.bin_id) && row.bin_id > 0)
      .sort((a, b) => b.total_empties - a.total_empties || a.bin_id - b.bin_id);
  }

  function renderTable(rows) {
    usageTableBody.innerHTML = "";
    if (!rows.length) {
      usageTableBody.innerHTML = '<tr><td colspan="2">No data</td></tr>';
      return;
    }

    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + r.bin_id + "</td>" + "<td>" + r.total_empties + "</td>";
      usageTableBody.appendChild(tr);
    });
  }

  function renderHistory(logRows) {
    if (!historyTableBody) return;

    const filteredLogs = Array.isArray(logRows)
      ? logRows.filter((log) => Number(log && log.bin_id) > 0)
      : [];

    historyTableBody.innerHTML = "";
    if (!filteredLogs.length) {
      historyTableBody.innerHTML =
        '<tr><td colspan="3">No emptying events</td></tr>';
      return;
    }

    filteredLogs.forEach((log) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        (typeof log.id === "undefined" ? "" : log.id) +
        "</td>" +
        "<td>" +
        (typeof log.bin_id === "undefined" ? "" : log.bin_id) +
        "</td>" +
        "<td>" +
        formatLocal(log.timestamp) +
        "</td>";
      historyTableBody.appendChild(tr);
    });
  }

  function buildPalette(size) {
    const base = [
      "#1f77b4",
      "#2ca02c",
      "#ff7f0e",
      "#d62728",
      "#17a2b8",
      "#8c564b",
      "#9467bd",
      "#bcbd22",
      "#7f7f7f",
      "#e377c2",
    ];
    const colors = [];
    for (let i = 0; i < size; i += 1) colors.push(base[i % base.length]);
    return colors;
  }

  function renderCharts(rows) {
    const labels = rows.map((r) => "Bin " + r.bin_id);
    const values = rows.map((r) => r.total_empties);

    if (barChart) barChart.destroy();
    if (pieChart) pieChart.destroy();

    const barCtx = document.getElementById("barChart").getContext("2d");
    const pieCtx = document.getElementById("pieChart").getContext("2d");

    barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Empties",
            data: values,
            backgroundColor: "#2f80d1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              minRotation: 90,
              maxRotation: 90,
            },
          },
          y: { beginAtZero: true },
        },
        plugins: { legend: { display: false } },
      },
    });

    const top = rows.slice(0, 10);
    pieChart = new Chart(pieCtx, {
      type: "doughnut",
      data: {
        labels: top.map((r) => "Bin " + r.bin_id),
        datasets: [
          {
            data: top.map((r) => r.total_empties),
            backgroundColor: buildPalette(top.length),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  function prepareHeatLayer() {
    const img = map.querySelector("img");
    if (!img) return;
    const mapRect = map.getBoundingClientRect();
    const rect = img.getBoundingClientRect();
    heatLayer.style.position = "absolute";
    heatLayer.style.left =
      Math.max(0, Math.round(rect.left - mapRect.left)) + "px";
    heatLayer.style.top =
      Math.max(0, Math.round(rect.top - mapRect.top)) + "px";
    heatLayer.style.width = rect.width + "px";
    heatLayer.style.height = rect.height + "px";

    if (
      heatmap &&
      heatmap._renderer &&
      typeof heatmap._renderer.setDimensions === "function"
    ) {
      heatmap._renderer.setDimensions(
        Math.max(1, Math.round(rect.width)),
        Math.max(1, Math.round(rect.height)),
      );
    }

    try {
      Array.from(heatLayer.querySelectorAll("canvas")).forEach((c) => {
        c.style.position = "absolute";
        c.style.left = "0";
        c.style.top = "0";
        c.style.width = "100%";
        c.style.height = "100%";
        c.style.pointerEvents = "none";
        c.style.zIndex = "2";
      });
    } catch (e) {}
  }

  function mapToScreenUsingImage(x, y) {
    const img = map.querySelector("img");
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: (Number(x) * rect.width) / MAP_WIDTH,
      y: (Number(y) * rect.height) / MAP_HEIGHT,
    };
  }

  function renderHeatmap(heatRows) {
    if (!heatmap) {
      heatmap = h337.create({ container: heatLayer, radius: 40 });
      prepareHeatLayer();
    }

    const points = [];
    let max = 1;

    heatRows.forEach((p) => {
      if (!p) return;
      const sx = Number(p.x);
      const sy = Number(p.y);
      if (!sx && !sy) return;
      const screen = mapToScreenUsingImage(sx, sy);
      if (!screen) return;
      if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return;
      const value = Number(p.value) || 0;
      max = Math.max(max, value);
      points.push({ x: Math.round(screen.x), y: Math.round(screen.y), value });
    });

    heatmap.setData({ max, data: points });
  }

  function downloadCsv(rows) {
    const head = [
      "bin_id",
      "total_empties",
      "last_emptied",
      "minutes_since_last",
      "x",
      "y",
    ];
    const csvRows = [head].concat(
      rows.map((r) => [
        r.bin_id,
        r.total_empties,
        r.last_emptied || "",
        r.minutes_since_last === null ? "" : r.minutes_since_last,
        r.x,
        r.y,
      ]),
    );

    const csv = csvRows
      .map((line) =>
        line
          .map((cell) => '"' + String(cell).replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "bin_usage_report_" +
      new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") +
      ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadExcel(rows) {
    if (!window.XLSX) return;

    const excelRows = rows.map((r) => ({
      bin_id: r.bin_id,
      total_empties: r.total_empties,
      last_emptied: r.last_emptied || "",
      minutes_since_last:
        r.minutes_since_last === null ? "" : r.minutes_since_last,
      map_x: r.x,
      map_y: r.y,
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BinUsage");
    XLSX.writeFile(
      wb,
      "bin_usage_report_" +
        new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") +
        ".xlsx",
    );
  }

  async function refreshReport() {
    setMeta();

    const [statusRes, rankingRes, heatmapRes, logsRes] = await Promise.all([
      fetch("/api/status"),
      fetch("/api/ranking"),
      fetch("/api/heatmap"),
      fetch("/api/logs"),
    ]);

    const statusRows = await statusRes.json();
    const rankingRows = await rankingRes.json();
    const heatRows = await heatmapRes.json();
    const logRows = await logsRes.json();
    heatRowsCache = Array.isArray(heatRows) ? heatRows : [];

    reportRows = normalizeRows(statusRows, rankingRows);

    renderTable(reportRows);
    renderHistory(logRows);
    renderCharts(reportRows);
    prepareHeatLayer();
    renderHeatmap(heatRowsCache);
  }

  function wireEvents() {
    if (refreshBtn) refreshBtn.addEventListener("click", () => refreshReport());
    if (csvBtn) csvBtn.addEventListener("click", () => downloadCsv(reportRows));
    if (excelBtn)
      excelBtn.addEventListener("click", () => downloadExcel(reportRows));
    if (printBtn) printBtn.addEventListener("click", () => window.print());

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        prepareHeatLayer();
        if (heatRowsCache.length) renderHeatmap(heatRowsCache);
      }, 120);
    });
  }

  async function init() {
    loadNavbar();
    wireEvents();

    const img = map.querySelector("img");
    if (img && !img.complete) {
      img.addEventListener(
        "load",
        () => {
          refreshReport().catch(() => {});
        },
        { once: true },
      );
      return;
    }

    await refreshReport();
  }

  init().catch(() => {
    usageTableBody.innerHTML =
      '<tr><td colspan="2">Failed to load report data</td></tr>';
    if (historyTableBody) {
      historyTableBody.innerHTML =
        '<tr><td colspan="3">Failed to load report data</td></tr>';
    }
  });
})();
