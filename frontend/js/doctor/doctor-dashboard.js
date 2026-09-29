/* =========================================================
   AROGYACONNECT
   DOCTOR DASHBOARD
   Live FastAPI / MySQL data
========================================================= */

"use strict";


const DOCTOR_REFRESH_INTERVAL = 5000;

let doctorRefreshTimer = null;
let doctorRefreshRunning = false;

let doctorPatients = [];
let doctorPatientStatuses = new Map();

let currentDoctorPatient = null;
let currentDoctorAlerts = [];
let currentDoctorEvents = [];


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDoctorDashboard
);


async function initializeDoctorDashboard() {

    if (!checkDoctorAccess()) {
        return;
    }

    updateCurrentDate();

    window.setInterval(
        updateCurrentDate,
        30000
    );

    setupDoctorRefresh();

    await loadDoctorDashboard();

    doctorRefreshTimer =
        window.setInterval(
            refreshDoctorDashboard,
            DOCTOR_REFRESH_INTERVAL
        );
}


/* =========================================================
   ROLE CHECK
========================================================= */

function checkDoctorAccess() {

    if (
        typeof window.requireAuthentication ===
        "function"
    ) {

        const authenticated =
            window.requireAuthentication();

        if (!authenticated) {
            return false;
        }
    }


    const role =
        String(
            localStorage.getItem(
                "arogya_role"
            ) || ""
        ).toLowerCase();


    if (
        role &&
        role !== "doctor"
    ) {

        window.location.href =
            "nurse-dashboard.html";

        return false;
    }


    return true;
}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function loadDoctorDashboard() {

    setDoctorLoading(true);

    hideDoctorError();

    try {

        const response =
            await window.ArogyaAPI
                .getPatients();


        doctorPatients =
            normalizePatients(
                response
            );


        setText(
            "totalPatients",
            doctorPatients.length
        );


        await loadPatientStatuses();

        currentDoctorPatient =
            await findCurrentDoctorPatient();


        renderPatientTable();


        if (
            currentDoctorPatient
        ) {

            await loadCurrentDoctorPatient();

        } else {

            renderNoCurrentPatient();
        }


        await loadDoctorAlerts();

        await loadDoctorEvents();


        updateDoctorSummary();

        showDoctorLiveStatus(
            Boolean(
                currentDoctorPatient
            )
        );

    } catch (error) {

        console.error(
            "Doctor dashboard error:",
            error
        );

        showDoctorError(
            "Unable to load the doctor dashboard. Please make sure the backend is running."
        );

        showDoctorLiveStatus(false);

    } finally {

        setDoctorLoading(false);
    }
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDoctorDashboard() {

    if (doctorRefreshRunning) {
        return;
    }

    doctorRefreshRunning = true;


    const button =
        document.getElementById(
            "refreshDashboard"
        );


    if (button) {

        button.classList.add(
            "loading"
        );
    }


    try {

        const response =
            await window.ArogyaAPI
                .getPatients();


        doctorPatients =
            normalizePatients(
                response
            );


        setText(
            "totalPatients",
            doctorPatients.length
        );


        await loadPatientStatuses();


        currentDoctorPatient =
            await findCurrentDoctorPatient();


        renderPatientTable();


        if (
            currentDoctorPatient
        ) {

            await loadCurrentDoctorPatient();

        } else {

            renderNoCurrentPatient();
        }


        await loadDoctorAlerts();

        await loadDoctorEvents();


        updateDoctorSummary();

        updateDoctorRefreshTime();

        hideDoctorError();

    } catch (error) {

        console.error(
            "Doctor dashboard refresh failed:",
            error
        );

        showDoctorError(
            "Live update failed. The dashboard will try again automatically."
        );

        showDoctorLiveStatus(false);

    } finally {

        doctorRefreshRunning = false;


        if (button) {

            button.classList.remove(
                "loading"
            );
        }
    }
}


/* =========================================================
   PATIENT SENSOR STATUS
========================================================= */

async function loadPatientStatuses() {

    doctorPatientStatuses =
        new Map();


    /*
     * Only the patient with real readings should
     * display live monitoring information.
     */

    const statusPromises =
        doctorPatients.map(
            async patient => {

                try {

                    const status =
                        await window.ArogyaAPI
                            .getPatientSensorStatus(
                                patient.id
                            );

                    doctorPatientStatuses.set(
                        Number(patient.id),
                        status || null
                    );

                } catch (error) {

                    console.warn(
                        `Unable to load sensor status for patient ${patient.id}`,
                        error
                    );

                    doctorPatientStatuses.set(
                        Number(patient.id),
                        null
                    );
                }
            }
        );


    await Promise.all(
        statusPromises
    );
}


/* =========================================================
   FIND LIVE PATIENT
========================================================= */

async function findCurrentDoctorPatient() {

    /*
     * Prefer the backend's current active patient.
     */

    try {

        if (
            typeof window.ArogyaAPI
                .getCurrentActivePatient ===
            "function"
        ) {

            const response =
                await window.ArogyaAPI
                    .getCurrentActivePatient();


            const activePatient =
                normalizeSinglePatient(
                    response
                );


            if (activePatient) {

                const match =
                    doctorPatients.find(
                        patient =>
                            Number(
                                patient.id
                            ) ===
                            Number(
                                activePatient.id
                            )
                    );


                if (match) {
                    return match;
                }

                return activePatient;
            }
        }

    } catch (error) {

        console.warn(
            "Current active patient endpoint unavailable:",
            error
        );
    }


    /*
     * Fallback to the patient whose sensor
     * status contains actual data.
     */

    for (
        const patient of doctorPatients
    ) {

        const status =
            doctorPatientStatuses.get(
                Number(patient.id)
            );


        if (
            status &&
            status.has_data === true
        ) {

            return patient;
        }
    }


    return null;
}


/* =========================================================
   CURRENT PATIENT
========================================================= */

async function loadCurrentDoctorPatient() {

    if (!currentDoctorPatient) {
        return;
    }


    try {

        const [
            status,
            latest
        ] = await Promise.all([

            window.ArogyaAPI
                .getPatientSensorStatus(
                    currentDoctorPatient.id
                ),

            window.ArogyaAPI
                .getLatestSensorReading(
                    currentDoctorPatient.id
                )
        ]);


        doctorPatientStatuses.set(
            Number(
                currentDoctorPatient.id
            ),
            status
        );


        renderCurrentPatient(
            currentDoctorPatient,
            status
        );


        renderCurrentSensorData(
            status,
            latest
        );


        showDoctorLiveStatus(
            Boolean(
                status &&
                status.has_data
            )
        );

    } catch (error) {

        console.error(
            "Current doctor patient error:",
            error
        );

        renderNoCurrentPatient();

        showDoctorLiveStatus(false);
    }
}


/* =========================================================
   PATIENT TABLE
========================================================= */

function renderPatientTable() {

    const tbody =
        document.getElementById(
            "patientTableBody"
        );


    if (!tbody) {
        return;
    }


    if (!doctorPatients.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    No patients are currently registered.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        doctorPatients
            .map(
                createPatientTableRow
            )
            .join("");
}


function createPatientTableRow(
    patient
) {

    const patientId =
        Number(
            patient.id
        );


    const status =
        doctorPatientStatuses.get(
            patientId
        );


    const hasData =
        Boolean(
            status &&
            status.has_data === true
        );


    const name =
        getPatientName(
            patient
        );


    const code =
        patient.patient_code ||
        "—";


    const temperature =
        hasData
            ? formatNumber(
                valueOrNull(
                    status.temperature,
                    null
                ),
                2
            )
            : "—";


    const position =
        hasData
            ? formatPosition(
                status.position_status
            )
            : "—";


    const fallDetected =
        hasData &&
        Boolean(
            status.fall_detected
        );


    const urine =
        hasData
            ? formatNumber(
                status.urine_distance,
                2
            )
            : "—";


    const iv =
        hasData
            ? formatNumber(
                status.iv_distance,
                2
            )
            : "—";


    const statusLabel =
        hasData
            ? "Live monitoring"
            : "No live data";


    return `
        <tr>

            <td>

                <div class="table-patient">

                    <div class="table-patient-avatar">
                        ${escapeHtml(
                            getInitials(name)
                        )}
                    </div>

                    <div class="table-patient-info">

                        <strong>
                            ${escapeHtml(name)}
                        </strong>

                        <span>
                            ${escapeHtml(code)}
                        </span>

                    </div>

                </div>

            </td>


            <td class="table-value">
                ${
                    temperature === "—"
                        ? `<span class="table-muted">—</span>`
                        : `${escapeHtml(temperature)} °C`
                }
            </td>


            <td>
                ${
                    position === "—"
                        ? `<span class="table-muted">—</span>`
                        : escapeHtml(position)
                }
            </td>


            <td>
                ${
                    !hasData
                        ? `<span class="table-muted">—</span>`
                        : fallDetected
                            ? `
                                <span class="table-fall-danger">
                                    Detected
                                </span>
                              `
                            : `
                                <span class="table-fall-safe">
                                    Not detected
                                </span>
                              `
                }
            </td>


            <td>
                ${
                    urine === "—"
                        ? `<span class="table-muted">—</span>`
                        : `${escapeHtml(urine)} cm`
                }
            </td>


            <td>
                ${
                    iv === "—"
                        ? `<span class="table-muted">—</span>`
                        : `${escapeHtml(iv)} cm`
                }
            </td>


            <td>

                <span
                    class="table-status ${
                        hasData
                            ? "live"
                            : "no-data"
                    }"
                >
                    ${statusLabel}
                </span>

            </td>


            <td>

                <a
                    href="patient-details.html?patient=${encodeURIComponent(code)}"
                    class="table-review"
                >
                    Review
                </a>

            </td>

        </tr>
    `;
}


/* =========================================================
   CURRENT PATIENT CARD
========================================================= */

function renderCurrentPatient(
    patient,
    status
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


    setText(
        "currentPatientName",
        name
    );


    setText(
        "currentPatientDetails",
        `${code} • ${age} • ${gender} • ${diagnosis}`
    );


    setText(
        "livePatientName",
        name
    );


    setText(
        "livePatientCode",
        code
    );


    const avatar =
        document.getElementById(
            "currentPatientAvatar"
        );


    if (avatar) {

        avatar.textContent =
            getInitials(
                name
            );
    }


    const badge =
        document.getElementById(
            "currentPatientBadge"
        );


    if (badge) {

        badge.className =
            "doctor-patient-badge";


        if (
            status &&
            status.has_data
        ) {

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


    setText(
        "lastUpdate",
        status &&
        status.last_update
            ? formatDateTime(
                status.last_update
            )
            : "No reading yet"
    );


    updatePatientActionLinks(
        code
    );
}


/* =========================================================
   PATIENT ACTION LINKS
========================================================= */

function updatePatientActionLinks(
    patientCode
) {

    const monitor =
        document.getElementById(
            "openLiveMonitor"
        );


    const history =
        document.getElementById(
            "openPatientHistory"
        );


    const encoded =
        encodeURIComponent(
            patientCode
        );


    if (monitor) {

        monitor.href =
            `patient-monitor.html?patient=${encoded}`;
    }


    if (history) {

        history.href =
            `patient-history.html?patient=${encoded}`;
    }
}


/* =========================================================
   SENSOR DATA
========================================================= */

function renderCurrentSensorData(
    status,
    latestResponse
) {

    const reading =
        latestResponse &&
        latestResponse.reading
            ? latestResponse.reading
            : latestResponse;


    if (
        !status ||
        status.has_data !== true ||
        !reading
    ) {

        renderNoSensorData();

        return;
    }


    /* TEMPERATURE */

    const temperature =
        valueOrNull(
            reading.temperature,
            status.temperature
        );


    setText(
        "temperatureValue",
        formatNumber(
            temperature,
            2
        )
    );


    setText(
        "temperatureStatus",
        temperature !== null
            ? "Latest reading"
            : "No reading"
    );


    setStatusClass(
        "temperatureStatus",
        temperature !== null
            ? "ok"
            : ""
    );


    /* FALL */

    const fallDetected =
        Boolean(
            valueOrNull(
                reading.fall_detected,
                status.fall_detected
            )
        );


    setText(
        "fallValue",
        fallDetected
            ? "Detected"
            : "Not detected"
    );


    setText(
        "fallStatus",
        fallDetected
            ? "Attention required"
            : "No fall detected"
    );


    setStatusClass(
        "fallStatus",
        fallDetected
            ? "danger"
            : "ok"
    );


    /* POSITION */

    const position =
        valueOrNull(
            reading.position_status,
            status.position_status
        );


    const duration =
        valueOrNull(
            reading.position_duration_seconds,
            status.position_duration_seconds
        );


    setText(
        "positionValue",
        position
            ? formatPosition(position)
            : "—"
    );


    setText(
        "positionStatus",
        position
            ? `Duration: ${
                formatDuration(
                    duration
                )
            }`
            : "No position reading"
    );


    /* URINE */

    const urine =
        valueOrNull(
            reading.urine_distance,
            status.urine_distance
        );


    setText(
        "urineValue",
        formatNumber(
            urine,
            2
        )
    );


    setText(
        "urineStatus",
        urine !== null
            ? "Latest distance"
            : "No reading"
    );


    /* IV */

    const iv =
        valueOrNull(
            reading.iv_distance,
            status.iv_distance
        );


    setText(
        "ivValue",
        formatNumber(
            iv,
            2
        )
    );


    setText(
        "ivStatus",
        iv !== null
            ? "Latest distance"
            : "No reading"
    );


    /* GYRO */

    setText(
        "gyroX",
        formatNumber(
            valueOrNull(
                reading.gyro_x,
                status.gyro_x
            ),
            4
        )
    );


    setText(
        "gyroY",
        formatNumber(
            valueOrNull(
                reading.gyro_y,
                status.gyro_y
            ),
            4
        )
    );


    setText(
        "gyroZ",
        formatNumber(
            valueOrNull(
                reading.gyro_z,
                status.gyro_z
            ),
            4
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
        "No reading"
    );


    setText(
        "fallValue",
        "—"
    );

    setText(
        "fallStatus",
        "No reading"
    );


    setText(
        "positionValue",
        "—"
    );

    setText(
        "positionStatus",
        "Duration: —"
    );


    setText(
        "urineValue",
        "—"
    );

    setText(
        "urineStatus",
        "No reading"
    );


    setText(
        "ivValue",
        "—"
    );

    setText(
        "ivStatus",
        "No reading"
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
}


/* =========================================================
   NO CURRENT PATIENT
========================================================= */

function renderNoCurrentPatient() {

    currentDoctorPatient = null;


    setText(
        "currentPatientName",
        "No live patient"
    );


    setText(
        "currentPatientDetails",
        "No live monitoring data is currently available."
    );


    setText(
        "livePatientName",
        "—"
    );


    setText(
        "livePatientCode",
        "No live readings"
    );


    setText(
        "lastUpdate",
        "—"
    );


    const badge =
        document.getElementById(
            "currentPatientBadge"
        );


    if (badge) {

        badge.className =
            "doctor-patient-badge";

        badge.textContent =
            "Waiting";
    }


    renderNoSensorData();


    const monitor =
        document.getElementById(
            "openLiveMonitor"
        );


    const history =
        document.getElementById(
            "openPatientHistory"
        );


    if (monitor) {
        monitor.href =
            "patient-monitor.html";
    }


    if (history) {
        history.href =
            "patient-history.html";
    }
}


/* =========================================================
   ALERTS
========================================================= */

async function loadDoctorAlerts() {

    currentDoctorAlerts = [];


    /*
     * Alerts are loaded for each registered patient.
     * No fake alert data is created.
     */

    const alertPromises =
        doctorPatients.map(
            async patient => {

                try {

                    const response =
                        await window.ArogyaAPI
                            .getPatientAlerts(
                                patient.id
                            );


                    return normalizeAlerts(
                        response
                    ).map(
                        alert => ({
                            ...alert,

                            patient:
                                patient
                        })
                    );

                } catch (error) {

                    console.warn(
                        `Unable to load alerts for patient ${patient.id}`,
                        error
                    );

                    return [];
                }
            }
        );


    const results =
        await Promise.all(
            alertPromises
        );


    currentDoctorAlerts =
        results.flat();


    const activeCount =
        currentDoctorAlerts.filter(
            alert =>
                !Boolean(
                    alert.acknowledged
                )
        ).length;


    setText(
        "activeAlerts",
        activeCount
    );


    setText(
        "alertCount",
        activeCount
    );


    renderDoctorAlerts();
}


/* =========================================================
   ALERT RENDER
========================================================= */

function renderDoctorAlerts() {

    const container =
        document.getElementById(
            "alertList"
        );


    if (!container) {
        return;
    }


    if (!currentDoctorAlerts.length) {

        container.innerHTML = `
            <div class="doctor-empty">
                No alerts have been recorded.
            </div>
        `;

        return;
    }


    const sorted =
        [...currentDoctorAlerts]
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
            .slice(0, 8);


    container.innerHTML =
        sorted
            .map(
                createDoctorAlertMarkup
            )
            .join("");
}


function createDoctorAlertMarkup(
    alert
) {

    const severity =
        normalizeSeverity(
            alert.severity
        );


    const patientName =
        alert.patient
            ? getPatientName(
                alert.patient
            )
            : "Patient";


    const title =
        alert.alert_type ||
        "Patient Alert";


    const message =
        alert.message ||
        "Patient monitoring event recorded.";


    return `
        <div class="doctor-alert-item ${severity}">

            <span
                class="doctor-alert-indicator"
            ></span>


            <div class="doctor-alert-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(patientName)}
                    — 
                    ${escapeHtml(message)}
                </p>

                <time>
                    ${escapeHtml(
                        formatDateTime(
                            alert.created_at
                        )
                    )}
                </time>

            </div>

        </div>
    `;
}


/* =========================================================
   EVENTS
========================================================= */

async function loadDoctorEvents() {

    currentDoctorEvents = [];


    const eventPromises =
        doctorPatients.map(
            async patient => {

                try {

                    const response =
                        await window.ArogyaAPI
                            .getPatientEvents(
                                patient.id
                            );


                    return normalizeEvents(
                        response
                    ).map(
                        event => ({
                            ...event,

                            patient:
                                patient
                        })
                    );

                } catch (error) {

                    console.warn(
                        `Unable to load events for patient ${patient.id}`,
                        error
                    );

                    return [];
                }
            }
        );


    const results =
        await Promise.all(
            eventPromises
        );


    currentDoctorEvents =
        results.flat();


    setText(
        "eventCount",
        currentDoctorEvents.length
    );


    renderDoctorEvents();
}


/* =========================================================
   EVENT RENDER
========================================================= */

function renderDoctorEvents() {

    const container =
        document.getElementById(
            "eventList"
        );


    if (!container) {
        return;
    }


    if (!currentDoctorEvents.length) {

        container.innerHTML = `
            <div class="doctor-empty">
                No clinical events have been recorded.
            </div>
        `;

        return;
    }


    const sorted =
        [...currentDoctorEvents]
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
            .slice(0, 8);


    container.innerHTML =
        sorted
            .map(
                createDoctorEventMarkup
            )
            .join("");
}


function createDoctorEventMarkup(
    event
) {

    const patientName =
        event.patient
            ? getPatientName(
                event.patient
            )
            : "Patient";


    const title =
        event.title ||
        event.event_type ||
        "Patient event";


    const description =
        event.description ||
        "Clinical event recorded.";


    return `
        <div class="doctor-event-item">

            <div class="doctor-event-icon">

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                >
                    <path
                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                    />

                    <path
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                    />
                </svg>

            </div>


            <div class="doctor-event-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(patientName)}
                    —
                    ${escapeHtml(description)}
                </p>

                <time>
                    ${escapeHtml(
                        formatDateTime(
                            event.created_at
                        )
                    )}
                </time>

            </div>

        </div>
    `;
}


/* =========================================================
   SUMMARY
========================================================= */

function updateDoctorSummary() {

    setText(
        "totalPatients",
        doctorPatients.length
    );


    if (currentDoctorPatient) {

        setText(
            "livePatientName",
            getPatientName(
                currentDoctorPatient
            )
        );


        setText(
            "livePatientCode",
            currentDoctorPatient.patient_code ||
            "—"
        );

    } else {

        setText(
            "livePatientName",
            "—"
        );


        setText(
            "livePatientCode",
            "No live readings"
        );
    }
}


/* =========================================================
   LIVE STATUS
========================================================= */

function showDoctorLiveStatus(
    active
) {

    const status =
        document.getElementById(
            "doctorLiveStatus"
        );


    if (!status) {
        return;
    }


    status.classList.toggle(
        "active",
        Boolean(active)
    );


    const text =
        status.querySelector(
            "span:last-child"
        );


    if (text) {

        text.textContent =
            active
                ? "Live monitoring"
                : "Waiting";
    }
}


/* =========================================================
   REFRESH
========================================================= */

function setupDoctorRefresh() {

    const button =
        document.getElementById(
            "refreshDashboard"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        refreshDoctorDashboard
    );
}


function updateDoctorRefreshTime() {

    const currentDate =
        document.getElementById(
            "currentDate"
        );


    if (!currentDate) {
        return;
    }


    /*
     * The header remains the current date.
     * The data itself refreshes every 5 seconds.
     */
}


/* =========================================================
   DATE
========================================================= */

function updateCurrentDate() {

    setText(
        "currentDate",
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        )
    );
}


/* =========================================================
   LOADING
========================================================= */

function setDoctorLoading(
    loading
) {

    const content =
        document.querySelector(
            ".dashboard-content"
        );


    if (!content) {
        return;
    }


    content.classList.toggle(
        "doctor-dashboard-loading",
        loading
    );
}


/* =========================================================
   ERROR
========================================================= */

function showDoctorError(
    message
) {

    const element =
        document.getElementById(
            "dashboardError"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.hidden = false;
}


function hideDoctorError() {

    const element =
        document.getElementById(
            "dashboardError"
        );


    if (!element) {
        return;
    }


    element.hidden = true;
}


/* =========================================================
   NORMALIZATION
========================================================= */

function normalizePatients(
    response
) {

    if (Array.isArray(response)) {
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


function normalizeSinglePatient(
    response
) {

    if (!response) {
        return null;
    }


    if (response.patient) {
        return response.patient;
    }


    if (response.data) {
        return response.data;
    }


    if (
        response.id &&
        response.full_name
    ) {

        return response;
    }


    return null;
}


function normalizeAlerts(
    response
) {

    if (Array.isArray(response)) {
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


function normalizeEvents(
    response
) {

    if (Array.isArray(response)) {
        return response;
    }


    if (
        response &&
        Array.isArray(
            response.events
        )
    ) {

        return response.events;
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
   VALUE HELPERS
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


function formatDuration(
    seconds
) {

    if (
        seconds === null ||
        seconds === undefined ||
        seconds === ""
    ) {

        return "—";
    }


    const total =
        Number(seconds);


    if (
        !Number.isFinite(total)
    ) {

        return "—";
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
        severity === "attention" ||
        severity === "warning"
    ) {

        return "warning";
    }


    return "normal";
}


function formatDateTime(
    value
) {

    if (!value) {
        return "Time unavailable";
    }


    const date =
        new Date(value);


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
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   PATIENT
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
            .slice(0, 2)
            .toUpperCase();
    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   DOM
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
   HTML ESCAPE
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