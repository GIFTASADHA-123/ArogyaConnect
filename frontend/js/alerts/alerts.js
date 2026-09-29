/*
 * =========================================================
 * ArogyaConnect
 * Patient Alerts
 *
 * Loads alerts from FastAPI/MySQL.
 * Includes real-time SOS popup notification.
 * =========================================================
 */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const REFRESH_INTERVAL = 5000;

    let allAlerts = [];

    let currentFilter = "all";

    let acknowledgeAlertId = null;

    let refreshTimer = null;


    /* =====================================================
       SOS POPUP NOTIFICATION
    ===================================================== */

    let lastShownSosAlertId = null;


    /*
     * Restore the last shown SOS from this browser session.
     */
    try {

        const savedSosId =
            sessionStorage.getItem(
                "arogya_last_sos_alert_id"
            );

        if (savedSosId) {

            lastShownSosAlertId =
                Number(savedSosId);

        }

    } catch (error) {

        console.warn(
            "Unable to read SOS session state:",
            error
        );

    }


    /*
     * Show SOS popup.
     */
    function showSosPopup(alert) {

        if (!alert) {
            return;
        }


        const alertId =
            Number(alert.id);


        /*
         * Invalid alert ID.
         */
        if (!alertId) {
            return;
        }


        /*
         * Do not show the same SOS twice.
         */
        if (
            lastShownSosAlertId !== null &&
            Number(lastShownSosAlertId) === alertId
        ) {
            return;
        }


        /*
         * Save this SOS as already shown.
         */
        lastShownSosAlertId =
            alertId;


        try {

            sessionStorage.setItem(
                "arogya_last_sos_alert_id",
                String(alertId)
            );

        } catch (error) {

            console.warn(
                "Unable to save SOS session state:",
                error
            );

        }


        /*
         * Remove old popup if it exists.
         */
        const oldPopup =
            document.getElementById(
                "sosPopup"
            );

        if (oldPopup) {
            oldPopup.remove();
        }


        /*
         * Create popup.
         */
        const popup =
            document.createElement(
                "div"
            );

        popup.id =
            "sosPopup";


        popup.innerHTML = `

            <div class="sos-popup-box">

                <div class="sos-popup-icon">
                    🚨
                </div>


                <div class="sos-popup-content">

                    <h2>
                        SOS ALERT
                    </h2>

                    <p>
                        Emergency SOS triggered by
                        patient monitoring hardware.
                    </p>

                    <span>
                        Immediate attention required
                    </span>

                </div>


                <button
                    type="button"
                    id="closeSosPopup"
                >
                    Acknowledge
                </button>

            </div>

        `;


        document.body.appendChild(
            popup
        );


        /*
         * Popup acknowledge button.
         */
        const closeButton =
            document.getElementById(
                "closeSosPopup"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                async function () {

                    closeButton.disabled =
                        true;

                    closeButton.textContent =
                        "Saving...";


                    try {

                        let userId =
                            null;


                        /*
                         * Get authenticated user ID.
                         */
                        if (
                            typeof Auth !== "undefined" &&
                            typeof Auth.getUserId ===
                                "function"
                        ) {

                            userId =
                                Auth.getUserId();

                        }


                        /*
                         * Fallback.
                         */
                        if (!userId) {

                            userId =
                                localStorage.getItem(
                                    "arogya_user_id"
                                );

                        }


                        /*
                         * Acknowledge SOS in database.
                         */
                        if (
                            typeof ArogyaAPI !== "undefined" &&
                            typeof ArogyaAPI.acknowledgeAlert ===
                                "function"
                        ) {

                            await ArogyaAPI.acknowledgeAlert(
                                alertId,
                                userId
                            );

                        }


                        /*
                         * Close popup.
                         */
                        popup.remove();


                        /*
                         * Refresh alerts.
                         */
                        await loadAlerts();


                    } catch (error) {

                        console.error(
                            "SOS acknowledge error:",
                            error
                        );


                        /*
                         * Close popup even if
                         * acknowledgement fails.
                         */
                        popup.remove();

                    }

                }
            );

        }


        /*
         * Optional SOS sound.
         *
         * Browser autoplay policies may prevent
         * sound until the page has user interaction.
         */
        try {

            const audio =
                new Audio(
                    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAAA"
                );


            audio.play().catch(
                function () {

                    console.warn(
                        "SOS sound blocked by browser."
                    );

                }
            );


        } catch (error) {

            console.warn(
                "SOS sound unavailable:",
                error
            );

        }

    }


    /* =====================================================
       DOM
    ===================================================== */

    function $(id) {

        return document.getElementById(
            id
        );

    }


    function setText(
        id,
        value
    ) {

        const element =
            $(id);


        if (element) {

            element.textContent =
                value;

        }

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    /* =====================================================
       INITIALS
    ===================================================== */

    function getInitials(name) {

        if (!name) {

            return "P";

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
                .substring(
                    0,
                    2
                )
                .toUpperCase();

        }


        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();

    }


    /* =====================================================
       DATE
    ===================================================== */

    function formatDateTime(
        value
    ) {

        if (!value) {

            return "--";

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
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function formatRelativeTime(
        value
    ) {

        if (!value) {

            return "--";

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


        const difference =
            Math.max(
                0,
                Date.now() -
                date.getTime()
            );


        const seconds =
            Math.floor(
                difference / 1000
            );


        if (seconds < 60) {

            return "Just now";

        }


        const minutes =
            Math.floor(
                seconds / 60
            );


        if (minutes < 60) {

            return minutes === 1
                ? "1 min ago"
                : `${minutes} mins ago`;

        }


        const hours =
            Math.floor(
                minutes / 60
            );


        if (hours < 24) {

            return hours === 1
                ? "1 hour ago"
                : `${hours} hours ago`;

        }


        const days =
            Math.floor(
                hours / 24
            );


        return days === 1
            ? "1 day ago"
            : `${days} days ago`;

    }


    /* =====================================================
       SEVERITY
    ===================================================== */

    function normalizeSeverity(
        severity
    ) {

        const value =
            String(
                severity || "normal"
            )
                .trim()
                .toLowerCase();


        /*
         * Database:
         * warning
         * critical
         *
         * UI:
         * Attention
         * Danger
         */

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
       SOS DETECTION
    ===================================================== */

    function isSosAlert(
        alert
    ) {

        const type =
            String(
                alert &&
                alert.alert_type
                    ? alert.alert_type
                    : ""
            )
                .trim()
                .toLowerCase();


        /*
         * SOS alert types.
         */
        if (
            [
                "fall",
                "sos",
                "emergency"
            ].includes(type)
        ) {

            return true;

        }


        const message =
            String(
                alert &&
                alert.message
                    ? alert.message
                    : ""
            )
                .toLowerCase();


        return (
            message.includes("sos") ||
            message.includes("emergency") ||
            message.includes("fall detected")
        );

    }


    function severityLabel(
        severity
    ) {

        const normalized =
            normalizeSeverity(
                severity
            );


        if (
            normalized === "danger"
        ) {

            return "Danger";

        }


        if (
            normalized === "warning"
        ) {

            return "Attention";

        }


        return "Normal";

    }


    /* =====================================================
       ERROR
    ===================================================== */

    function showError(
        message
    ) {

        const box =
            $("alertsError");


        const messageElement =
            $("alertsErrorMessage");


        if (messageElement) {

            messageElement.textContent =
                message;

        }


        if (box) {

            box.style.display =
                "flex";

        }

    }


    function hideError() {

        const box =
            $("alertsError");


        if (box) {

            box.style.display =
                "none";

        }

    }


    /* =====================================================
       LOAD ALERTS
    ===================================================== */

    async function loadAlerts() {

        hideError();


        try {

            /*
             * Load patients.
             */
            const patients =
                await ArogyaAPI.getPatients();


            if (
                !Array.isArray(
                    patients
                )
            ) {

                throw new Error(
                    "Unable to load patient records."
                );

            }


            /*
             * Load alerts for every patient.
             */
            const alertRequests =
                patients.map(
                    async function (
                        patient
                    ) {

                        try {

                            const alerts =
                                await ArogyaAPI.getPatientAlerts(
                                    patient.id,
                                    {
                                        limit: 100
                                    }
                                );


                            if (
                                !Array.isArray(
                                    alerts
                                )
                            ) {

                                return [];

                            }


                            return alerts.map(
                                function (
                                    alert
                                ) {

                                    return {

                                        ...alert,

                                        patient_name:
                                            patient.full_name ||
                                            patient.name ||
                                            "Unknown Patient",

                                        patient_code:
                                            patient.patient_code ||
                                            "--"

                                    };

                                }
                            );


                        } catch (
                            error
                        ) {

                            console.warn(
                                `Unable to load alerts for patient ${patient.id}:`,
                                error
                            );


                            return [];

                        }

                    }
                );


            const results =
                await Promise.all(
                    alertRequests
                );


            allAlerts =
                results.flat();


            /*
             * Newest alerts first.
             */
            allAlerts.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        new Date(
                            b.created_at || 0
                        ) -
                        new Date(
                            a.created_at || 0
                        )
                    );

                }
            );


            /* =================================================
               NEW SOS DETECTION
            ================================================= */

            const newestSosAlert =
                allAlerts.find(
                    function (
                        alert
                    ) {

                        return (
                            String(
                                alert.alert_type || ""
                            )
                                .trim()
                                .toLowerCase() === "sos"
                            &&
                            !Boolean(
                                alert.acknowledged
                            )
                        );

                    }
                );


            /*
             * Show popup for a new unacknowledged SOS.
             */
            if (
                newestSosAlert
            ) {

                showSosPopup(
                    newestSosAlert
                );

            }


            /*
             * Update summary.
             */
            renderSummary();


            /*
             * Update alert list.
             */
            renderAlerts();


        } catch (
            error
        ) {

            console.error(
                "Alert loading error:",
                error
            );


            allAlerts = [];


            renderSummary();

            renderAlerts();


            showError(
                error.message ||
                "Unable to load alerts."
            );

        }

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function renderSummary() {

        const total =
            allAlerts.length;


        const danger =
            allAlerts.filter(
                function (
                    alert
                ) {

                    return (
                        normalizeSeverity(
                            alert.severity
                        ) === "danger"
                    );

                }
            ).length;


        const warning =
            allAlerts.filter(
                function (
                    alert
                ) {

                    return (
                        normalizeSeverity(
                            alert.severity
                        ) === "warning"
                    );

                }
            ).length;


        const acknowledged =
            allAlerts.filter(
                function (
                    alert
                ) {

                    return Boolean(
                        alert.acknowledged
                    );

                }
            ).length;


        /*
         * SOS count.
         */
        const sos =
            allAlerts.filter(
                isSosAlert
            ).length;


        /*
         * Unacknowledged count.
         */
        const unacknowledged =
            allAlerts.filter(
                function (
                    alert
                ) {

                    return !Boolean(
                        alert.acknowledged
                    );

                }
            ).length;


        setText(
            "totalAlerts",
            total
        );


        setText(
            "sosAlerts",
            sos
        );


        setText(
            "dangerAlerts",
            danger
        );


        setText(
            "warningAlerts",
            warning
        );


        setText(
            "acknowledgedAlerts",
            acknowledged
        );


        /*
         * Sidebar notification badge.
         */
        const sidebarBadge =
            $("sidebarAlertCount");


        if (sidebarBadge) {

            sidebarBadge.textContent =
                String(
                    unacknowledged
                );


            sidebarBadge.style.display =
                unacknowledged > 0
                    ? "inline-flex"
                    : "none";

        }

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function getFilteredAlerts() {

        switch (
            currentFilter
        ) {

            case "sos":

                return allAlerts.filter(
                    isSosAlert
                );


            case "unacknowledged":

                return allAlerts.filter(
                    function (
                        alert
                    ) {

                        return !Boolean(
                            alert.acknowledged
                        );

                    }
                );


            case "danger":

                return allAlerts.filter(
                    function (
                        alert
                    ) {

                        return (
                            normalizeSeverity(
                                alert.severity
                            ) === "danger"
                        );

                    }
                );


            case "warning":

                return allAlerts.filter(
                    function (
                        alert
                    ) {

                        return (
                            normalizeSeverity(
                                alert.severity
                            ) === "warning"
                        );

                    }
                );


            case "acknowledged":

                return allAlerts.filter(
                    function (
                        alert
                    ) {

                        return Boolean(
                            alert.acknowledged
                        );

                    }
                );


            case "all":

            default:

                return allAlerts;

        }

    }


    /* =====================================================
       RENDER ALERTS
    ===================================================== */

    function renderAlerts() {

        const container =
            $("alertsList");


        if (!container) {
            return;
        }


        const alerts =
            getFilteredAlerts();


        setText(
            "visibleAlertCount",
            alerts.length
        );


        if (
            alerts.length === 0
        ) {

            container.innerHTML = `

                <div class="alerts-empty">

                    <strong>
                        No alerts found
                    </strong>

                    <span>
                        There are no alerts matching
                        the selected filter.
                    </span>

                </div>

            `;


            return;

        }


        container.innerHTML =
            alerts
                .map(
                    createAlertCard
                )
                .join("");


        /*
         * Attach acknowledge buttons.
         */
        container
            .querySelectorAll(
                "[data-acknowledge-id]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            const id =
                                Number(
                                    this.dataset
                                        .acknowledgeId
                                );


                            openAcknowledgeModal(
                                id
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       ALERT CARD
    ===================================================== */

    function createAlertCard(
        alert
    ) {

        const severity =
            normalizeSeverity(
                alert.severity
            );


        const severityText =
            severityLabel(
                alert.severity
            );


        const patientName =
            alert.patient_name ||
            "Unknown Patient";


        const patientCode =
            alert.patient_code ||
            "--";


        const title =
            alert.alert_type ||
            "Patient Alert";


        const message =
            alert.message ||
            "No alert message provided.";


        const acknowledged =
            Boolean(
                alert.acknowledged
            );


        const alertId =
            Number(
                alert.id
            );


        const acknowledgeSection =
            acknowledged

                ? `

                    <span
                        class="alert-acknowledged-label"
                    >
                        ✓ Acknowledged
                    </span>

                `

                : `

                    <button
                        type="button"
                        class="alert-acknowledge-btn"
                        data-acknowledge-id="${alertId}"
                    >
                        Acknowledge
                    </button>

                `;


        return `

            <article
                class="alert-card ${severity}"
            >

                <div
                    class="alert-card-indicator"
                ></div>


                <div
                    class="alert-card-main"
                >

                    <div
                        class="alert-card-header"
                    >

                        <span
                            class="alert-card-title"
                        >
                            ${escapeHTML(title)}
                        </span>


                        <span
                            class="alert-severity ${severity}"
                        >
                            ${escapeHTML(
                                severityText
                            )}
                        </span>

                    </div>


                    <p
                        class="alert-card-message"
                    >
                        ${escapeHTML(message)}
                    </p>


                    <div
                        class="alert-card-patient"
                    >

                        <div
                            class="alert-patient-avatar"
                        >
                            ${escapeHTML(
                                getInitials(
                                    patientName
                                )
                            )}
                        </div>


                        <div
                            class="alert-patient-info"
                        >

                            <strong>
                                ${escapeHTML(
                                    patientName
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    patientCode
                                )}
                            </span>

                        </div>

                    </div>

                </div>


                <div
                    class="alert-card-side"
                >

                    <span
                        class="alert-card-time"
                        title="${escapeHTML(
                            formatDateTime(
                                alert.created_at
                            )
                        )}"
                    >
                        ${escapeHTML(
                            formatRelativeTime(
                                alert.created_at
                            )
                        )}
                    </span>


                    ${acknowledgeSection}

                </div>

            </article>

        `;

    }


    /* =====================================================
       FILTER BUTTONS
    ===================================================== */

    function setupFilters() {

        document
            .querySelectorAll(
                ".alert-filter"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            document
                                .querySelectorAll(
                                    ".alert-filter"
                                )
                                .forEach(
                                    function (
                                        item
                                    ) {

                                        item.classList.remove(
                                            "active"
                                        );

                                    }
                                );


                            this.classList.add(
                                "active"
                            );


                            currentFilter =
                                this.dataset.filter ||
                                "all";


                            renderAlerts();

                        }
                    );

                }
            );

    }


    /* =====================================================
       ACKNOWLEDGE MODAL
    ===================================================== */

    function openAcknowledgeModal(
        alertId
    ) {

        const alert =
            allAlerts.find(
                function (
                    item
                ) {

                    return (
                        Number(item.id) ===
                        Number(alertId)
                    );

                }
            );


        if (!alert) {
            return;
        }


        acknowledgeAlertId =
            Number(alertId);


        const patientName =
            alert.patient_name ||
            "the patient";


        const title =
            alert.alert_type ||
            "Patient alert";


        setText(
            "acknowledgeModalTitle",
            "Acknowledge Alert"
        );


        setText(
            "acknowledgeModalMessage",
            `Confirm that you want to acknowledge "${title}" for ${patientName}.`
        );


        const modal =
            $("acknowledgeModal");


        if (modal) {

            modal.style.display =
                "flex";

        }

    }


    function closeAcknowledgeModal() {

        acknowledgeAlertId =
            null;


        const modal =
            $("acknowledgeModal");


        if (modal) {

            modal.style.display =
                "none";

        }

    }


    /* =====================================================
       ACKNOWLEDGE ALERT
    ===================================================== */

    async function acknowledgeAlert() {

        if (!acknowledgeAlertId) {
            return;
        }


        const button =
            $("confirmAcknowledge");


        if (button) {

            button.disabled =
                true;


            button.textContent =
                "Saving...";

        }


        try {

            let userId =
                null;


            /*
             * Get logged-in user ID.
             */
            if (
                typeof Auth !== "undefined" &&
                typeof Auth.getUserId ===
                    "function"
            ) {

                userId =
                    Auth.getUserId();

            }


            /*
             * Fallback.
             */
            if (!userId) {

                userId =
                    localStorage.getItem(
                        "arogya_user_id"
                    );

            }


            /*
             * Acknowledge database alert.
             */
            await ArogyaAPI.acknowledgeAlert(
                acknowledgeAlertId,
                userId
            );


            closeAcknowledgeModal();


            /*
             * Refresh alert list.
             */
            await loadAlerts();


        } catch (
            error
        ) {

            console.error(
                "Acknowledge alert error:",
                error
            );


            showError(
                error.message ||
                "Unable to acknowledge the alert."
            );


        } finally {

            if (button) {

                button.disabled =
                    false;


                button.textContent =
                    "Acknowledge";

            }

        }

    }


    /* =====================================================
       BUTTONS
    ===================================================== */

    function setupButtons() {

        /*
         * Refresh button.
         */
        const refresh =
            $("refreshAlerts");


        if (refresh) {

            refresh.addEventListener(
                "click",
                async function () {

                    refresh.disabled =
                        true;


                    refresh.textContent =
                        "Refreshing...";


                    try {

                        await loadAlerts();

                    } finally {

                        refresh.disabled =
                            false;


                        refresh.textContent =
                            "↻ Refresh";

                    }

                }
            );

        }


        /*
         * Confirm acknowledge.
         */
        const confirm =
            $("confirmAcknowledge");


        if (confirm) {

            confirm.addEventListener(
                "click",
                acknowledgeAlert
            );

        }


        /*
         * Cancel acknowledge.
         */
        const cancel =
            $("cancelAcknowledge");


        if (cancel) {

            cancel.addEventListener(
                "click",
                closeAcknowledgeModal
            );

        }


        /*
         * Modal backdrop.
         */
        const backdrop =
            $("acknowledgeModalBackdrop");


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeAcknowledgeModal
            );

        }

    }


    /* =====================================================
       AUTO REFRESH
    ===================================================== */

    function startAutoRefresh() {

        stopAutoRefresh();


        refreshTimer =
            window.setInterval(
                async function () {

                    /*
                     * Don't refresh while
                     * acknowledgement modal is open.
                     */
                    const modal =
                        $("acknowledgeModal");


                    if (
                        modal &&
                        modal.style.display !==
                        "none"
                    ) {

                        return;

                    }


                    await loadAlerts();

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
       INITIALIZE
    ===================================================== */

    async function init() {

        /*
         * Authentication check.
         */
        if (
            typeof Auth !== "undefined" &&
            typeof Auth.requireAuthentication ===
                "function"
        ) {

            const authenticated =
                Auth.requireAuthentication();


            if (
                authenticated === false
            ) {

                return;

            }

        }


        /*
         * Setup filters.
         */
        setupFilters();


        /*
         * Setup buttons.
         */
        setupButtons();


        /*
         * Initial alert load.
         */
        await loadAlerts();


        /*
         * Start 5-second monitoring.
         */
        startAutoRefresh();

    }


    /* =====================================================
       CLEANUP
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        stopAutoRefresh
    );


    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ArogyaAlerts = {

        refresh:
            loadAlerts,


        getAlerts:
            function () {

                return allAlerts;

            }

    };


})();