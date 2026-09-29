/*
===========================================================
ArogyaConnect API Layer
===========================================================

Frontend
    ↓
api.js
    ↓
FastAPI
    ↓
MySQL

All frontend communication with FastAPI should go
through this file.

===========================================================
*/

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const API_BASE_URL =
        "http://127.0.0.1:8000";


    /* =====================================================
       GENERIC REQUEST FUNCTION
    ===================================================== */

    async function request(
        endpoint,
        options = {}
    ) {

        const url =
            `${API_BASE_URL}${endpoint}`;


        const token =
            localStorage.getItem(
                "arogya_access_token"
            );


        const headers = {
            ...(options.headers || {})
        };


        /*
        -----------------------------------------------------
        JSON BODY
        -----------------------------------------------------
        */

        if (
            options.body &&
            typeof options.body !== "string"
        ) {

            headers[
                "Content-Type"
            ] =
                "application/json";

            options = {
                ...options,

                body:
                    JSON.stringify(
                        options.body
                    )
            };
        }


        /*
        -----------------------------------------------------
        AUTHORIZATION
        -----------------------------------------------------
        */

        if (token) {

            headers[
                "Authorization"
            ] =
                `Bearer ${token}`;
        }


        let response;


        try {

            response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers
                    }
                );

        } catch (error) {

            console.error(
                "ArogyaConnect API connection error:",
                error
            );

            throw new Error(
                "Unable to connect to the ArogyaConnect server. " +
                "Make sure FastAPI is running on port 8000."
            );
        }


        /*
        -----------------------------------------------------
        RESPONSE
        -----------------------------------------------------
        */

        let data = null;


        const contentType =
            response.headers.get(
                "content-type"
            );


        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {

            try {

                data =
                    await response.json();

            } catch (error) {

                console.error(
                    "Unable to parse JSON response:",
                    error
                );

                data = null;
            }

        } else {

            try {

                data =
                    await response.text();

            } catch (error) {

                data = null;
            }
        }


        /*
        -----------------------------------------------------
        ERROR HANDLING
        -----------------------------------------------------
        */

        if (!response.ok) {

            const message =
                data?.detail ||
                data?.message ||
                `Request failed with status ${response.status}.`;


            const apiError =
                new Error(
                    message
                );


            apiError.status =
                response.status;


            apiError.data =
                data;


            console.error(
                "ArogyaConnect API Error:",
                apiError
            );


            throw apiError;
        }


        return data;
    }


    /* =====================================================
       HELPER
       ===================================================== */

    function ensureArray(
        data,
        possibleKeys = []
    ) {

        if (
            Array.isArray(data)
        ) {

            return data;
        }


        if (
            data &&
            typeof data === "object"
        ) {

            for (
                const key of possibleKeys
            ) {

                if (
                    Array.isArray(
                        data[key]
                    )
                ) {

                    return data[key];
                }
            }
        }


        return [];
    }


    /* =====================================================
       PATIENT API
       ===================================================== */


    /*
    ---------------------------------------------------------
    GET ALL PATIENTS
    ---------------------------------------------------------
    */

    async function getPatients(
        options = {}
    ) {

        const query =
            new URLSearchParams();


        /*
        Backend supports:

        active_only=true
        active_only=false
        */

        if (
            options.active !==
            undefined
        ) {

            query.set(
                "active_only",
                String(
                    options.active
                )
            );
        }


        if (
            options.limit !==
            undefined
        ) {

            query.set(
                "limit",
                String(
                    options.limit
                )
            );
        }


        const queryString =
            query.toString();


        const endpoint =
            queryString

                ? `/api/patients/?${queryString}`

                : `/api/patients/`;


        const data =
            await request(
                endpoint
            );


        return ensureArray(
            data,
            [
                "patients",
                "data",
                "results"
            ]
        );
    }


    /*
    ---------------------------------------------------------
    GET PATIENT BY ID
    ---------------------------------------------------------
    */

    async function getPatient(
        patientId
    ) {

        return request(
            `/api/patients/${encodeURIComponent(
                patientId
            )}`
        );
    }


    /*
    ---------------------------------------------------------
    GET PATIENT BY CODE
    ---------------------------------------------------------
    */

    async function getPatientByCode(
        patientCode
    ) {

        return request(
            `/api/patients/code/${encodeURIComponent(
                patientCode
            )}`
        );
    }


    /*
    ---------------------------------------------------------
    GET CURRENT ACTIVE PATIENT
    ---------------------------------------------------------
    */

    async function getCurrentActivePatient() {

        return request(
            "/api/patients/current/active"
        );
    }


    /*
    ---------------------------------------------------------
    SEARCH PATIENTS
    ---------------------------------------------------------
    */

    async function searchPatientsByName(
        name
    ) {

        if (
            !name ||
            !String(name).trim()
        ) {

            return [];
        }


        const data =
            await request(
                `/api/patients/search/by-name?q=${encodeURIComponent(
                    String(name).trim()
                )}`
            );


        return ensureArray(
            data,
            [
                "patients",
                "data",
                "results"
            ]
        );
    }


    /* =====================================================
       SENSOR API
       ===================================================== */


    /*
    ---------------------------------------------------------
    GET LATEST SENSOR READING
    ---------------------------------------------------------
    */

    async function getLatestSensorReading(
        patientId
    ) {

        return request(
            `/api/sensors/patient/${encodeURIComponent(
                patientId
            )}/latest`
        );
    }


    /*
    ---------------------------------------------------------
    GET TODAY'S SENSOR READINGS
    ---------------------------------------------------------
    */

    async function getTodaySensorReadings(
        patientId
    ) {

        const data =
            await request(
                `/api/sensors/patient/${encodeURIComponent(
                    patientId
                )}/today`
            );


        if (
            Array.isArray(data)
        ) {

            return {
                patient_id:
                    patientId,

                count:
                    data.length,

                readings:
                    data
            };
        }


        return {

            ...(data || {}),

            readings:
                ensureArray(
                    data,
                    [
                        "readings",
                        "data",
                        "results"
                    ]
                )
        };
    }


    /*
    ---------------------------------------------------------
    GET SENSOR HISTORY
    ---------------------------------------------------------
    */

    async function getSensorHistory(
        patientId,
        startDate = null,
        endDate = null
    ) {

        const query =
            new URLSearchParams();


        if (
            startDate
        ) {

            query.set(
                "start_date",
                startDate
            );
        }


        if (
            endDate
        ) {

            query.set(
                "end_date",
                endDate
            );
        }


        /*
        Important:

        Your predefined data contains
        multiple days of readings.

        We request up to 5000 readings.
        */

        query.set(
            "limit",
            "5000"
        );


        const queryString =
            query.toString();


        const endpoint =
            `/api/sensors/patient/${encodeURIComponent(
                patientId
            )}/history?${queryString}`;


        const data =
            await request(
                endpoint
            );


        if (
            Array.isArray(data)
        ) {

            return {

                patient_id:
                    patientId,

                count:
                    data.length,

                readings:
                    data
            };
        }


        return {

            ...(data || {}),

            readings:
                ensureArray(
                    data,
                    [
                        "readings",
                        "data",
                        "results"
                    ]
                )
        };
    }


    /*
    ---------------------------------------------------------
    GET CURRENT SENSOR STATUS
    ---------------------------------------------------------
    */

    async function getPatientSensorStatus(
        patientId
    ) {

        return request(
            `/api/sensors/patient/${encodeURIComponent(
                patientId
            )}/status`
        );
    }


    /*
    ---------------------------------------------------------
    GET ALL SENSOR READINGS
    ---------------------------------------------------------
    */

    async function getAllSensorReadings(
        options = {}
    ) {

        const query =
            new URLSearchParams();


        if (
            options.patientId !==
            undefined &&
            options.patientId !==
            null
        ) {

            query.set(
                "patient_id",
                String(
                    options.patientId
                )
            );
        }


        if (
            options.limit !==
            undefined
        ) {

            query.set(
                "limit",
                String(
                    options.limit
                )
            );

        } else {

            query.set(
                "limit",
                "5000"
            );
        }


        const queryString =
            query.toString();


        const endpoint =
            `/api/sensors/readings?${queryString}`;


        const data =
            await request(
                endpoint
            );


        if (
            Array.isArray(data)
        ) {

            return {

                count:
                    data.length,

                readings:
                    data
            };
        }


        return {

            ...(data || {}),

            readings:
                ensureArray(
                    data,
                    [
                        "readings",
                        "data",
                        "results"
                    ]
                )
        };
    }


    /*
    ---------------------------------------------------------
    CREATE SENSOR READING
    ---------------------------------------------------------

    This will be used later for real-time
    ESP32 / IoT data.

    DO NOT use this for the predefined
    historical data.
    ---------------------------------------------------------
    */

    async function createSensorReading(
        reading
    ) {

        return request(
            "/api/sensors/readings",
            {
                method: "POST",

                body:
                    reading
            }
        );
    }


    /* =====================================================
       ALERT API
       ===================================================== */


    /*
    ---------------------------------------------------------
    GET PATIENT ALERTS
    ---------------------------------------------------------
    */

    async function getPatientAlerts(
        patientId,
        options = {}
    ) {

        const query =
            new URLSearchParams();


        if (
            options.acknowledged !==
            undefined
        ) {

            query.set(
                "acknowledged",
                String(
                    options.acknowledged
                )
            );
        }


        if (
            options.limit !==
            undefined
        ) {

            query.set(
                "limit",
                String(
                    options.limit
                )
            );

        } else {

            query.set(
                "limit",
                "100"
            );
        }


        const queryString =
            query.toString();


        const endpoint =
            queryString

                ? `/api/alerts/patient/${encodeURIComponent(
                    patientId
                )}?${queryString}`

                : `/api/alerts/patient/${encodeURIComponent(
                    patientId
                )}`;


        const data =
            await request(
                endpoint
            );


        return ensureArray(
            data,
            [
                "alerts",
                "data",
                "results"
            ]
        );
    }


    /*
    ---------------------------------------------------------
    GET ACTIVE ALERTS
    ---------------------------------------------------------
    */

    async function getActiveAlerts(
        patientId,
        limit = 100
    ) {

        const data =
            await request(
                `/api/alerts/patient/${encodeURIComponent(
                    patientId
                )}/active?limit=${encodeURIComponent(
                    limit
                )}`
            );


        return ensureArray(
            data,
            [
                "alerts",
                "data",
                "results"
            ]
        );
    }


    /*
    ---------------------------------------------------------
    GET SINGLE ALERT
    ---------------------------------------------------------
    */

    async function getAlert(
        alertId
    ) {

        return request(
            `/api/alerts/${encodeURIComponent(
                alertId
            )}`
        );
    }


    /*
    ---------------------------------------------------------
    ACKNOWLEDGE ALERT
    ---------------------------------------------------------
    */

    async function acknowledgeAlert(
        alertId,
        userId = null
    ) {

        let endpoint =
            `/api/alerts/${encodeURIComponent(
                alertId
            )}/acknowledge`;


        if (
            userId !==
            null &&
            userId !==
            undefined
        ) {

            endpoint +=
                `?user_id=${encodeURIComponent(
                    userId
                )}`;
        }


        return request(
            endpoint,
            {
                method:
                    "PATCH"
            }
        );
    }


    /*
    ---------------------------------------------------------
    CREATE ALERT
    ---------------------------------------------------------

    Normally alerts for the predefined data
    already exist in MySQL.

    This function is kept for future
    real-time alert generation.
    ---------------------------------------------------------
    */

    async function createAlert(
        alert
    ) {

        return request(
            "/api/alerts/",
            {
                method:
                    "POST",

                body:
                    alert
            }
        );
    }


    /* =====================================================
       PATIENT EVENT API
       ===================================================== */


    /*
    ---------------------------------------------------------
    GET PATIENT EVENTS
    ---------------------------------------------------------
    */

    async function getPatientEvents(
        patientId,
        options = {}
    ) {

        const query =
            new URLSearchParams();


        if (
            options.limit !==
            undefined
        ) {

            query.set(
                "limit",
                String(
                    options.limit
                )
            );

        } else {

            query.set(
                "limit",
                "100"
            );
        }


        if (
            options.eventType
        ) {

            query.set(
                "event_type",
                options.eventType
            );
        }


        const queryString =
            query.toString();


        const endpoint =
            `/api/events/patient/${encodeURIComponent(
                patientId
            )}?${queryString}`;


        const data =
            await request(
                endpoint
            );


        return ensureArray(
            data,
            [
                "events",
                "data",
                "results"
            ]
        );
    }


    /*
    ---------------------------------------------------------
    GET SINGLE EVENT
    ---------------------------------------------------------
    */

    async function getEvent(
        eventId
    ) {

        return request(
            `/api/events/${encodeURIComponent(
                eventId
            )}`
        );
    }


    /*
    ---------------------------------------------------------
    CREATE PATIENT EVENT
    ---------------------------------------------------------
    */

    async function createPatientEvent(
        event
    ) {

        return request(
            "/api/events/",
            {
                method:
                    "POST",

                body:
                    event
            }
        );
    }


    /* =====================================================
       AUTH API
       ===================================================== */


    /*
    ---------------------------------------------------------
    LOGIN
    ---------------------------------------------------------
    */

    async function login(
        username,
        password,
        role
    ) {

        return request(
            "/api/auth/login",
            {
                method:
                    "POST",

                body: {

                    username:
                        username,

                    password:
                        password,

                    role:
                        role
                }
            }
        );
    }


    /*
    ---------------------------------------------------------
    REGISTER
    ---------------------------------------------------------
    */

    async function register(
        username,
        password,
        role
    ) {

        return request(
            "/api/auth/register",
            {
                method:
                    "POST",

                body: {

                    username:
                        username,

                    password:
                        password,

                    role:
                        role
                }
            }
        );
    }


    /* =====================================================
       HEALTH CHECK
       ===================================================== */

    async function healthCheck() {

        return request(
            "/health"
        );
    }


    /* =====================================================
       API OBJECT
       ===================================================== */

    window.ArogyaAPI = {

        /*
        Base
        */

        API_BASE_URL,

        request,

        healthCheck,


        /*
        Authentication
        */

        login,

        register,


        /*
        Patients
        */

        getPatients,

        getPatient,

        getPatientByCode,

        getCurrentActivePatient,

        searchPatientsByName,


        /*
        Sensors
        */

        getLatestSensorReading,

        getTodaySensorReadings,

        getSensorHistory,

        getPatientSensorStatus,

        getAllSensorReadings,

        createSensorReading,


        /*
        Alerts
        */

        getPatientAlerts,

        getActiveAlerts,

        getAlert,

        acknowledgeAlert,

        createAlert,


        /*
        Patient Events
        */

        getPatientEvents,

        getEvent,

        createPatientEvent

    };


    /*
    =========================================================
    API READY
    =========================================================
    */

    console.log(
        "ArogyaConnect API loaded:",
        API_BASE_URL
    );

})();