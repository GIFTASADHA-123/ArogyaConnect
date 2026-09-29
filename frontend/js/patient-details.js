/* =========================================================
   AROGYACONNECT
   PATIENT DETAILS PAGE
   =========================================================

   Loads patient information from FastAPI / MySQL.

   Supported URLs:

       patient-details.html?patient=P001

   OR:

       patient-details.html?patient_id=1

   OR:

       patient-details.html

   In the last case the currently active patient is used.

========================================================= */

"use strict";


/* =========================================================
   PAGE STATE
========================================================= */

let currentPatient = null;
let currentPatientId = null;

let currentSensorReading = null;


/* =========================================================
   DOM HELPER
========================================================= */

function getElement(id) {

    return document.getElementById(id);
}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value,
    fallback = "—"
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        element.textContent =
            fallback;

        return;
    }

    element.textContent =
        String(value);
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

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


/* =========================================================
   GET QUERY PARAMETERS
========================================================= */

function getPatientParameters() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const patientCode =
        params.get("patient");


    const patientId =
        params.get("patient_id");


    return {

        patientCode:
            patientCode
                ? patientCode.trim()
                : null,

        patientId:
            patientId
                ? Number(patientId)
                : null
    };
}


/* =========================================================
   SHOW LOADING
========================================================= */

function showLoading() {

    const loading =
        getElement(
            "patientDetailsLoading"
        );

    if (loading) {

        loading.style.display =
            "flex";
    }


    const grid =
        getElement(
            "patientDetailsGrid"
        );

    if (grid) {

        grid.style.opacity =
            "0.55";
    }
}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    const loading =
        getElement(
            "patientDetailsLoading"
        );

    if (loading) {

        loading.style.display =
            "none";
    }


    const grid =
        getElement(
            "patientDetailsGrid"
        );

    if (grid) {

        grid.style.opacity =
            "1";
    }
}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(
    message
) {

    const errorBox =
        getElement(
            "patientDetailsError"
        );


    if (!errorBox) {
        return;
    }


    errorBox.textContent =
        message ||
        "Unable to load patient information.";


    errorBox.classList.add(
        "show"
    );
}


/* =========================================================
   HIDE ERROR
========================================================= */

function hideError() {

    const errorBox =
        getElement(
            "patientDetailsError"
        );


    if (!errorBox) {
        return;
    }


    errorBox.classList.remove(
        "show"
    );
}


/* =========================================================
   GET PATIENT
========================================================= */

async function resolvePatient() {

    const params =
        getPatientParameters();


    /*
     * -----------------------------------------------------
     * PATIENT CODE
     * -----------------------------------------------------
     */

    if (
        params.patientCode
    ) {

        try {

            const patient =
                await window.ArogyaAPI
                    .getPatientByCode(
                        params.patientCode
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
     * -----------------------------------------------------
     * PATIENT ID
     * -----------------------------------------------------
     */

    if (
        params.patientId &&
        Number.isFinite(
            params.patientId
        )
    ) {

        try {

            return await window.ArogyaAPI
                .getPatient(
                    params.patientId
                );

        } catch (error) {

            console.warn(
                "Patient ID lookup failed:",
                error
            );
        }
    }


    /*
     * -----------------------------------------------------
     * STORED CURRENT PATIENT
     * -----------------------------------------------------
     */

    const storedId =
        localStorage.getItem(
            "arogya_current_patient_id"
        );


    if (storedId) {

        const numericId =
            Number(storedId);


        if (
            Number.isFinite(
                numericId
            )
        ) {

            try {

                const patient =
                    await window.ArogyaAPI
                        .getPatient(
                            numericId
                        );


                if (patient) {

                    return patient;
                }

            } catch (error) {

                console.warn(
                    "Stored patient lookup failed:",
                    error
                );
            }
        }
    }


    /*
     * -----------------------------------------------------
     * CURRENT ACTIVE PATIENT
     * -----------------------------------------------------
     */

    try {

        const current =
            await window.ArogyaAPI
                .getCurrentActivePatient();


        if (current) {

            if (
                current.patient
            ) {

                return current.patient;
            }


            if (
                current.patient_id
            ) {

                return await window.ArogyaAPI
                    .getPatient(
                        current.patient_id
                    );
            }


            if (
                current.id
            ) {

                return current;
            }
        }

    } catch (error) {

        console.warn(
            "Current active patient lookup failed:",
            error
        );
    }


    /*
     * -----------------------------------------------------
     * FALLBACK
     * -----------------------------------------------------
     */

    try {

        const response =
            await window.ArogyaAPI
                .getPatients();


        const patients =
            Array.isArray(response)
                ? response
                : response?.patients || [];


        if (
            patients.length > 0
        ) {

            return patients[0];
        }

    } catch (error) {

        console.warn(
            "Patient list fallback failed:",
            error
        );
    }


    return null;
}


/* =========================================================
   GET PATIENT NAME
========================================================= */

function getPatientName(
    patient
) {

    if (!patient) {

        return "Unknown Patient";
    }


    return (
        patient.full_name ||
        patient.name ||
        "Unknown Patient"
    );
}


/* =========================================================
   GET PATIENT CODE
========================================================= */

function getPatientCode(
    patient
) {

    if (!patient) {

        return "—";
    }


    return (
        patient.patient_code ||
        patient.patientCode ||
        "—"
    );
}


/* =========================================================
   GET PATIENT AGE
========================================================= */

function getPatientAge(
    patient
) {

    if (
        patient?.age !== null &&
        patient?.age !== undefined &&
        patient?.age !== ""
    ) {

        return `${patient.age} years`;
    }


    return "Age not available";
}


/* =========================================================
   PATIENT INITIALS
========================================================= */

function getInitials(
    name
) {

    if (!name) {
        return "PT";
    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "Not available";
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


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================================================
   FORMAT DATE TIME
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "No reading";
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
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   FORMAT TEMPERATURE
========================================================= */

function formatTemperature(
    value
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
        Number.isNaN(
            number
        )
    ) {

        return `${value}`;
    }


    return `${number.toFixed(1)} °C`;
}


/* =========================================================
   GET LATEST SENSOR READING
========================================================= */

async function loadLatestSensorReading(
    patientId
) {

    if (!patientId) {

        return null;
    }


    try {

        const response =
            await window.ArogyaAPI
                .getLatestSensorReading(
                    patientId
                );


        /*
         * Backend returns:
         *
         * {
         *     has_data: true,
         *     patient_id: 1,
         *     reading: {...}
         * }
         */

        if (
            response &&
            response.reading
        ) {

            return response.reading;
        }


        /*
         * Compatibility if the API
         * returns the reading directly.
         */

        if (
            response &&
            response.recorded_at
        ) {

            return response;
        }

    } catch (error) {

        console.warn(
            "Latest sensor reading unavailable:",
            error
        );
    }


    return null;
}


/* =========================================================
   RENDER PATIENT HEADER
========================================================= */

function renderPatientHeader(
    patient
) {

    const name =
        getPatientName(
            patient
        );


    const code =
        getPatientCode(
            patient
        );


    const age =
        getPatientAge(
            patient
        );


    const gender =
        patient.gender ||
        "Gender not available";


    const diagnosis =
        patient.diagnosis ||
        "Clinical monitoring";


    setText(
        "patientName",
        name
    );


    setText(
        "patientCode",
        code
    );


    setText(
        "patientBasicInfo",
        `${age} • ${gender}`
    );


    setText(
        "patientCondition",
        diagnosis
    );


    setText(
        "patientStatus",
        patient.is_active === false
            ? "Inactive Patient"
            : "Under Monitoring"
    );


    const avatar =
        getElement(
            "patientAvatar"
        );


    if (avatar) {

        avatar.textContent =
            getInitials(
                name
            );
    }
}


/* =========================================================
   RENDER PERSONAL INFORMATION
========================================================= */

function renderPersonalInformation(
    patient
) {

    const name =
        getPatientName(
            patient
        );


    const code =
        getPatientCode(
            patient
        );


    setText(
        "detailFullName",
        name
    );


    setText(
        "detailPatientCode",
        code
    );


    setText(
        "detailAge",
        getPatientAge(
            patient
        )
    );


    setText(
        "detailGender",
        patient.gender ||
        "Not provided"
    );
}


/* =========================================================
   RENDER MEDICAL INFORMATION
========================================================= */

function renderMedicalInformation(
    patient
) {

    setText(
        "detailDiagnosis",
        patient.diagnosis ||
        "Not provided"
    );


    setText(
        "detailMedicalConditions",
        patient.medical_conditions ||
        "No medical conditions recorded"
    );
}


/* =========================================================
   RENDER ADDITIONAL INFORMATION
========================================================= */

function renderAdditionalInformation(
    patient
) {

    /*
     * The current backend does not expose
     * date_of_birth or notes.
     *
     * Therefore we display safe fallback
     * values rather than inventing data.
     */

    setText(
        "detailDateOfBirth",
        patient.date_of_birth ||
        "Not provided"
    );


    setText(
        "detailBloodGroup",
        patient.blood_group ||
        "Not provided"
    );


    setText(
        "detailNotes",
        patient.notes ||
        "No notes recorded"
    );
}


/* =========================================================
   RENDER SENSOR SUMMARY
========================================================= */

function renderSensorSummary(
    reading
) {

    currentSensorReading =
        reading;


    if (!reading) {

        setText(
            "summaryTemperature",
            "No data"
        );


        setText(
            "summaryPosition",
            "No data"
        );


        setText(
            "summaryFall",
            "No data"
        );


        setText(
            "summaryLastUpdate",
            "No sensor reading"
        );


        return;
    }


    setText(
        "summaryTemperature",
        formatTemperature(
            reading.temperature
        )
    );


    setText(
        "summaryPosition",
        reading.position_status ||
        "Unknown"
    );


    setText(
        "summaryFall",
        reading.fall_detected
            ? "Fall Detected"
            : "No Fall"
    );


    setText(
        "summaryLastUpdate",
        formatDateTime(
            reading.recorded_at
        )
    );
}


/* =========================================================
   RENDER MEDICAL TAGS
========================================================= */

function renderMedicalTags(
    patient
) {

    const container =
        getElement(
            "medicalTags"
        );


    if (!container) {
        return;
    }


    const tags = [];


    if (
        patient.diagnosis
    ) {

        tags.push(
            patient.diagnosis
        );
    }


    if (
        patient.medical_conditions
    ) {

        const conditions =
            String(
                patient.medical_conditions
            )
                .split(",")
                .map(
                    value =>
                        value.trim()
                )
                .filter(Boolean);


        tags.push(
            ...conditions
        );
    }


    if (
        patient.blood_group
    ) {

        tags.push(
            `Blood Group: ${patient.blood_group}`
        );
    }


    if (
        tags.length === 0
    ) {

        tags.push(
            "Monitoring"
        );
    }


    container.innerHTML =
        tags
            .slice(0, 8)
            .map(
                (
                    tag,
                    index
                ) => {

                    return `
                        <span class="medical-tag ${index === 0 ? "primary" : ""}">
                            ${escapeHtml(tag)}
                        </span>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   UPDATE ACTION LINKS
========================================================= */

function updateActionLinks(
    patient
) {

    const code =
        getPatientCode(
            patient
        );


    const encoded =
        encodeURIComponent(
            code
        );


    const monitor =
        document.querySelector(
            'a[href^="patient-monitor.html"]'
        );


    const history =
        document.querySelector(
            'a[href^="patient-history.html"]'
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
   STORE CURRENT PATIENT
========================================================= */

function storeCurrentPatient(
    patient
) {

    if (!patient) {
        return;
    }


    if (
        patient.id !== undefined &&
        patient.id !== null
    ) {

        currentPatientId =
            Number(
                patient.id
            );


        localStorage.setItem(
            "arogya_current_patient_id",
            String(
                patient.id
            )
        );
    }


    const code =
        getPatientCode(
            patient
        );


    if (code !== "—") {

        localStorage.setItem(
            "arogya_current_patient_code",
            code
        );
    }
}


/* =========================================================
   LOAD PATIENT DETAILS
========================================================= */

async function loadPatientDetails() {

    showLoading();

    hideError();


    try {

        const patient =
            await resolvePatient();


        if (!patient) {

            throw new Error(
                "No patient record could be found."
            );
        }


        currentPatient =
            patient;


        currentPatientId =
            Number(
                patient.id
            );


        storeCurrentPatient(
            patient
        );


        /*
         * Patient information
         */

        renderPatientHeader(
            patient
        );


        renderPersonalInformation(
            patient
        );


        renderMedicalInformation(
            patient
        );


        renderAdditionalInformation(
            patient
        );


        renderMedicalTags(
            patient
        );


        updateActionLinks(
            patient
        );


        /*
         * Latest sensor reading
         */

        const reading =
            await loadLatestSensorReading(
                currentPatientId
            );


        renderSensorSummary(
            reading
        );


    } catch (error) {

        console.error(
            "Patient details error:",
            error
        );


        showError(
            error?.message ||
            "Unable to load patient information."
        );

    } finally {

        hideLoading();
    }
}


/* =========================================================
   DATE
========================================================= */

function updateCurrentDate() {

    const element =
        getElement(
            "currentDate"
        );


    if (!element) {
        return;
    }


    const now =
        new Date();


    element.textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshPatientDetails() {

    await loadPatientDetails();
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializePatientDetails() {

    /*
     * Authentication is already handled by auth.js.
     */

    updateCurrentDate();


    window.setInterval(
        updateCurrentDate,
        30000
    );


    await loadPatientDetails();
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePatientDetails
);


/* =========================================================
   PUBLIC API
========================================================= */

window.ArogyaPatientDetails = {

    load:
        loadPatientDetails,

    refresh:
        refreshPatientDetails,

    getCurrentPatient:
        function () {

            return currentPatient;
        },

    getCurrentReading:
        function () {

            return currentSensorReading;
        }
};