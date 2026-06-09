(function () {
  const reportMeta = document.getElementById("reportMeta");
  const usageTableBody = document.getElementById("usageTableBody");
  const historyTableBody = document.getElementById("historyTableBody");
  const map = document.getElementById("map");
  const heatLayer = document.getElementById("heatLayer");
  const markerLayer = document.getElementById("markerLayer");

  const refreshBtn = document.getElementById("refreshBtn");
  const excelBtn = document.getElementById("excelBtn");
  const csvBtn = document.getElementById("csvBtn");
  const printBtn = document.getElementById("printBtn");

  let barChart = null;
  let pieChart = null;
  let heatmap = null;
  let reportRows = [];
  let heatRowsCache = [];
  let statusRowsCache = [];
  const mapImg = map ? map.querySelector("img") : null;

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
      points.sort((a, b) => a.y - b.y || a.x - b.x);

      .then((r) => r.text())
      const layerWidth = markerLayer.clientWidth || 0;
      const occupied = [];

      const intersects = (a, b) => {
        return !(
          a.left + a.width <= b.left ||
          b.left + b.width <= a.left ||
          a.top + a.height <= b.top ||
          b.top + b.height <= a.top
        );
      };

      const candidateOffsets = [
        { dx: 0, dy: -18 },
        { dx: 0, dy: 12 },
        { dx: 14, dy: -18 },
        { dx: -14, dy: -18 },
        { dx: 14, dy: 12 },
        { dx: -14, dy: 12 },
        { dx: 28, dy: -18 },
        { dx: -28, dy: -18 },
        { dx: 28, dy: 12 },
        { dx: -28, dy: 12 },
        { dx: 0, dy: -28 },
        { dx: 0, dy: 22 },
      ];
      .then((html) => {
        const nav = document.getElementById("navbar");
        const text = String(p.id);
        const labelWidth = Math.max(16, text.length * 6 + 8);
        const labelHeight = 14;

        let best = null;

        candidateOffsets.forEach((cand) => {
          const desiredLeft = p.x + cand.dx - labelWidth / 2;
          const desiredTop = p.y + cand.dy;

          const clampedLeft = Math.max(
            0,
            Math.min(Math.max(0, layerWidth - labelWidth), desiredLeft),
          );
          const clampedTop = Math.max(
            0,
            Math.min(Math.max(0, layerHeight - labelHeight), desiredTop),
          );

          const box = {
            left: clampedLeft,
            top: clampedTop,
            width: labelWidth,
            height: labelHeight,
          };

          const overlaps = occupied.reduce(
            (count, prev) => count + (intersects(box, prev) ? 1 : 0),
            0,
          );

          const centerX = clampedLeft + labelWidth / 2;
          const dxFinal = Math.round(centerX - p.x);
          const dyFinal = Math.round(clampedTop - p.y);
          const penalty = overlaps * 100 + Math.abs(dxFinal) + Math.abs(dyFinal - cand.dy);

          const choice = { box, overlaps, penalty, dxFinal, dyFinal };
          if (!best || choice.penalty < best.penalty) best = choice;
        });

        if (!best) return;
        occupied.push(best.box);
          minutes_since_last: minutesAgo(s.last),
          x: Number(s.x) || 0,
        marker.className = "bin-marker";
      })
      .filter(
        (row) =>
          Number.isFinite(row.bin_id) &&
          row.bin_id > 0 &&
          row.total_empties > 0,
      )
      .sort((a, b) => b.total_empties - a.total_empties || a.bin_id - b.bin_id);
  }

        label.style.setProperty("--label-shift-x", best.dxFinal + "px");
        label.style.setProperty("--label-shift-y", best.dyFinal + 5 + "px");
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
      ? logRows.filter(
          (log) =>
            Number(log && log.bin_id) > 0 &&
            typeof log.timestamp !== "undefined" &&
            log.timestamp !== null &&
            String(log.timestamp).trim() !== "",
        )
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

  function ensureHeatLayerSized(retries = 6) {
    try {
      if (!mapImg || !heatLayer) return;
      const imgRect = mapImg.getBoundingClientRect();

      if (imgRect.height <= 2 && retries > 0) {
        setTimeout(() => ensureHeatLayerSized(retries - 1), 200);
        return;
      }

      heatLayer.style.position = "absolute";
      heatLayer.style.left = "0px";
      heatLayer.style.top = "0px";
      heatLayer.style.width = imgRect.width + "px";
      heatLayer.style.height = imgRect.height + "px";

      if (markerLayer) {
        markerLayer.style.position = "absolute";
        markerLayer.style.left = "0px";
        markerLayer.style.top = "0px";
        markerLayer.style.width = imgRect.width + "px";
        markerLayer.style.height = imgRect.height + "px";
      }

      if (
        heatmap &&
        heatmap._renderer &&
        typeof heatmap._renderer.setDimensions === "function"
      ) {
        heatmap._renderer.setDimensions(
          Math.max(1, heatLayer.clientWidth),
          Math.max(1, heatLayer.clientHeight),
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
          if (c.parentElement === heatLayer) {
            heatLayer.insertBefore(c, heatLayer.firstChild);
          }
        });
      } catch (e) {}

      if (heatLayer.clientHeight <= 2 && retries > 0) {
        setTimeout(() => ensureHeatLayerSized(retries - 1), 300);
      }
    } catch (e) {
      if (retries > 0) setTimeout(() => ensureHeatLayerSized(retries - 1), 200);
    }
  }

  function createHeatmap() {
    if (heatmap) return heatmap;

    try {
      ensureHeatLayerSized();
    } catch (e) {}

    try {
      Array.from(heatLayer.querySelectorAll("canvas")).forEach((c) =>
        c.remove(),
      );
    } catch (e) {}

    try {
      heatmap = h337.create({ container: heatLayer, radius: 40 });
    } catch (e) {
      heatmap = null;
    }

    try {
      const w = Math.max(1, heatLayer.clientWidth);
      const h = Math.max(1, heatLayer.clientHeight);
      if (
        heatmap &&
        heatmap._renderer &&
        typeof heatmap._renderer.setDimensions === "function"
      ) {
        heatmap._renderer.setDimensions(w, h);
      }
    } catch (e) {}

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

    return heatmap;
  }

  function mapToScreenUsingImage(x, y) {
    if (!mapImg || !map) return null;

    const imgRect = mapImg.getBoundingClientRect();
    const containerRect = map.getBoundingClientRect();

    if (!imgRect.width || !imgRect.height) return null;

    const scaleX =
      imgRect.width / (typeof MAP_WIDTH !== "undefined" ? MAP_WIDTH : 1);
    const scaleY =
      imgRect.height / (typeof MAP_HEIGHT !== "undefined" ? MAP_HEIGHT : 1);
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;

    return {
      x: Math.round(Number(x) * scaleX + offsetX),
      y: Math.round(Number(y) * scaleY + offsetY),
    };
  }

  function renderHeatmap(heatRows) {
    createHeatmap();
    ensureHeatLayerSized();
    if (!heatmap) return;

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

  function renderMarkers(statusRows) {
    if (!markerLayer) return;
    markerLayer.innerHTML = "";

    const rows = Array.isArray(statusRows) ? statusRows : [];
    const points = [];

    rows.forEach((bin) => {
      const id = Number(bin && bin.id);
      if (!Number.isFinite(id) || id <= 0) return;

      const x = Number(bin && bin.x);
      const y = Number(bin && bin.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x === 0 && y === 0) return;

      const screen = mapToScreenUsingImage(x, y);
      if (!screen) return;
      if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return;

      points.push({ id, x: Math.round(screen.x), y: Math.round(screen.y) });
    });

    const topEdgePad = 22;
    const bottomEdgePad = 22;
    const dx = 80;
    const dy = 36;
    const layerHeight = markerLayer.clientHeight || 0;

    points.forEach((p) => {
      const aboveNeighbors = points.filter(
        (q) =>
          q !== p && Math.abs(q.x - p.x) <= dx && q.y < p.y && p.y - q.y <= dy,
      ).length;

      const belowNeighbors = points.filter(
        (q) =>
          q !== p && Math.abs(q.x - p.x) <= dx && q.y > p.y && q.y - p.y <= dy,
      ).length;

      let placement = "above";
      if (p.y <= topEdgePad) placement = "below";
      else if (layerHeight > 0 && p.y >= layerHeight - bottomEdgePad) {
        placement = "above";
      } else if (belowNeighbors < aboveNeighbors) {
        placement = "below";
      }

      const marker = document.createElement("div");
      marker.className =
        "bin-marker " + (placement === "below" ? "label-below" : "label-above");
      marker.style.left = p.x + "px";
      marker.style.top = p.y + "px";

      const dot = document.createElement("span");
      dot.className = "bin-dot";
      marker.appendChild(dot);

      const label = document.createElement("span");
      label.className = "bin-marker-label";
      label.textContent = String(p.id);
      marker.appendChild(label);

      markerLayer.appendChild(marker);
    });
  }

  function downloadCsv(rows) {
    const head = ["bin_id", "total_empties"];
    const csvRows = [head].concat(rows.map((r) => [r.bin_id, r.total_empties]));

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
    statusRowsCache = Array.isArray(statusRows) ? statusRows : [];
    heatRowsCache = Array.isArray(heatRows) ? heatRows : [];

    reportRows = normalizeRows(statusRows, rankingRows);

    renderTable(reportRows);
    renderHistory(logRows);
    renderCharts(reportRows);
    ensureHeatLayerSized();
    renderMarkers(statusRowsCache);
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
        ensureHeatLayerSized();
        if (statusRowsCache.length) renderMarkers(statusRowsCache);
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
