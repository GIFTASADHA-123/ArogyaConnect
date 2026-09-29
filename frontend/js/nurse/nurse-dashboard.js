/* =========================================================
   AROGYACONNECT
   NURSE DASHBOARD
   LIVE ESP32 SENSOR DATA
========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const REFRESH_INTERVAL = 5000;


/* =========================================================
   STATE
========================================================= */

let patients = [];
let currentPatient = null;
let currentAlerts = [];
let refreshTimer = null;
let refreshRunning = false;


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeDashboard();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeDashboard() {

    console.log(
        "=============================================="
    );

    console.log(
        "ArogyaConnect Nurse Dashboard"
    );

    console.log(
        "Live ESP32 monitoring enabled"
    );

    console.log(
        "=============================================="
    );


    updateCurrentDate();

    setupRefreshButton();

    await loadDashboard();


    refreshTimer =
        window.setInterval(
            refreshDashboard,
            REFRESH_INTERVAL
        );
}


/* =========================================================
   DASHBOARD LOAD
========================================================= */

async function loadDashboard() {

    if (refreshRunning) {
        return;
    }

    refreshRunning = true;

    try {

        showDashboardError("");

        console.log(
            "Loading patients..."
        );


        /* -------------------------------------------------
           GET PATIENTS
        ------------------------------------------------- */

        const response =
            await window.ArogyaAPI.getPatients(
                {
                    active: false,
                    limit: 1000
                }
            );


        patients =
            normalizePatients(
                response
            );


        console.log(
            "Patients:",
            patients
        );


        setText(
            "totalPatients",
            patients.length
        );


        /* -------------------------------------------------
           FIND PATIENT WITH LATEST SENSOR DATA
        ------------------------------------------------- */

        currentPatient =
            await findPatientWithSensorData(
                patients
            );


        /* -------------------------------------------------
           IF NO SENSOR DATA
        ------------------------------------------------- */

        if (!currentPatient) {

            console.warn(
                "No sensor reading found."
            );

            showNoCurrentPatient();

            renderNoSensorData();

            showDashboardConnection(
                false
            );

            await loadAlertsForNoPatient();

            renderPatientList();

            updateLastRefresh();

            return;
        }


        console.log(
            "Current hardware patient:",
            currentPatient
        );


        /* -------------------------------------------------
           LOAD CURRENT PATIENT
        ------------------------------------------------- */

        await loadCurrentPatient(
            currentPatient
        );


        /* -------------------------------------------------
           ALERTS
        ------------------------------------------------- */

        await loadCurrentPatientAlerts();


        /* -------------------------------------------------
           PATIENT LIST
        ------------------------------------------------- */

        renderPatientList();


        /* -------------------------------------------------
           SUMMARY
        ------------------------------------------------- */

        updateSummary();


        /* -------------------------------------------------
           REFRESH TIME
        ------------------------------------------------- */

        updateLastRefresh();


    } catch (error) {

        console.error(
            "Nurse dashboard error:",
            error
        );


        showDashboardError(
            "Unable to load live patient data. Check that the ArogyaConnect backend is running."
        );


        showDashboardConnection(
            false
        );

    } finally {

        refreshRunning = false;

    }
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDashboard() {

    if (refreshRunning) {
        return;
    }


    refreshRunning = true;


    try {

        console.log(
            "Refreshing ESP32 sensor data..."
        );


        /* -------------------------------------------------
           GET PATIENTS
        ------------------------------------------------- */

        const response =
            await window.ArogyaAPI.getPatients(
                {
                    active: false,
                    limit: 1000
                }
            );


        patients =
            normalizePatients(
                response
            );


        setText(
            "totalPatients",
            patients.length
        );


        /* -------------------------------------------------
           FIND CURRENT HARDWARE PATIENT
        ------------------------------------------------- */

        currentPatient =
            await findPatientWithSensorData(
                patients
            );


        if (!currentPatient) {

            showNoCurrentPatient();

            renderNoSensorData();

            showDashboardConnection(
                false
            );

            updateSummary();

            updateLastRefresh();

            return;
        }


        /* -------------------------------------------------
           LOAD LIVE DATA
        ------------------------------------------------- */

        await loadCurrentPatient(
            currentPatient
        );


        /* -------------------------------------------------
           ALERTS
        ------------------------------------------------- */

        await loadCurrentPatientAlerts();


        /* -------------------------------------------------
           PATIENT LIST
        ------------------------------------------------- */

        renderPatientList();


        /* -------------------------------------------------
           SUMMARY
        ------------------------------------------------- */

        updateSummary();


        /* -------------------------------------------------
           LAST REFRESH
        ------------------------------------------------- */

        updateLastRefresh();


        hideDashboardError();


    } catch (error) {

        console.error(
            "Live dashboard refresh error:",
            error
        );


        showDashboardError(
            "Live sensor update failed. Retrying automatically..."
        );


        showDashboardConnection(
            false
        );

    } finally {

        refreshRunning = false;

    }
}


/* =========================================================
   FIND PATIENT WITH SENSOR DATA
========================================================= */

async function findPatientWithSensorData(
    patientList
) {

    /*
     * Hardware bridge currently sends data to
     * HARDWARE_PATIENT_ID = 1.
     *
     * Therefore check patient 1 first.
     */

    const patientOne =
        patientList.find(
            patient =>
                Number(
                    patient.id
                ) === 1
        );


    if (patientOne) {

        try {

            const latest =
                await window.ArogyaAPI
                    .getLatestSensorReading(
                        patientOne.id
                    );


            if (
                hasSensorReading(
                    latest
                )
            ) {

                console.log(
                    "Hardware patient detected:",
                    patientOne
                );

                return patientOne;
            }

        } catch (error) {

            console.warn(
                "Unable to read patient 1:",
                error
            );
        }
    }


    /*
     * If patient 1 has no data,
     * check the remaining patients.
     */

    for (
        const patient of patientList
    ) {

        if (
            Number(
                patient.id
            ) === 1
        ) {
            continue;
        }


        try {

            const latest =
                await window.ArogyaAPI
                    .getLatestSensorReading(
                        patient.id
                    );


            if (
                hasSensorReading(
                    latest
                )
            ) {

                return patient;
            }

        } catch (error) {

            console.warn(
                "Sensor check failed for patient:",
                patient.id,
                error
            );
        }
    }


    return null;
}


/* =========================================================
   LOAD CURRENT PATIENT
========================================================= */

async function loadCurrentPatient(
    patient
) {

    if (!patient) {

        showNoCurrentPatient();

        renderNoSensorData();

        showDashboardConnection(
            false
        );

        return;
    }


    try {

        /* -------------------------------------------------
           GET LATEST SENSOR READING
        ------------------------------------------------- */

        const latest =
            await window.ArogyaAPI
                .getLatestSensorReading(
                    patient.id
                );


        /* -------------------------------------------------
           GET SENSOR STATUS
        ------------------------------------------------- */

        let status = null;


        try {

            status =
                await window.ArogyaAPI
                    .getPatientSensorStatus(
                        patient.id
                    );

        } catch (statusError) {

            console.warn(
                "Sensor status unavailable:",
                statusError
            );

        }


        console.log(
            "LATEST SENSOR RESPONSE:",
            latest
        );


        console.log(
            "SENSOR STATUS:",
            status
        );


        const reading =
            extractSensorReading(
                latest
            );


        if (!reading) {

            console.warn(
                "Latest response contains no reading."
            );


            renderCurrentPatient(
                patient,
                status,
                null
            );


            renderNoSensorData();


            showDashboardConnection(
                false
            );


            return;
        }


        /* -------------------------------------------------
           SHOW PATIENT
        ------------------------------------------------- */

        renderCurrentPatient(
            patient,
            status,
            reading
        );


        /* -------------------------------------------------
           SHOW SENSOR DATA
        ------------------------------------------------- */

        renderSensorData(
            reading,
            status
        );


        /* -------------------------------------------------
           SHOW CURRENT PATIENT CARD
        ------------------------------------------------- */

        showCurrentPatientCard();


        /* -------------------------------------------------
           CONNECTION ACTIVE
        ------------------------------------------------- */

        showDashboardConnection(
            true
        );


        console.log(
            "LIVE ESP32 DATA:",
            reading
        );


    } catch (error) {

        console.error(
            "Current patient loading error:",
            error
        );


        renderNoSensorData();


        showDashboardConnection(
            false
        );


        showDashboardError(
            "Unable to read the latest ESP32 sensor data."
        );
    }
}


/* =========================================================
   RENDER CURRENT PATIENT
========================================================= */

function renderCurrentPatient(
    patient,
    status,
    reading
) {

    const name =
        getPatientName(
            patient
        );


    const code =
        patient.patient_code ||
        "—";


    const age =
        patient.age !== null &&
        patient.age !== undefined
            ? `${patient.age} years`
            : "Age unavailable";


    const gender =
        patient.gender ||
        "Gender unavailable";


    const diagnosis =
        patient.diagnosis ||
        "No diagnosis recorded";


    /* -----------------------------------------------------
       PATIENT NAME
    ----------------------------------------------------- */

    setText(
        "patientName",
        name
    );


    /* -----------------------------------------------------
       PATIENT DETAILS
    ----------------------------------------------------- */

    setText(
        "patientDetails",
        `${code} • ${age} • ${gender} • ${diagnosis}`
    );


    /* -----------------------------------------------------
       SUMMARY
    ----------------------------------------------------- */

    setText(
        "summaryPatientName",
        name
    );


    setText(
        "summaryPatientCode",
        code
    );


    /* -----------------------------------------------------
       AVATAR
    ----------------------------------------------------- */

    const avatar =
        document.getElementById(
            "patientAvatar"
        );


    if (avatar) {

        avatar.textContent =
            getInitials(
                name
            );
    }


    /* -----------------------------------------------------
       CONDITION BADGE
    ----------------------------------------------------- */

    const badge =
        document.getElementById(
            "patientConditionBadge"
        );


    if (badge) {

        badge.className =
            "condition-badge";


        if (reading) {

            badge.classList.add(
                "active"
            );


            badge.textContent =
                "Monitoring active";

        } else {

            badge.textContent =
                "No live readings";
        }
    }


    /* -----------------------------------------------------
       MONITOR LINK
    ----------------------------------------------------- */

    const monitorLink =
        document.getElementById(
            "openMonitorLink"
        );


    if (monitorLink) {

        monitorLink.href =
            `patient-monitor.html?patient=${encodeURIComponent(code)}`;
    }


    /* -----------------------------------------------------
       LAST UPDATE
    ----------------------------------------------------- */

    const recordedAt =
        reading &&
        (
            reading.recorded_at ||
            reading.recordedAt
        );


    const lastUpdate =
        recordedAt ||
        (
            status &&
            status.last_update
        );


    if (lastUpdate) {

        setText(
            "lastUpdate",
            formatDateTime(
                lastUpdate
            )
        );

    } else {

        setText(
            "lastUpdate",
            "Live reading received"
        );
    }
}


/* =========================================================
   RENDER SENSOR DATA
========================================================= */

function renderSensorData(
    reading,
    status
) {

    console.log(
        "Rendering sensor reading:",
        reading
    );


    /* =====================================================
       TEMPERATURE
    ===================================================== */

    const temperature =
        valueOrNull(
            reading.temperature,
            status &&
                status.temperature
        );


    if (temperature !== null) {

        setText(
            "temperatureValue",
            formatNumber(
                temperature,
                2
            )
        );


        setText(
            "temperatureStatus",
            "Live ESP32 reading"
        );


        setStatusClass(
            "temperatureStatus",
            "ok"
        );

    } else {

        setText(
            "temperatureValue",
            "—"
        );


        setText(
            "temperatureStatus",
            "No temperature data"
        );
    }


    /* =====================================================
       FALL DETECTION
    ===================================================== */

    const fall =
        toBoolean(
            valueOrNull(
                reading.fall_detected,
                status &&
                    status.fall_detected
            )
        );


    setText(
        "fallValue",
        fall
            ? "Detected"
            : "Not detected"
    );


    setText(
        "fallStatus",
        fall
            ? "Immediate attention required"
            : "No fall detected"
    );


    setStatusClass(
        "fallStatus",
        fall
            ? "danger"
            : "ok"
    );


    const fallCard =
        document.getElementById(
            "fallCard"
        );


    if (fallCard) {

        fallCard.classList.toggle(
            "danger-state",
            fall
        );
    }


    /* =====================================================
       POSITION
    ===================================================== */

    const position =
        valueOrNull(
            reading.position_label,
            reading.position_status
        );


    const duration =
        valueOrNull(
            reading.position_duration_seconds,
            status &&
                status.position_duration_seconds
        );


    setText(
        "positionValue",
        position
            ? formatPosition(
                position
            )
            : "—"
    );


    setText(
        "positionStatus",
        position
            ? "Current position"
            : "No position data"
    );


    setText(
        "positionDuration",
        duration !== null
            ? formatDuration(
                duration
            )
            : "—"
    );


    /* =====================================================
       URINE DISTANCE
    ===================================================== */

    const urine =
        valueOrNull(
            reading.urine_distance,
            status &&
                status.urine_distance
        );


    if (urine !== null) {

        setText(
            "urineValue",
            formatNumber(
                urine,
                2
            )
        );


        setText(
            "urineStatus",
            "Live ESP32 reading"
        );

    } else {

        setText(
            "urineValue",
            "—"
        );


        setText(
            "urineStatus",
            "No reading"
        );
    }


    /* =====================================================
       IV DISTANCE
    ===================================================== */

    const iv =
        valueOrNull(
            reading.iv_distance,
            status &&
                status.iv_distance
        );


    if (iv !== null) {

        setText(
            "ivValue",
            formatNumber(
                iv,
                2
            )
        );


        setText(
            "ivStatus",
            "Live ESP32 reading"
        );

    } else {

        setText(
            "ivValue",
            "—"
        );


        setText(
            "ivStatus",
            "No reading"
        );
    }


    /* =====================================================
       GYROSCOPE X
    ===================================================== */

    const gyroX =
        valueOrNull(
            reading.gyro_x,
            status &&
                status.gyro_x
        );


    setText(
        "gyroX",
        formatNumber(
            gyroX,
            2
        )
    );


    /* =====================================================
       GYROSCOPE Y
    ===================================================== */

    const gyroY =
        valueOrNull(
            reading.gyro_y,
            status &&
                status.gyro_y
        );


    setText(
        "gyroY",
        formatNumber(
            gyroY,
            2
        )
    );


    /* =====================================================
       GYROSCOPE Z
    ===================================================== */

    const gyroZ =
        valueOrNull(
            reading.gyro_z,
            status &&
                status.gyro_z
        );


    setText(
        "gyroZ",
        formatNumber(
            gyroZ,
            2
        )
    );
}


/* =========================================================
   NO SENSOR DATA
========================================================= */

function renderNoSensorData() {

    setText(
        "temperatureValue",
        "—"
    );

    setText(
        "temperatureStatus",
        "Waiting for ESP32 data"
    );


    setText(
        "fallValue",
        "—"
    );

    setText(
        "fallStatus",
        "Waiting for ESP32 data"
    );


    setText(
        "positionValue",
        "—"
    );

    setText(
        "positionStatus",
        "Waiting for ESP32 data"
    );

    setText(
        "positionDuration",
        "—"
    );


    setText(
        "urineValue",
        "—"
    );

    setText(
        "urineStatus",
        "Waiting for ESP32 data"
    );


    setText(
        "ivValue",
        "—"
    );

    setText(
        "ivStatus",
        "Waiting for ESP32 data"
    );


    setText(
        "gyroX",
        "—"
    );

    setText(
        "gyroY",
        "—"
    );

    setText(
        "gyroZ",
        "—"
    );


    const fallCard =
        document.getElementById(
            "fallCard"
        );


    if (fallCard) {

        fallCard.classList.remove(
            "danger-state"
        );
    }
}


/* =========================================================
   CURRENT PATIENT CARD
========================================================= */

function showCurrentPatientCard() {

    const patientCard =
        document.getElementById(
            "currentPatientCard"
        );


    const noPatient =
        document.getElementById(
            "noCurrentPatient"
        );


    if (patientCard) {

        patientCard.hidden =
            false;
    }


    if (noPatient) {

        noPatient.hidden =
            true;
    }
}


/* =========================================================
   NO CURRENT PATIENT
========================================================= */

function showNoCurrentPatient() {

    const patientCard =
        document.getElementById(
            "currentPatientCard"
        );


    const noPatient =
        document.getElementById(
            "noCurrentPatient"
        );


    if (patientCard) {

        patientCard.hidden =
            true;
    }


    if (noPatient) {

        noPatient.hidden =
            false;
    }


    setText(
        "summaryPatientName",
        "—"
    );


    setText(
        "summaryPatientCode",
        "No patient selected"
    );
}


/* =========================================================
   CONNECTION STATUS
========================================================= */

function showDashboardConnection(
    connected
) {

    const status =
        document.getElementById(
            "monitoringStatus"
        );


    if (!status) {
        return;
    }


    status.classList.remove(
        "live",
        "warning",
        "danger"
    );


    if (connected) {

        status.classList.add(
            "live"
        );


        setText(
            "monitoringStatusText",
            "Active"
        );


        setText(
            "monitoringStatusSubtext",
            "Live ESP32 readings available"
        );


        const statusText =
            status.querySelector(
                "span:last-child"
            );


        if (statusText) {

            statusText.textContent =
                "Live monitoring";
        }

    } else {

        setText(
            "monitoringStatusText",
            "Waiting"
        );


        setText(
            "monitoringStatusSubtext",
            "Waiting for ESP32 sensor data"
        );


        const statusText =
            status.querySelector(
                "span:last-child"
            );


        if (statusText) {

            statusText.textContent =
                "Waiting";
        }
    }
}


/* =========================================================
   ALERTS
========================================================= */

async function loadCurrentPatientAlerts() {

    if (!currentPatient) {

        renderAlerts([]);

        updateAlertCount(0);

        return;
    }


    try {

        const response =
            await window.ArogyaAPI
                .getPatientAlerts(
                    currentPatient.id,
                    {
                        limit: 20
                    }
                );


        currentAlerts =
            normalizeAlerts(
                response
            );


        renderAlerts(
            currentAlerts
        );


        const activeCount =
            currentAlerts.filter(
                alert =>
                    !toBoolean(
                        alert.acknowledged
                    )
            ).length;


        updateAlertCount(
            activeCount
        );


    } catch (error) {

        console.warn(
            "Unable to load alerts:",
            error
        );


        renderAlerts([]);

        updateAlertCount(0);
    }
}


async function loadAlertsForNoPatient() {

    renderAlerts([]);

    updateAlertCount(0);
}


/* =========================================================
   RENDER ALERTS
========================================================= */

function renderAlerts(
    alerts
) {

    const container =
        document.getElementById(
            "recentAlerts"
        );


    if (!container) {
        return;
    }


    if (!alerts.length) {

        container.innerHTML =
            `
            <div class="panel-empty">
                No alerts have been recorded for the current patient.
            </div>
            `;

        return;
    }


    const sorted =
        [...alerts]
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.created_at || 0
                    ) -
                    new Date(
                        a.created_at || 0
                    )
            )
            .slice(
                0,
                6
            );


    container.innerHTML =
        sorted
            .map(
                alert =>
                    createAlertMarkup(
                        alert
                    )
            )
            .join("");


    container
        .querySelectorAll(
            "[data-ack-alert]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async function () {

                        await acknowledgeAlert(
                            button.dataset.ackAlert
                        );

                    }
                );

            }
        );
}


/* =========================================================
   ALERT MARKUP
========================================================= */

function createAlertMarkup(
    alert
) {

    const severity =
        normalizeSeverity(
            alert.severity
        );


    const title =
        alert.alert_type ||
        "Patient Alert";


    const message =
        alert.message ||
        "Patient monitoring event recorded.";


    const created =
        formatDateTime(
            alert.created_at
        );


    const acknowledged =
        toBoolean(
            alert.acknowledged
        );


    return `
        <div class="alert-item ${severity}">

            <span class="alert-indicator"></span>

            <div class="alert-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

                <span class="alert-time">
                    ${escapeHtml(created)}
                </span>

            </div>

            ${
                acknowledged
                    ? `
                        <span class="alert-acknowledged">
                            Acknowledged
                        </span>
                    `
                    : `
                        <button
                            type="button"
                            class="alert-ack-button"
                            data-ack-alert="${Number(alert.id)}"
                        >
                            Acknowledge
                        </button>
                    `
            }

        </div>
    `;
}


/* =========================================================
   ACKNOWLEDGE ALERT
========================================================= */

async function acknowledgeAlert(
    alertId
) {

    if (!alertId) {
        return;
    }


    try {

        await window.ArogyaAPI
            .acknowledgeAlert(
                alertId
            );


        await loadCurrentPatientAlerts();


    } catch (error) {

        console.error(
            "Alert acknowledgement failed:",
            error
        );


        showDashboardError(
            "Unable to acknowledge the alert."
        );
    }
}


/* =========================================================
   PATIENT LIST
========================================================= */

function renderPatientList() {

    const container =
        document.getElementById(
            "patientGrid"
        );


    if (!container) {
        return;
    }


    if (!patients.length) {

        container.innerHTML =
            `
            <div class="panel-empty">
                No patients are currently registered.
            </div>
            `;

        return;
    }


    container.innerHTML =
        patients
            .map(
                patient => {

                    const isCurrent =
                        currentPatient &&
                        Number(
                            patient.id
                        ) ===
                        Number(
                            currentPatient.id
                        );


                    const name =
                        getPatientName(
                            patient
                        );


                    const code =
                        patient.patient_code ||
                        "—";


                    const diagnosis =
                        patient.diagnosis ||
                        "No diagnosis recorded";


                    return `
                        <div class="patient-list-item">

                            <div class="patient-list-avatar">
                                ${escapeHtml(
                                    getInitials(
                                        name
                                    )
                                )}
                            </div>

                            <div class="patient-list-info">

                                <strong>
                                    ${escapeHtml(
                                        name
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        code
                                    )}
                                    •
                                    ${escapeHtml(
                                        diagnosis
                                    )}
                                </span>

                            </div>

                            <span
                                class="patient-list-status ${
                                    isCurrent
                                        ? "live"
                                        : ""
                                }"
                            >
                                ${
                                    isCurrent
                                        ? "Monitoring"
                                        : "Record"
                                }
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    setText(
        "totalPatients",
        patients.length
    );


    if (currentPatient) {

        setText(
            "summaryPatientName",
            getPatientName(
                currentPatient
            )
        );


        setText(
            "summaryPatientCode",
            currentPatient.patient_code ||
            "—"
        );

    } else {

        setText(
            "summaryPatientName",
            "—"
        );


        setText(
            "summaryPatientCode",
            "No patient selected"
        );
    }
}


/* =========================================================
   ALERT COUNT
========================================================= */

function updateAlertCount(
    count
) {

    setText(
        "alertCount",
        count
    );


    setText(
        "activeAlerts",
        count
    );
}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {

    const button =
        document.getElementById(
            "refreshDashboard"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        refreshDashboard
    );
}


/* =========================================================
   DATE
========================================================= */

function updateCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );


    if (!element) {
        return;
    }


    element.textContent =
        new Date()
            .toLocaleDateString(
                undefined,
                {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );
}


/* =========================================================
   LAST REFRESH
========================================================= */

function updateLastRefresh() {

    setText(
        "lastRefresh",
        `Updated ${new Date().toLocaleTimeString(
            undefined,
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        )}`
    );
}


/* =========================================================
   SENSOR RESPONSE
========================================================= */

function extractSensorReading(
    response
) {

    if (!response) {
        return null;
    }


    /*
     * Backend response:
     *
     * {
     *   has_data: true,
     *   patient_id: 1,
     *   reading: {...}
     * }
     */

    if (
        response.reading &&
        typeof response.reading === "object"
    ) {

        return response.reading;
    }


    if (
        response.data &&
        response.data.reading &&
        typeof response.data.reading === "object"
    ) {

        return response.data.reading;
    }


    if (
        response.data &&
        typeof response.data === "object"
    ) {

        return response.data;
    }


    if (
        typeof response === "object" &&
        (
            response.temperature !== undefined ||
            response.gyro_x !== undefined ||
            response.urine_distance !== undefined ||
            response.iv_distance !== undefined
        )
    ) {

        return response;
    }


    return null;
}


/* =========================================================
   SENSOR DATA CHECK
========================================================= */

function hasSensorReading(
    response
) {

    const reading =
        extractSensorReading(
            response
        );


    if (!reading) {
        return false;
    }


    return (
        reading.temperature !== null &&
        reading.temperature !== undefined
    ) ||
    reading.gyro_x !== null ||
    reading.gyro_y !== null ||
    reading.gyro_z !== null ||
    reading.force_fall !== null ||
    reading.force_position !== null ||
    reading.urine_distance !== null ||
    reading.iv_distance !== null;
}


/* =========================================================
   VALUE HELPER
========================================================= */

function valueOrNull(
    first,
    second
) {

    if (
        first !== null &&
        first !== undefined &&
        first !== ""
    ) {

        return first;
    }


    if (
        second !== null &&
        second !== undefined &&
        second !== ""
    ) {

        return second;
    }


    return null;
}


/* =========================================================
   BOOLEAN
========================================================= */

function toBoolean(
    value
) {

    if (
        value === true ||
        value === 1
    ) {

        return true;
    }


    if (
        typeof value === "string"
    ) {

        return [
            "true",
            "1",
            "yes",
            "on"
        ].includes(
            value.toLowerCase()
        );
    }


    return false;
}


/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(
    value,
    decimals = 2
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "—";
    }


    return number.toFixed(
        decimals
    );
}


/* =========================================================
   DURATION
========================================================= */

function formatDuration(
    seconds
) {

    if (
        seconds === null ||
        seconds === undefined ||
        seconds === ""
    ) {

        return "Duration unavailable";
    }


    const total =
        Math.max(
            0,
            Number(seconds)
        );


    if (
        !Number.isFinite(total)
    ) {

        return "Duration unavailable";
    }


    const hours =
        Math.floor(
            total / 3600
        );


    const minutes =
        Math.floor(
            (total % 3600) / 60
        );


    const secs =
        Math.floor(
            total % 60
        );


    if (hours > 0) {

        return `${hours}h ${minutes}m`;
    }


    if (minutes > 0) {

        return `${minutes}m ${secs}s`;
    }


    return `${secs}s`;
}


/* =========================================================
   POSITION
========================================================= */

function formatPosition(
    value
) {

    if (!value) {
        return "—";
    }


    return String(value)
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


/* =========================================================
   SEVERITY
========================================================= */

function normalizeSeverity(
    value
) {

    const severity =
        String(
            value || ""
        ).toLowerCase();


    if (
        severity === "danger" ||
        severity === "critical"
    ) {

        return "danger";
    }


    if (
        severity === "warning" ||
        severity === "attention"
    ) {

        return "warning";
    }


    return "normal";
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "Time unavailable";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }


    return date.toLocaleString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


/* =========================================================
   PATIENT NORMALIZATION
========================================================= */

function normalizePatients(
    response
) {

    if (
        Array.isArray(
            response
        )
    ) {

        return response;
    }


    if (
        response &&
        Array.isArray(
            response.patients
        )
    ) {

        return response.patients;
    }


    if (
        response &&
        Array.isArray(
            response.data
        )
    ) {

        return response.data;
    }


    return [];
}


/* =========================================================
   ALERT NORMALIZATION
========================================================= */

function normalizeAlerts(
    response
) {

    if (
        Array.isArray(
            response
        )
    ) {

        return response;
    }


    if (
        response &&
        Array.isArray(
            response.alerts
        )
    ) {

        return response.alerts;
    }


    if (
        response &&
        Array.isArray(
            response.data
        )
    ) {

        return response.data;
    }


    return [];
}


/* =========================================================
   PATIENT NAME
========================================================= */

function getPatientName(
    patient
) {

    if (!patient) {

        return "Unknown patient";
    }


    return (
        patient.full_name ||
        patient.name ||
        "Unknown patient"
    );
}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
    name
) {

    const value =
        String(
            name || "Patient"
        ).trim();


    if (!value) {
        return "P";
    }


    const words =
        value.split(
            /\s+/
        );


    if (
        words.length === 1
    ) {

        return words[0]
            .slice(
                0,
                2
            )
            .toUpperCase();
    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   DOM TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value === null ||
        value === undefined
            ? "—"
            : String(value);
}


/* =========================================================
   STATUS CLASS
========================================================= */

function setStatusClass(
    id,
    className
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.classList.remove(
        "ok",
        "warning",
        "danger"
    );


    if (className) {

        element.classList.add(
            className
        );
    }
}


/* =========================================================
   ERROR
========================================================= */

function showDashboardError(
    message
) {

    const element =
        document.getElementById(
            "dashboardError"
        );


    if (!element) {
        return;
    }


    if (!message) {

        element.textContent =
            "";

        element.hidden =
            true;

        return;
    }


    element.textContent =
        message;

    element.hidden =
        false;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}