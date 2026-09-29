/* =========================================================
   AROGYACONNECT
   PATIENT MONITOR
========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
    ====================================================== */

    const REFRESH_INTERVAL = 5000;

    let refreshTimer = null;
    let currentPatient = null;
    let currentPatientId = null;


    /* =====================================================
       DOM HELPER
    ====================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }


    /* =====================================================
       URL PATIENT
    ====================================================== */

    function getPatientParameter() {

        const params = new URLSearchParams(
            window.location.search
        );

        const patientCode = params.get("patient");

        const patientId = params.get("patient_id");

        return {
            patientCode: patientCode
                ? patientCode.trim()
                : null,

            patientId: patientId
                ? Number(patientId)
                : null
        };
    }


    /* =====================================================
       ERROR HANDLING
    ====================================================== */

    function showError(message) {

        const errorBox = $("monitorError");
        const errorMessage = $("monitorErrorMessage");

        if (errorMessage) {
            errorMessage.textContent = message;
        }

        if (errorBox) {
            errorBox.style.display = "flex";
        }
    }


    function hideError() {

        const errorBox = $("monitorError");

        if (errorBox) {
            errorBox.style.display = "none";
        }
    }


    /* =====================================================
       DATE FORMATTING
    ====================================================== */

    function formatDateTime(value) {

        if (!value) {
            return "--";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }


    function formatTime(value) {

        if (!value) {
            return "--";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    /* =====================================================
       NUMBER FORMATTING
    ====================================================== */

    function numberValue(value, decimals = 2) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "--";
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "--";
        }

        return number.toFixed(decimals);
    }


    /* =====================================================
       INITIALS
    ====================================================== */

    function getInitials(name) {

        if (!name) {
            return "P";
        }

        const parts = String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }


    /* =====================================================
       STATUS BADGE
    ====================================================== */

    function setStatusBadge(
        elementId,
        text,
        type = ""
    ) {

        const element = $(elementId);

        if (!element) {
            return;
        }

        element.textContent = text;

        element.className =
            "sensor-status-badge";

        if (type) {
            element.classList.add(type);
        }
    }


    /* =====================================================
       PATIENT RESOLUTION
    ====================================================== */

    async function resolvePatient() {

        const parameter = getPatientParameter();


        /*
         * First priority:
         * patient code such as P001
         */

        if (parameter.patientCode) {

            try {

                const patient =
                    await ArogyaAPI.getPatientByCode(
                        parameter.patientCode
                    );

                if (patient) {
                    return patient;
                }

            } catch (error) {

                console.warn(
                    "Patient code lookup failed:",
                    error
                );
            }
        }


        /*
         * Second priority:
         * numeric database ID
         */

        if (
            parameter.patientId &&
            Number.isFinite(parameter.patientId)
        ) {

            return await ArogyaAPI.getPatient(
                parameter.patientId
            );
        }


        /*
         * Third priority:
         * current monitored patient
         */

        try {

            const current =
                await ArogyaAPI.getCurrentActivePatient();

            if (
                current &&
                current.patient_id
            ) {

                return await ArogyaAPI.getPatient(
                    current.patient_id
                );
            }

            if (
                current &&
                current.id
            ) {

                return current;
            }

        } catch (error) {

            console.warn(
                "Current patient lookup failed:",
                error
            );
        }


        /*
         * Final fallback:
         * first patient in database
         *
         * This does NOT create sensor data.
         */

        const patients =
            await ArogyaAPI.getPatients();

        if (
            Array.isArray(patients) &&
            patients.length > 0
        ) {
            return patients[0];
        }

        return null;
    }


    /* =====================================================
       PATIENT HEADER
    ====================================================== */

    function renderPatient(patient) {

        if (!patient) {
            return;
        }

        const name =
            patient.full_name ||
            patient.name ||
            "Unknown Patient";


        setText(
            "patientName",
            name
        );


        const code =
            patient.patient_code ||
            "--";


        const age =
            patient.age !== null &&
            patient.age !== undefined
                ? `${patient.age} years`
                : "--";


        const gender =
            patient.gender ||
            "--";


        const bloodGroup =
            patient.blood_group ||
            "--";


        const diagnosis =
            patient.diagnosis ||
            "No diagnosis recorded";


        setText(
            "patientDetails",
            `${code} • ${age} • ${gender} • Blood group ${bloodGroup} • ${diagnosis}`
        );


        setText(
            "patientAvatar",
            getInitials(name)
        );


        const condition =
            patient.diagnosis ||
            "Under monitoring";


        setText(
            "patientCondition",
            condition
        );
    }


    /* =====================================================
       MONITORING STATUS
    ====================================================== */

    function renderMonitoringStatus(statusData) {

        const dot =
            $("monitoringStatusDot");

        const text =
            $("monitoringStatusText");


        const hasData =
            Boolean(
                statusData &&
                statusData.has_data
            );


        if (hasData) {

            if (dot) {
                dot.classList.add("active");
                dot.classList.remove("inactive");
            }

            if (text) {
                text.textContent =
                    "Monitoring active";
            }

            return;
        }


        if (dot) {

            dot.classList.remove("active");
            dot.classList.add("inactive");
        }


        if (text) {

            text.textContent =
                "No recent data";
        }
    }


    /* =====================================================
       SENSOR DATA
    ====================================================== */

    function renderSensorData(reading, statusData) {

        if (!reading) {
            return;
        }


        /* Temperature */

        setText(
            "temperatureValue",
            numberValue(
                reading.temperature,
                2
            )
        );


        setStatusBadge(
            "temperatureStatus",
            "Recorded",
            "normal"
        );


        /* Fall */

        const fallDetected =
            Boolean(
                reading.fall_detected
            );


        setText(
            "fallState",
            fallDetected
                ? "Fall detected"
                : "No fall detected"
        );


        setText(
            "fallValue",
            numberValue(
                reading.force_fall,
                2
            )
        );


        setStatusBadge(
            "fallStatus",
            fallDetected
                ? "Attention"
                : "Normal",
            fallDetected
                ? "danger"
                : "normal"
        );


        /* Position */

        const position =
            reading.position_status ||
            statusData?.position_status ||
            "Unknown";


        const duration =
            reading.position_duration_seconds !== null &&
            reading.position_duration_seconds !== undefined
                ? reading.position_duration_seconds
                : statusData?.position_duration_seconds;


        setText(
            "positionValue",
            position
        );


        setText(
            "positionDuration",
            duration !== null &&
            duration !== undefined
                ? formatDuration(duration)
                : "--"
        );


        const positionAttention =
            Number(duration || 0) > 0 &&
            (
                String(position).toLowerCase() ===
                "prolonged"
            );


        setStatusBadge(
            "positionStatus",
            positionAttention
                ? "Attention"
                : "Recorded",
            positionAttention
                ? "attention"
                : "normal"
        );


        /* Urine */

        setText(
            "urineValue",
            numberValue(
                reading.urine_distance,
                2
            )
        );


        setStatusBadge(
            "urineStatus",
            "Recorded",
            "normal"
        );


        /* IV */

        setText(
            "ivValue",
            numberValue(
                reading.iv_distance,
                2
            )
        );


        setStatusBadge(
            "ivStatus",
            "Recorded",
            "normal"
        );


        /* Gyroscope */

        setText(
            "gyroX",
            numberValue(
                reading.gyro_x,
                4
            )
        );


        setText(
            "gyroY",
            numberValue(
                reading.gyro_y,
                4
            )
        );


        setText(
            "gyroZ",
            numberValue(
                reading.gyro_z,
                4
            )
        );


        /* Last update */

        setText(
            "lastUpdate",
            formatDateTime(
                reading.recorded_at
            )
        );
    }


    /* =====================================================
       DURATION
    ====================================================== */

    function formatDuration(seconds) {

        const totalSeconds =
            Number(seconds);

        if (
            !Number.isFinite(totalSeconds)
        ) {
            return "--";
        }

        if (totalSeconds < 60) {
            return `${Math.round(totalSeconds)} sec`;
        }


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const remainingSeconds =
            Math.round(
                totalSeconds % 60
            );


        if (minutes < 60) {

            return `${minutes} min ${remainingSeconds} sec`;
        }


        const hours =
            Math.floor(
                minutes / 60
            );


        const remainingMinutes =
            minutes % 60;


        return `${hours} hr ${remainingMinutes} min`;
    }


    /* =====================================================
       NO DATA UI
    ====================================================== */

    function showNoSensorData() {

        const noData =
            $("noSensorData");

        const grid =
            $("sensorMonitorGrid");


        if (noData) {
            noData.style.display = "block";
        }

        if (grid) {
            grid.style.display = "none";
        }


        setText(
            "monitoringStatusText",
            "No sensor data"
        );


        const dot =
            $("monitoringStatusDot");

        if (dot) {

            dot.classList.remove("active");
            dot.classList.add("inactive");
        }


        setText(
            "temperatureValue",
            "--"
        );

        setText(
            "fallState",
            "--"
        );

        setText(
            "positionValue",
            "--"
        );

        setText(
            "positionDuration",
            "--"
        );

        setText(
            "urineValue",
            "--"
        );

        setText(
            "ivValue",
            "--"
        );

        setText(
            "gyroX",
            "--"
        );

        setText(
            "gyroY",
            "--"
        );

        setText(
            "gyroZ",
            "--"
        );

        setText(
            "lastUpdate",
            "--"
        );
    }


    function showSensorData() {

        const noData =
            $("noSensorData");

        const grid =
            $("sensorMonitorGrid");


        if (noData) {
            noData.style.display = "none";
        }

        if (grid) {
            grid.style.display = "grid";
        }
    }


    /* =====================================================
       ALERT SEVERITY
    ====================================================== */

    function normalizeSeverity(severity) {

        const value =
            String(
                severity || "normal"
            ).toLowerCase();


        if (
            value === "danger" ||
            value === "critical" ||
            value === "emergency"
        ) {
            return "danger";
        }


        if (
            value === "attention" ||
            value === "warning"
        ) {
            return "warning";
        }


        return "normal";
    }


    /* =====================================================
       ALERTS
    ====================================================== */

    function renderAlerts(alerts) {

        const container =
            $("monitorAlerts");


        if (!container) {
            return;
        }


        if (
            !Array.isArray(alerts) ||
            alerts.length === 0
        ) {

            container.innerHTML = `
                <div class="monitor-alert-empty">
                    No alerts recorded for this patient.
                </div>
            `;

            updateAlertCount(0);

            return;
        }


        /*
         * Newest alerts first
         */

        const sorted =
            [...alerts].sort(
                (a, b) =>
                    new Date(
                        b.created_at || 0
                    ) -
                    new Date(
                        a.created_at || 0
                    )
            );


        const recent =
            sorted.slice(0, 5);


        const unacknowledged =
            sorted.filter(
                alert =>
                    !Boolean(
                        alert.acknowledged
                    )
            ).length;


        updateAlertCount(
            unacknowledged
        );


        container.innerHTML =
            recent.map(
                alert =>
                    createAlertHTML(alert)
            ).join("");
    }


    function createAlertHTML(alert) {

        const severity =
            normalizeSeverity(
                alert.severity
            );


        const title =
            alert.alert_type ||
            "Patient alert";


        const message =
            alert.message ||
            "Alert recorded for this patient.";


        const time =
            formatTime(
                alert.created_at
            );


        const acknowledged =
            Boolean(
                alert.acknowledged
            );


        return `
            <div class="monitor-alert-item ${severity}">

                <div class="monitor-alert-indicator"></div>

                <div>

                    <div class="monitor-alert-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="monitor-alert-message">
                        ${escapeHTML(message)}
                    </div>

                </div>

                <div class="monitor-alert-time">
                    ${escapeHTML(time)}
                    ${acknowledged ? " • Acknowledged" : ""}
                </div>

            </div>
        `;
    }


    /* =====================================================
       ALERT COUNT
    ====================================================== */

    function updateAlertCount(count) {

        const badge =
            $("alertCount");


        if (!badge) {
            return;
        }


        badge.textContent =
            String(count);


        badge.style.display =
            count > 0
                ? "inline-flex"
                : "none";
    }


    /* =====================================================
       HTML ESCAPE
    ====================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* =====================================================
       LOAD MONITOR
    ====================================================== */

    async function loadMonitor() {

        hideError();


        try {

            /*
             * Resolve patient only once.
             */

            if (!currentPatient) {

                currentPatient =
                    await resolvePatient();


                if (!currentPatient) {

                    throw new Error(
                        "No patient record could be found."
                    );
                }


                currentPatientId =
                    Number(
                        currentPatient.id
                    );


                if (
                    !Number.isFinite(
                        currentPatientId
                    )
                ) {

                    throw new Error(
                        "The patient record does not contain a valid ID."
                    );
                }


                renderPatient(
                    currentPatient
                );
            }


            /*
             * Get current sensor status.
             */

            const statusData =
                await ArogyaAPI.getPatientSensorStatus(
                    currentPatientId
                );


            renderMonitoringStatus(
                statusData
            );


            /*
             * Get latest reading.
             */

            const latestResponse =
                await ArogyaAPI.getLatestSensorReading(
                    currentPatientId
                );


            const hasData =
                Boolean(
                    latestResponse &&
                    latestResponse.has_data &&
                    latestResponse.reading
                );


            if (!hasData) {

                showNoSensorData();

            } else {

                showSensorData();

                renderSensorData(
                    latestResponse.reading,
                    statusData
                );
            }


            /*
             * Get patient alerts.
             */

            const alerts =
                await ArogyaAPI.getPatientAlerts(
                    currentPatientId
                );


            renderAlerts(
                Array.isArray(alerts)
                    ? alerts
                    : []
            );


            /*
             * Current date.
             */

            setText(
                "currentDate",
                new Date().toLocaleDateString(
                    [],
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                )
            );

        } catch (error) {

            console.error(
                "Patient monitor error:",
                error
            );


            showError(
                error.message ||
                "Unable to load patient monitoring data."
            );
        }
    }


    /* =====================================================
       REFRESH
    ====================================================== */

    function startAutoRefresh() {

        stopAutoRefresh();


        refreshTimer =
            window.setInterval(
                async function () {

                    await loadMonitor();

                },
                REFRESH_INTERVAL
            );
    }


    function stopAutoRefresh() {

        if (refreshTimer) {

            window.clearInterval(
                refreshTimer
            );

            refreshTimer = null;
        }
    }


    /* =====================================================
       BUTTONS
    ====================================================== */

    function setupButtons() {

        const refreshButton =
            $("refreshMonitor");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                async function () {

                    refreshButton.disabled =
                        true;

                    refreshButton.textContent =
                        "Refreshing...";


                    try {

                        await loadMonitor();

                    } finally {

                        refreshButton.disabled =
                            false;

                        refreshButton.textContent =
                            "↻ Refresh";
                    }
                }
            );
        }


        const dashboardButton =
            $("backToDashboard");


        if (dashboardButton) {

            dashboardButton.addEventListener(
                "click",
                function () {

                    const role =
                        typeof Auth !== "undefined" &&
                        typeof Auth.getRole === "function"
                            ? Auth.getRole()
                            : localStorage.getItem(
                                "arogya_role"
                            );


                    if (role === "doctor") {

                        window.location.href =
                            "doctor-dashboard.html";

                    } else {

                        window.location.href =
                            "nurse-dashboard.html";
                    }
                }
            );
        }
    }


    /* =====================================================
       PAGE INIT
    ====================================================== */

    async function init() {

        /*
         * Auth protection.
         */

        if (
            typeof Auth !== "undefined" &&
            typeof Auth.requireAuthentication === "function"
        ) {

            const authenticated =
                Auth.requireAuthentication();

            if (authenticated === false) {
                return;
            }
        }


        setupButtons();


        await loadMonitor();


        startAutoRefresh();
    }


    /* =====================================================
       CLEANUP
    ====================================================== */

    window.addEventListener(
        "beforeunload",
        function () {

            stopAutoRefresh();

        }
    );


    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ArogyaPatientMonitor = {
        load: loadMonitor,
        refresh: loadMonitor
    };

})();