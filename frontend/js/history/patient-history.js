/*
 * ArogyaConnect
 * Patient History
 *
 * Loads stored sensor readings from FastAPI.
 * Patient is selected from the existing patients table.
 * No sensor values are generated in the browser.
 */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const API_BASE_URL =
        "http://127.0.0.1:8000";

    const REFRESH_INTERVAL =
        30000;


    /* =====================================================
       STATE
    ====================================================== */

    let currentPatientId = null;

    let currentStartDate = null;

    let currentEndDate = null;

    let currentReadings = [];

    let refreshTimer = null;

    let isLoading = false;

    let patients = [];


    /* =====================================================
       DOM HELPERS
    ====================================================== */

    function getElement(id) {

        return document.getElementById(id);

    }


    function setText(id, value) {

        const element =
            getElement(id);

        if (!element) {
            return;
        }

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : value;

    }


    /* =====================================================
       AUTHENTICATION
    ====================================================== */

    function checkAuthentication() {

        const loggedIn =
            localStorage.getItem(
                "arogya_logged_in"
            );


        if (loggedIn !== "true") {

            window.location.href =
                "login.html";

            return false;
        }


        return true;
    }


    /* =====================================================
       API REQUEST
    ====================================================== */

    async function apiRequest(
        endpoint,
        options = {}
    ) {

        const token =
            localStorage.getItem(
                "arogya_access_token"
            );


        const headers = {

            "Content-Type":
                "application/json",

            ...(options.headers || {})

        };


        if (token) {

            headers.Authorization =
                `Bearer ${token}`;

        }


        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );


        if (!response.ok) {

            let message =
                `Request failed (${response.status})`;


            try {

                const error =
                    await response.json();


                if (
                    typeof error.detail ===
                    "string"
                ) {

                    message =
                        error.detail;

                }

            } catch (error) {

                // Ignore invalid response body.

            }


            throw new Error(message);

        }


        return response.json();

    }


    /* =====================================================
       DATE HELPERS
    ====================================================== */

    function formatDateInput(date) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");


        const day =
            String(
                date.getDate()
            ).padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    function startOfDay(date) {

        const result =
            new Date(date);


        result.setHours(
            0,
            0,
            0,
            0
        );


        return result;

    }


    function endOfDay(date) {

        const result =
            new Date(date);


        result.setHours(
            23,
            59,
            59,
            999
        );


        return result;

    }


    function getToday() {

        return new Date();

    }


    function getYesterday() {

        const date =
            new Date();


        date.setDate(
            date.getDate() - 1
        );


        return date;

    }


    function getSevenDaysAgo() {

        const date =
            new Date();


        date.setDate(
            date.getDate() - 6
        );


        return date;

    }


    function setDateInputs(
        startDate,
        endDate
    ) {

        const startInput =
            getElement("startDate");


        const endInput =
            getElement("endDate");


        currentStartDate =
            formatDateInput(
                startDate
            );


        currentEndDate =
            formatDateInput(
                endDate
            );


        if (startInput) {

            startInput.value =
                currentStartDate;

        }


        if (endInput) {

            endInput.value =
                currentEndDate;

        }

    }


    function setTodayRange() {

        const today =
            getToday();


        setDateInputs(
            startOfDay(today),
            endOfDay(today)
        );

    }


    /* =====================================================
       LOAD ALL PATIENTS
    ====================================================== */

    async function loadPatients() {

        const selector =
            getElement(
                "patientSelector"
            );


        if (selector) {

            selector.disabled =
                true;


            selector.innerHTML =
                `
                    <option value="">
                        Loading patients...
                    </option>
                `;

        }


        try {

            /*
             * active_only=false
             * makes sure all patients are loaded.
             */

            const response =
                await apiRequest(
                    "/api/patients/?active_only=false&limit=1000"
                );


            if (Array.isArray(response)) {

                patients =
                    response;

            } else if (
                response &&
                Array.isArray(
                    response.patients
                )
            ) {

                patients =
                    response.patients;

            } else if (
                response &&
                Array.isArray(
                    response.data
                )
            ) {

                patients =
                    response.data;

            } else {

                patients = [];

            }


            /*
             * Sort by patient code.
             */

            patients.sort(
                function (a, b) {

                    const codeA =
                        String(
                            a.patient_code ||
                            a.code ||
                            a.id ||
                            ""
                        );


                    const codeB =
                        String(
                            b.patient_code ||
                            b.code ||
                            b.id ||
                            ""
                        );


                    return codeA.localeCompare(
                        codeB,
                        undefined,
                        {
                            numeric: true
                        }
                    );

                }
            );


            populatePatientSelector();


            return patients;

        } catch (error) {

            console.error(
                "Unable to load patients:",
                error
            );


            if (selector) {

                selector.innerHTML =
                    `
                        <option value="">
                            Unable to load patients
                        </option>
                    `;

                selector.disabled =
                    true;

            }


            renderNoPatient();


            return [];

        }

    }


    /* =====================================================
       POPULATE PATIENT DROPDOWN
    ====================================================== */

    function populatePatientSelector() {

        const selector =
            getElement(
                "patientSelector"
            );


        if (!selector) {
            return;
        }


        selector.innerHTML = "";


        if (!patients.length) {

            selector.innerHTML =
                `
                    <option value="">
                        No patients found
                    </option>
                `;

            selector.disabled =
                true;

            return;
        }


        patients.forEach(
            function (patient) {

                const option =
                    document.createElement(
                        "option"
                    );


                const id =
                    patient.id;


                const code =
                    patient.patient_code ||
                    patient.code ||
                    `P${String(id).padStart(3, "0")}`;


                const name =
                    patient.full_name ||
                    patient.name ||
                    "Unknown Patient";


                const ward =
                    patient.ward
                        ? ` • ${patient.ward}`
                        : "";


                const bed =
                    patient.bed_number
                        ? ` • Bed ${patient.bed_number}`
                        : "";


                option.value =
                    String(id);


                option.textContent =
                    `${code} - ${name}${ward}${bed}`;


                selector.appendChild(
                    option
                );

            }
        );


        selector.disabled =
            false;

    }


    /* =====================================================
       INITIAL PATIENT
    ====================================================== */

    function getRequestedPatientId() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return (

            params.get("patient_id") ||

            params.get("id") ||

            params.get("patient") ||

            localStorage.getItem(
                "arogya_current_patient_id"
            )

        );

    }


    function selectInitialPatient() {

        if (!patients.length) {

            currentPatientId =
                null;

            return;

        }


        const requestedId =
            getRequestedPatientId();


        const matchingPatient =
            requestedId
                ? patients.find(
                    function (patient) {

                        return (
                            String(
                                patient.id
                            ) ===
                            String(
                                requestedId
                            )
                        );

                    }
                )
                : null;


        const selectedPatient =
            matchingPatient ||
            patients[0];


        currentPatientId =
            String(
                selectedPatient.id
            );


        const selector =
            getElement(
                "patientSelector"
            );


        if (selector) {

            selector.value =
                currentPatientId;

        }


        localStorage.setItem(
            "arogya_current_patient_id",
            currentPatientId
        );

    }


    /* =====================================================
       PATIENT CHANGE
    ====================================================== */

    async function handlePatientChange() {

        const selector =
            getElement(
                "patientSelector"
            );


        if (
            !selector ||
            !selector.value
        ) {

            currentPatientId =
                null;


            localStorage.removeItem(
                "arogya_current_patient_id"
            );


            renderNoPatient();

            renderEmptyHistory();

            return;

        }


        currentPatientId =
            selector.value;


        localStorage.setItem(
            "arogya_current_patient_id",
            currentPatientId
        );


        currentReadings = [];


        renderEmptyHistory();


        await loadPatient();

        await loadHistory();

    }


    function setupPatientSelector() {

        const selector =
            getElement(
                "patientSelector"
            );


        if (!selector) {
            return;
        }


        selector.addEventListener(
            "change",
            handlePatientChange
        );

    }


    /* =====================================================
       LOAD PATIENT INFORMATION
    ====================================================== */

    async function loadPatient() {

        if (!currentPatientId) {

            renderNoPatient();

            return;

        }


        try {

            const data =
                await apiRequest(
                    `/api/patients/${currentPatientId}`
                );


            const patient =
                data.patient ||
                data.data ||
                data;


            renderPatient(
                patient
            );

        } catch (error) {

            console.warn(
                "Unable to load patient:",
                error.message
            );


            setText(
                "patientName",
                "Current Patient"
            );


            setText(
                "patientDetails",
                `Patient ID: ${currentPatientId}`
            );

        }

    }


    function renderPatient(
        patient
    ) {

        if (!patient) {

            renderNoPatient();

            return;

        }


        const name =
            patient.full_name ||
            patient.name ||
            "Current Patient";


        const code =
            patient.patient_code ||
            patient.code ||
            currentPatientId;


        const details = [];


        if (
            patient.age !== null &&
            patient.age !== undefined
        ) {

            details.push(
                `${patient.age} years`
            );

        }


        if (patient.gender) {

            details.push(
                patient.gender
            );

        }


        if (patient.ward) {

            details.push(
                patient.ward
            );

        }


        if (patient.bed_number) {

            details.push(
                `Bed ${patient.bed_number}`
            );

        }


        if (code) {

            details.push(
                `ID: ${code}`
            );

        }


        setText(
            "patientName",
            name
        );


        setText(
            "patientDetails",
            details.join(" • ")
        );


        const avatar =
            getElement(
                "patientAvatar"
            );


        if (avatar) {

            avatar.textContent =
                getInitials(name);

        }

    }


    function renderNoPatient() {

        setText(
            "patientName",
            "No Patient Selected"
        );


        setText(
            "patientDetails",
            "Select a patient to view history."
        );


        const avatar =
            getElement(
                "patientAvatar"
            );


        if (avatar) {

            avatar.textContent =
                "PT";

        }

    }


    function getInitials(
        name
    ) {

        if (!name) {
            return "PT";
        }


        const parts =
            name
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
            parts[
                parts.length - 1
            ][0]
        ).toUpperCase();

    }


    /* =====================================================
       HISTORY API
    ====================================================== */

    async function fetchHistory() {

        if (!currentPatientId) {

            return [];

        }


        let endpoint =
            `/api/sensors/patient/${currentPatientId}/history`;


        const params =
            new URLSearchParams();


        if (currentStartDate) {

            params.set(
                "start_date",
                currentStartDate
            );

        }


        if (currentEndDate) {

            params.set(
                "end_date",
                currentEndDate
            );

        }


        params.set(
            "limit",
            "5000"
        );


        endpoint +=
            `?${params.toString()}`;


        const data =
            await apiRequest(
                endpoint
            );


        if (Array.isArray(data)) {

            return data;

        }


        if (
            data &&
            Array.isArray(
                data.readings
            )
        ) {

            return data.readings;

        }


        if (
            data &&
            Array.isArray(
                data.data
            )
        ) {

            return data.data;

        }


        if (
            data &&
            Array.isArray(
                data.items
            )
        ) {

            return data.items;

        }


        return [];

    }


    /* =====================================================
       NORMALIZE SENSOR READING
    ====================================================== */

    function normalizeReading(
        reading
    ) {

        return {

            id:
                reading.id,


            temperature:
                toNumber(
                    reading.temperature
                ),


            gyro_x:
                toNumber(
                    reading.gyro_x ??
                    reading.gyroX
                ),


            gyro_y:
                toNumber(
                    reading.gyro_y ??
                    reading.gyroY
                ),


            gyro_z:
                toNumber(
                    reading.gyro_z ??
                    reading.gyroZ
                ),


            force_fall:
                toNumber(
                    reading.force_fall
                ),


            force_position:
                toNumber(
                    reading.force_position
                ),


            urine_distance:
                toNumber(
                    reading.urine_distance ??
                    reading.urineDistance
                ),


            iv_distance:
                toNumber(
                    reading.iv_distance ??
                    reading.ivDistance
                ),


            position_status:
                reading.position_status ??
                reading.position_label,


            position_duration_seconds:
                toNumber(
                    reading.position_duration_seconds ??
                    reading.positionDurationSeconds
                ),


            fall_detected:
                Boolean(
                    reading.fall_detected ??
                    reading.fallDetected
                ),


            same_position:
                Boolean(
                    reading.same_position ??
                    reading.samePosition
                ),


            buzzer_status:
                Boolean(
                    reading.buzzer_status ??
                    reading.buzzerStatus
                ),


            recorded_at:
                reading.recorded_at ||
                reading.created_at

        };

    }


    function toNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return null;

        }


        const number =
            Number(value);


        return Number.isNaN(
            number
        )
            ? null
            : number;

    }


    /* =====================================================
       LOAD HISTORY
    ====================================================== */

    async function loadHistory() {

        if (isLoading) {
            return;
        }


        if (!currentPatientId) {

            currentReadings =
                [];

            renderEmptyHistory();

            return;

        }


        isLoading =
            true;


        showLoading();


        try {

            const data =
                await fetchHistory();


            currentReadings =
                data
                    .map(
                        normalizeReading
                    )
                    .sort(
                        function (a, b) {

                            return (
                                new Date(
                                    b.recorded_at
                                ) -
                                new Date(
                                    a.recorded_at
                                )
                            );

                        }
                    );


            renderHistory(
                currentReadings
            );


        } catch (error) {

            console.error(
                "Unable to load patient history:",
                error
            );


            currentReadings =
                [];


            renderHistoryError(
                error.message
            );


        } finally {

            isLoading =
                false;


            hideLoading();

        }

    }


    /* =====================================================
       RENDER HISTORY
    ====================================================== */

    function renderHistory(
        readings
    ) {

        updateSummary(
            readings
        );


        renderTable(
            readings
        );


        window.arogyaHistoryReadings =
            readings;


        if (
            window.ArogyaPatientCharts &&
            typeof
                window.ArogyaPatientCharts.render ===
                "function"
        ) {

            window.ArogyaPatientCharts.render(
                readings
            );

        }

    }


    /* =====================================================
       SUMMARY
    ====================================================== */

    function updateSummary(
        readings
    ) {

        const total =
            readings.length;


        setText(
            "totalReadings",
            total
        );


        const temperatures =
            readings
                .map(
                    function (reading) {

                        return reading.temperature;

                    }
                )
                .filter(
                    function (value) {

                        return value !== null;

                    }
                );


        const averageTemperature =
            temperatures.length
                ? temperatures.reduce(
                    function (
                        sum,
                        value
                    ) {

                        return (
                            sum + value
                        );

                    },
                    0
                ) /
                temperatures.length
                : null;


        setText(
            "averageTemperature",
            averageTemperature === null
                ? "—"
                : `${averageTemperature.toFixed(1)} °C`
        );


        const fallEvents =
            readings.filter(
                function (reading) {

                    return reading.fall_detected;

                }
            ).length;


        setText(
            "fallEvents",
            fallEvents
        );


        const positionEvents =
            readings.filter(
                function (reading) {

                    return (
                        reading.position_status !==
                            null &&
                        reading.position_status !==
                            undefined &&
                        reading.position_status !==
                            ""
                    );

                }
            ).length;


        setText(
            "positionEvents",
            positionEvents
        );


        setText(
            "readingCount",
            `${total} reading${total === 1 ? "" : "s"}`
        );

    }


    /* =====================================================
       HISTORY TABLE
    ====================================================== */

    function renderTable(
        readings
    ) {

        const tbody =
            getElement(
                "historyTableBody"
            );


        if (!tbody) {
            return;
        }


        if (!readings.length) {

            renderEmptyTable();

            return;

        }


        tbody.innerHTML =
            readings
                .map(
                    function (reading) {

                        const fallClass =
                            reading.fall_detected
                                ? "history-fall-danger"
                                : "history-fall-normal";


                        const fallText =
                            reading.fall_detected
                                ? "Detected"
                                : "No";


                        return `

                            <tr>

                                <td>
                                    ${escapeHtml(
                                        formatDateTime(
                                            reading.recorded_at
                                        )
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.temperature,
                                        1,
                                        " °C"
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.gyro_x,
                                        2
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.gyro_y,
                                        2
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.gyro_z,
                                        2
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        reading.position_status ||
                                        "—"
                                    )}
                                </td>


                                <td>
                                    ${formatDuration(
                                        reading.position_duration_seconds
                                    )}
                                </td>


                                <td>

                                    <span
                                        class="${fallClass}"
                                    >
                                        ${fallText}
                                    </span>

                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.urine_distance,
                                        1,
                                        " cm"
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        reading.iv_distance,
                                        1,
                                        " cm"
                                    )}
                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    function renderEmptyTable() {

        const tbody =
            getElement(
                "historyTableBody"
            );


        if (!tbody) {
            return;
        }


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="history-empty-cell"
                >

                    <div class="history-empty">

                        <div class="history-empty-icon">
                            —
                        </div>


                        <strong>
                            No readings found
                        </strong>


                        <span>
                            No stored sensor readings are
                            available for the selected date range.
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    function renderEmptyHistory() {

        updateSummary([]);

        renderEmptyTable();


        window.arogyaHistoryReadings =
            [];


        if (
            window.ArogyaPatientCharts &&
            typeof
                window.ArogyaPatientCharts.render ===
                "function"
        ) {

            window.ArogyaPatientCharts.render(
                []
            );

        }

    }


    function renderHistoryError(
        message
    ) {

        updateSummary([]);


        const tbody =
            getElement(
                "historyTableBody"
            );


        if (!tbody) {
            return;
        }


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="history-empty-cell"
                >

                    <div class="history-empty">

                        <div class="history-empty-icon error">
                            !
                        </div>


                        <strong>
                            Unable to load history
                        </strong>


                        <span>
                            ${escapeHtml(
                                message ||
                                "Please check the backend connection."
                            )}
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       FORMATTERS
    ====================================================== */

    function formatNumber(
        value,
        decimals = 1,
        suffix = ""
    ) {

        if (
            value === null ||
            value === undefined ||
            Number.isNaN(
                Number(value)
            )
        ) {

            return "—";

        }


        return (
            Number(value).toFixed(
                decimals
            ) +
            suffix
        );

    }


    function formatDuration(
        seconds
    ) {

        if (
            seconds === null ||
            seconds === undefined ||
            Number.isNaN(
                Number(seconds)
            )
        ) {

            return "—";

        }


        const total =
            Math.max(
                0,
                Number(seconds)
            );


        const hours =
            Math.floor(
                total / 3600
            );


        const minutes =
            Math.floor(
                (total % 3600) / 60
            );


        const remaining =
            Math.floor(
                total % 60
            );


        if (hours > 0) {

            return `${hours}h ${minutes}m`;

        }


        if (minutes === 0) {

            return `${remaining}s`;

        }


        return `${minutes}m ${remaining}s`;

    }


    function formatDateTime(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleString(
            "en-IN",
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


    /* =====================================================
       DATE FILTER BUTTONS
    ====================================================== */

    function setupDateFilters() {

        const buttons =
            document.querySelectorAll(
                "[data-range]"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const range =
                            button.dataset.range;


                        buttons.forEach(
                            function (btn) {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        applyPresetRange(
                            range
                        );

                    }
                );

            }
        );

    }


    function applyPresetRange(
        range
    ) {

        const today =
            getToday();


        if (range === "today") {

            setDateInputs(
                startOfDay(today),
                endOfDay(today)
            );

        }

        else if (
            range === "yesterday"
        ) {

            const yesterday =
                getYesterday();


            setDateInputs(
                startOfDay(
                    yesterday
                ),
                endOfDay(
                    yesterday
                )
            );

        }

        else if (
            range === "7days" ||
            range === "last7days"
        ) {

            setDateInputs(
                startOfDay(
                    getSevenDaysAgo()
                ),
                endOfDay(today)
            );

        }

        else if (
            range === "custom"
        ) {

            return;

        }


        loadHistory();

    }


    /* =====================================================
       CUSTOM DATE RANGE
    ====================================================== */

    function setupCustomDateRange() {

        const startInput =
            getElement(
                "startDate"
            );


        const endInput =
            getElement(
                "endDate"
            );


        const applyButton =
            getElement(
                "applyDateRange"
            );


        if (applyButton) {

            applyButton.addEventListener(
                "click",
                applyCustomRange
            );

        }


        if (startInput) {

            startInput.addEventListener(
                "change",
                activateCustomFilter
            );

        }


        if (endInput) {

            endInput.addEventListener(
                "change",
                activateCustomFilter
            );

        }

    }


    function activateCustomFilter() {

        document
            .querySelectorAll(
                "[data-range]"
            )
            .forEach(
                function (button) {

                    button.classList.remove(
                        "active"
                    );

                }
            );


        const customButton =
            document.querySelector(
                '[data-range="custom"]'
            );


        if (customButton) {

            customButton.classList.add(
                "active"
            );

        }

    }


    function applyCustomRange() {

        const startInput =
            getElement(
                "startDate"
            );


        const endInput =
            getElement(
                "endDate"
            );


        if (
            !startInput ||
            !endInput ||
            !startInput.value ||
            !endInput.value
        ) {

            alert(
                "Please select both start and end dates."
            );


            return;

        }


        if (
            startInput.value >
            endInput.value
        ) {

            alert(
                "Start date cannot be after the end date."
            );


            return;

        }


        currentStartDate =
            startInput.value;


        currentEndDate =
            endInput.value;


        activateCustomFilter();


        loadHistory();

    }


    /* =====================================================
       REFRESH BUTTON
    ====================================================== */

    function setupRefreshButton() {

        const button =
            getElement(
                "refreshHistory"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            loadHistory
        );

    }


    /* =====================================================
       LOADING
    ====================================================== */

    function showLoading() {

        const loading =
            getElement(
                "historyLoading"
            );


        if (loading) {

            loading.style.display =
                "flex";

        }

    }


    function hideLoading() {

        const loading =
            getElement(
                "historyLoading"
            );


        if (loading) {

            loading.style.display =
                "none";

        }

    }


    /* =====================================================
       CURRENT DATE
    ====================================================== */

    function updateCurrentDate() {

        setText(
            "currentDate",
            new Date().toLocaleDateString(
                "en-IN",
                {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            )
        );

    }


    /* =====================================================
       USER DISPLAY
    ====================================================== */

    function updateUserDisplay() {

        const username =
            localStorage.getItem(
                "arogya_username"
            ) || "Staff";


        const role =
            (
                localStorage.getItem(
                    "arogya_role"
                ) || ""
            ).toLowerCase();


        const displayRole =
            role === "doctor"
                ? "Doctor"
                : role === "nurse"
                    ? "Nurse"
                    : "Medical Staff";


        const initial =
            username
                .trim()
                .charAt(0)
                .toUpperCase() ||
            "S";


        setText(
            "headerUserName",
            username
        );


        setText(
            "sidebarUserName",
            username
        );


        setText(
            "headerUserAvatar",
            initial
        );


        setText(
            "sidebarUserAvatar",
            initial
        );


        setText(
            "headerUserRole",
            displayRole
        );

    }


    /* =====================================================
       AUTO REFRESH
    ====================================================== */

    function startAutoRefresh() {

        stopAutoRefresh();


        refreshTimer =
            window.setInterval(
                function () {

                    loadHistory();

                },
                REFRESH_INTERVAL
            );

    }


    function stopAutoRefresh() {

        if (refreshTimer) {

            window.clearInterval(
                refreshTimer
            );


            refreshTimer =
                null;

        }

    }


    /* =====================================================
       PAGE VISIBILITY
    ====================================================== */

    function setupVisibility() {

        document.addEventListener(
            "visibilitychange",
            function () {

                if (document.hidden) {

                    stopAutoRefresh();

                }

                else {

                    loadHistory();

                    startAutoRefresh();

                }

            }
        );

    }


    /* =====================================================
       ESCAPE HTML
    ====================================================== */

    function escapeHtml(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)

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


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    async function initialize() {

        if (
            !checkAuthentication()
        ) {

            return;

        }


        updateCurrentDate();

        updateUserDisplay();


        /*
         * Default period:
         * Today
         */

        setTodayRange();


        /*
         * Setup controls
         */

        setupPatientSelector();

        setupDateFilters();

        setupCustomDateRange();

        setupRefreshButton();


        /*
         * Load patients first.
         */

        await loadPatients();


        /*
         * Select patient.
         */

        selectInitialPatient();


        /*
         * Load selected patient.
         */

        await loadPatient();

        await loadHistory();


        /*
         * Start automatic refresh.
         */

        startAutoRefresh();

        setupVisibility();

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


    /* =====================================================
       START
    ====================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );


})();