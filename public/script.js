const PROXY_URL = "/api";

// عند تحميل الصفحة، نبدأ الدوال الأساسية
document.addEventListener("DOMContentLoaded", () => {
    updateHeaderDate();
    loadDashboard();
    // تحديث ساعة الهيدر كل دقيقة لضمان الدقة
    setInterval(updateHeaderDate, 60000);
});

// ==================================================
// 1. وظائف الهيدر (التاريخ والوقت الحي)
// ==================================================
function updateHeaderDate() {
    const now = new Date();
    const dateOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    const dateStr = now.toLocaleDateString("ar-EG", dateOptions);
    const timeStr = now.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    const dateEl = document.getElementById("current-date-display");
    const timeEl = document.getElementById("current-time-display");

    if (dateEl) dateEl.innerText = dateStr;
    if (timeEl) timeEl.innerText = timeStr;
}

// ==================================================
// 2. دوال التنسيق الذكية (Smart Formatting)
// ==================================================

// دالة تعرض الوقت بذكاء حسب نوع التقرير
// - لو يومي: تعرض "اليوم" أو "غداً" + الساعة
// - لو شهري/أسبوعي: تعرض التاريخ كاملاً
function formatSmartDate(isoString, freq) {
    if (!isoString || isoString === "undefined") return "---";

    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    let freqLower = String(freq).toLowerCase();

    // الحالة 1: تقرير يومي (Daily)
    if (freqLower.includes("daily")) {
        const timePart = date.toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        // مقارنة هل التاريخ هو بكرة ولا النهاردة
        const now = new Date();
        const isTomorrow = date.getDate() !== now.getDate();

        if (isTomorrow) return `غداً - ${timePart}`;
        return `اليوم - ${timePart}`;
    }

    // الحالة 2: تقرير شهري أو دوري (Monthly / Biweekly)
    // نعرض التاريخ كاملاً (يوم شهر | وقت)
    const datePart = date.toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "long",
    });
    const timePart = date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    return `${datePart} | ${timePart}`;
}

// دالة بسيطة لتنسيق وقت الإرسال فقط
function formatLastSentTime(timeString) {
    if (!timeString || timeString === "-" || timeString === "") return "-";
    try {
        let dateObj = new Date(timeString);
        if (isNaN(dateObj.getTime())) return timeString;
        return dateObj.toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch (e) {
        return timeString;
    }
}

// ==================================================
// 3. تحميل الداشبورد (Main Function)
// ==================================================
async function loadDashboard() {
    const container = document.getElementById("reports-container");
    const loading = document.getElementById("loading");
    const pendingList = document.getElementById("pending-list");

    if (!container) return;

    try {
        // طلب البيانات من السيرفر
        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "dashboard" }),
        });

        const reports = await response.json();

        // إخفاء التحميل
        loading.style.display = "none";
        container.innerHTML = "";
        pendingList.innerHTML = "";
        let hasPending = false;

        reports.forEach((rep) => {
            let isSent = rep.status === "Sent";
            let statusClass = isSent ? "status-sent" : "status-pending";

            // --- الذكاء في اختيار الموعد ---
            // لو مبعوت -> اعرض الموعد القادم (Next Deadline)
            // لو لسه -> اعرض الموعد الحالي (Deadline)
            let displayDateISO = isSent ? rep.nextDeadline : rep.deadline;
            let displayLabel = isSent ? "الموعد القادم:" : "الموعد النهائي:";
            let displayColor = isSent ? "text-primary" : "text-danger"; // أزرق للقادم، أحمر للحالي

            // تنسيق التاريخ للعرض
            let formattedDate = formatSmartDate(displayDateISO, rep.freq);

            // الشارات (Badges)
            let badgeHTML = isSent
                ? `<span class="badge bg-success mb-2">تم الإرسال</span>`
                : `<span class="badge bg-warning text-dark mb-2">في الانتظار</span>`;

            // --- معالجة العداد (Counter) ---
            // حماية من الـ undefined وتصحيح بصري
            let actual = rep.actualCount !== undefined ? rep.actualCount : 0;
            let target = rep.targetCount !== undefined ? rep.targetCount : "?";

            // قاعدة بصرية: لو الحالة "Sent" والعداد "0" (بسبب خطأ ما)، اعرض "1"
            if (isSent && actual === 0) actual = 1;

            let counterText = `تم تسليم ${actual} من ${target}`;
            // لو المستهدف غير محدد (As Needed)، نعرض الرقم فقط
            if (target === "∞" || target === "?")
                counterText = `تم تسليم ${actual}`;

            // وقت الإرسال الفعلي
            let lastSentDisplay = isSent
                ? formatLastSentTime(rep.lastSent)
                : "-";

            // --- بناء الكارت (HTML Card) ---
            let card = `
                <div class="col-md-6 col-lg-4">
                    <div class="card card-report ${statusClass} h-100 p-4">
                        <div class="status-indicator"></div>

                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="fw-bold m-0 text-dark" style="line-height: 1.4;">${rep.name}</h5>
                            ${isSent ? '<i class="fas fa-check-circle text-success fa-lg mt-1"></i>' : '<i class="fas fa-clock text-warning fa-lg mt-1"></i>'}
                        </div>

                        <div class="d-flex justify-content-between align-items-center mb-3">
                            ${badgeHTML}
                            <span class="counter-badge small bg-light border px-2 py-1 rounded text-secondary fw-bold">
                                <i class="fas fa-check-double me-1"></i> ${counterText}
                            </span>
                        </div>

                        <div class="text-muted small mt-auto pt-3 border-top">
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-sync-alt me-1"></i> التكرار:</span>
                                <strong class="text-dark">${rep.freq}</strong>
                            </div>

                            <!-- الموعد الذكي -->
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="far fa-calendar-alt me-1"></i> ${displayLabel}</span>
                                <strong class="${displayColor}" dir="rtl">${formattedDate}</strong>
                            </div>

                            <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                                <span class="text-success fw-bold"><i class="fas fa-paper-plane me-1"></i> وقت الإرسال:</span>
                                <strong dir="rtl" class="text-dark">${lastSentDisplay}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += card;

            // --- إضافة للقائمة المنبثقة (Alert Modal) ---
            // تظهر فقط للتقارير المعلقة (Pending)
            if (!isSent) {
                hasPending = true;
                // في القائمة المختصرة، نعرض الوقت فقط
                let pendingTime = formatSmartDate(rep.deadline, rep.freq);
                pendingList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                        <span class="fw-bold">${rep.name}</span>
                        <span class="badge bg-danger rounded-pill" dir="rtl">${pendingTime}</span>
                    </li>`;
            }
        });

        // إظهار الـ Modal لو فيه تقارير متأخرة
        if (hasPending) {
            const alertModalElement = document.getElementById("alertModal");
            if (alertModalElement) {
                const alertModal = new bootstrap.Modal(alertModalElement);
                alertModal.show();
            }
        }
    } catch (err) {
        console.error(err);
        loading.innerHTML = `<div class="alert alert-danger">خطأ في الاتصال بالسيرفر: ${err.message}</div>`;
    }
}

// ==================================================
// 4. وظائف سجل الأرشيف (History Fetch)
// ==================================================
async function fetchHistory() {
    const dateVal = document.getElementById("history-date").value;
    const tbody = document.getElementById("history-table-body");

    if (!dateVal) {
        alert("يرجى اختيار التاريخ أولاً");
        return;
    }

    tbody.innerHTML =
        '<tr><td colspan="3" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> جاري البحث...</td></tr>';

    try {
        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "history", date: dateVal }),
        });

        const logs = await response.json();
        tbody.innerHTML = "";

        if (logs.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="3" class="text-center py-4 text-muted fw-bold">لا توجد سجلات لهذا اليوم</td></tr>';
            return;
        }

        logs.forEach((log) => {
            let badge = log.action.includes("Sent")
                ? "bg-success"
                : "bg-secondary";
            let actionText = log.action === "Sent" ? "تم الإرسال" : log.action;

            // تنسيق وقت الأرشيف
            let timeFormatted = formatLastSentTime(`2020-01-01 ${log.time}`);

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-primary" dir="ltr">${timeFormatted}</td> 
                    <td>${log.name}</td>
                    <td><span class="badge ${badge}">${actionText}</span></td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger fw-bold">خطأ: ${err.message}</td></tr>`;
    }
}
