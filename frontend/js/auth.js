/*
===========================================================
ArogyaConnect Authentication
===========================================================

This file handles:

    • Login
    • Registration
    • Role selection
    • Session storage
    • Authentication checks
    • Role-based navigation
    • Logout
    • Password visibility

API communication is handled through:

    frontend/js/api.js

Therefore this file does NOT define another API URL.

===========================================================
*/


(function () {

    "use strict";


    /* =====================================================
       STORAGE KEYS
    ===================================================== */

    const STORAGE_KEYS = {

        loggedIn:
            "arogya_logged_in",

        username:
            "arogya_username",

        role:
            "arogya_role",

        userId:
            "arogya_user_id",

        accessToken:
            "arogya_access_token",

        user:
            "arogya_user"
    };


    /* =====================================================
       ROLE DASHBOARDS
    ===================================================== */

    const ROLE_DASHBOARDS = {

        nurse:
            "nurse-dashboard.html",

        doctor:
            "doctor-dashboard.html"
    };


    /* =====================================================
       GET ELEMENT
    ===================================================== */

    function getElement(id) {

        return document.getElementById(id);
    }


    /* =====================================================
       GET CURRENT ROLE
    ===================================================== */

    function getRole() {

        return (
            localStorage.getItem(
                STORAGE_KEYS.role
            ) || ""
        ).toLowerCase();
    }


    /* =====================================================
       GET CURRENT USERNAME
    ===================================================== */

    function getUsername() {

        return (
            localStorage.getItem(
                STORAGE_KEYS.username
            ) || ""
        );
    }


    /* =====================================================
       GET CURRENT USER ID
    ===================================================== */

    function getUserId() {

        const value =
            localStorage.getItem(
                STORAGE_KEYS.userId
            );


        if (!value) {

            return null;
        }


        const number =
            Number(value);


        return Number.isNaN(number)
            ? null
            : number;
    }


    /* =====================================================
       GET ACCESS TOKEN
    ===================================================== */

    function getToken() {

        return (
            localStorage.getItem(
                STORAGE_KEYS.accessToken
            ) || ""
        );
    }


    /* =====================================================
       GET STORED USER
    ===================================================== */

    function getStoredUser() {

        const value =
            localStorage.getItem(
                STORAGE_KEYS.user
            );


        if (!value) {

            return null;
        }


        try {

            return JSON.parse(
                value
            );

        } catch (error) {

            console.warn(
                "Unable to read stored user.",
                error
            );

            return null;
        }
    }


    /* =====================================================
       CHECK LOGIN STATE
    ===================================================== */

    function isLoggedIn() {

        return (
            localStorage.getItem(
                STORAGE_KEYS.loggedIn
            ) === "true"
        );
    }


    /* =====================================================
       STORE LOGIN SESSION
    ===================================================== */

    function storeSession(
        data,
        fallbackUsername,
        fallbackRole
    ) {

        const username =
            data?.username ||
            fallbackUsername ||
            "";


        const role =
            (
                data?.role ||
                fallbackRole ||
                ""
            ).toLowerCase();


        const userId =
            data?.user_id ??
            data?.id ??
            "";


        const token =
            data?.access_token ||
            data?.token ||
            "";


        const userObject =
            data?.user ||
            {
                id: userId,
                username,
                role
            };


        localStorage.setItem(
            STORAGE_KEYS.loggedIn,
            "true"
        );


        localStorage.setItem(
            STORAGE_KEYS.username,
            username
        );


        localStorage.setItem(
            STORAGE_KEYS.role,
            role
        );


        if (
            userId !== null &&
            userId !== undefined &&
            userId !== ""
        ) {

            localStorage.setItem(
                STORAGE_KEYS.userId,
                String(userId)
            );

        } else {

            localStorage.removeItem(
                STORAGE_KEYS.userId
            );
        }


        if (token) {

            localStorage.setItem(
                STORAGE_KEYS.accessToken,
                token
            );

        } else {

            localStorage.removeItem(
                STORAGE_KEYS.accessToken
            );
        }


        localStorage.setItem(
            STORAGE_KEYS.user,
            JSON.stringify(
                userObject
            )
        );
    }


    /* =====================================================
       CLEAR SESSION
    ===================================================== */

    function clearSession() {

        Object.values(
            STORAGE_KEYS
        ).forEach(
            (key) => {

                localStorage.removeItem(
                    key
                );
            }
        );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function logoutUser(
        redirect = true
    ) {

        clearSession();


        if (redirect) {

            window.location.href =
                "login.html";
        }
    }


    /* =====================================================
       REDIRECT BY ROLE
    ===================================================== */

    function redirectByRole(
        role = getRole()
    ) {

        role =
            String(
                role || ""
            ).toLowerCase();


        const dashboard =
            ROLE_DASHBOARDS[role];


        if (!dashboard) {

            window.location.href =
                "login.html";

            return;
        }


        window.location.href =
            dashboard;
    }


    /* =====================================================
       AUTHENTICATION GUARD
    ===================================================== */

    function requireAuthentication(
        allowedRoles = []
    ) {

        if (!isLoggedIn()) {

            window.location.href =
                "login.html";

            return false;
        }


        const role =
            getRole();


        if (
            Array.isArray(
                allowedRoles
            ) &&
            allowedRoles.length > 0
        ) {

            const normalizedRoles =
                allowedRoles.map(
                    item =>
                        String(
                            item
                        ).toLowerCase()
                );


            if (
                !normalizedRoles.includes(
                    role
                )
            ) {

                redirectByRole();

                return false;
            }
        }


        return true;
    }


    /* =====================================================
       LOGIN PAGE
    ===================================================== */

    function initializeLoginPage() {

        const loginForm =
            getElement(
                "loginForm"
            );


        if (!loginForm) {

            return;
        }


        const usernameInput =
            getElement(
                "username"
            );


        const passwordInput =
            getElement(
                "password"
            );


        const roleInput =
            getElement(
                "role"
            );


        const loginButton =
            getElement(
                "loginButton"
            );


        const loginButtonText =
            getElement(
                "loginButtonText"
            );


        const loginError =
            getElement(
                "loginError"
            );


        const nurseRole =
            getElement(
                "nurseRole"
            );


        const doctorRole =
            getElement(
                "doctorRole"
            );


        const passwordToggle =
            getElement(
                "passwordToggle"
            );


        let selectedRole =
            roleInput?.value ||
            "nurse";


        /* -------------------------------------------------
           ROLE SELECTION
        ------------------------------------------------- */

        function selectRole(
            role
        ) {

            role =
                String(
                    role
                ).toLowerCase();


            if (
                role !== "nurse" &&
                role !== "doctor"
            ) {

                role = "nurse";
            }


            selectedRole =
                role;


            if (roleInput) {

                roleInput.value =
                    role;
            }


            if (nurseRole) {

                nurseRole.classList.toggle(
                    "active",
                    role === "nurse"
                );

                nurseRole.setAttribute(
                    "aria-selected",
                    String(
                        role === "nurse"
                    )
                );
            }


            if (doctorRole) {

                doctorRole.classList.toggle(
                    "active",
                    role === "doctor"
                );

                doctorRole.setAttribute(
                    "aria-selected",
                    String(
                        role === "doctor"
                    )
                );
            }
        }


        if (nurseRole) {

            nurseRole.addEventListener(
                "click",
                () => {

                    selectRole(
                        "nurse"
                    );
                }
            );
        }


        if (doctorRole) {

            doctorRole.addEventListener(
                "click",
                () => {

                    selectRole(
                        "doctor"
                    );
                }
            );
        }


        /* -------------------------------------------------
           PASSWORD VISIBILITY
        ------------------------------------------------- */

        if (
            passwordToggle &&
            passwordInput
        ) {

            passwordToggle.addEventListener(
                "click",
                () => {

                    const isPassword =
                        passwordInput.type ===
                        "password";


                    passwordInput.type =
                        isPassword
                            ? "text"
                            : "password";


                    passwordToggle.setAttribute(
                        "aria-label",
                        isPassword
                            ? "Hide password"
                            : "Show password"
                    );
                }
            );
        }


        /* -------------------------------------------------
           ERROR
        ------------------------------------------------- */

        function showLoginError(
            message
        ) {

            if (!loginError) {

                return;
            }


            loginError.textContent =
                message;


            loginError.classList.add(
                "show"
            );
        }


        function clearLoginError() {

            if (!loginError) {

                return;
            }


            loginError.textContent =
                "";


            loginError.classList.remove(
                "show"
            );
        }


        /* -------------------------------------------------
           SUBMIT LOGIN
        ------------------------------------------------- */

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                clearLoginError();


                const username =
                    usernameInput
                        ? usernameInput.value.trim()
                        : "";


                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";


                const role =
                    roleInput?.value ||
                    selectedRole ||
                    "nurse";


                /* -----------------------------------------
                   VALIDATION
                ----------------------------------------- */

                if (!username) {

                    showLoginError(
                        "Please enter your username."
                    );

                    if (usernameInput) {

                        usernameInput.focus();
                    }

                    return;
                }


                if (!password) {

                    showLoginError(
                        "Please enter your password."
                    );

                    if (passwordInput) {

                        passwordInput.focus();
                    }

                    return;
                }


                /* -----------------------------------------
                   LOADING
                ----------------------------------------- */

                if (loginButton) {

                    loginButton.disabled =
                        true;
                }


                if (loginButtonText) {

                    loginButtonText.textContent =
                        "Signing in...";
                }


                try {

                    /*
                    -----------------------------------------
                    CENTRAL API
                    -----------------------------------------
                    */

                    const data =
                        await ArogyaAPI.login(
                            username,
                            password,
                            role
                        );


                    /*
                    -----------------------------------------
                    CHECK RESPONSE
                    -----------------------------------------
                    */

                    if (
                        data &&
                        data.success === false
                    ) {

                        throw new Error(
                            data.message ||
                            "Login failed."
                        );
                    }


                    /*
                    -----------------------------------------
                    VERIFY ROLE
                    -----------------------------------------
                    */

                    const returnedRole =
                        (
                            data?.role ||
                            role ||
                            ""
                        ).toLowerCase();


                    if (
                        returnedRole !==
                            "nurse" &&
                        returnedRole !==
                            "doctor"
                    ) {

                        throw new Error(
                            "The server returned an invalid user role."
                        );
                    }


                    /*
                    -----------------------------------------
                    STORE SESSION
                    -----------------------------------------
                    */

                    storeSession(
                        data,
                        username,
                        returnedRole
                    );


                    /*
                    -----------------------------------------
                    SUCCESS
                    -----------------------------------------
                    */

                    if (loginButtonText) {

                        loginButtonText.textContent =
                            "Signed in";
                    }


                    /*
                    -----------------------------------------
                    REDIRECT
                    -----------------------------------------
                    */

                    setTimeout(
                        () => {

                            redirectByRole(
                                returnedRole
                            );

                        },
                        250
                    );


                } catch (error) {

                    console.error(
                        "Login error:",
                        error
                    );


                    showLoginError(
                        error.message ||
                        "Unable to sign in. Please try again."
                    );


                    if (loginButton) {

                        loginButton.disabled =
                            false;
                    }


                    if (loginButtonText) {

                        loginButtonText.textContent =
                            "Sign in";
                    }
                }
            }
        );


        /*
        -----------------------------------------------------
        INITIAL ROLE
        -----------------------------------------------------
        */

        selectRole(
            selectedRole
        );
    }


    /* =====================================================
       REGISTER PAGE
    ===================================================== */

    function initializeRegisterPage() {

        const registerForm =
            getElement(
                "registerForm"
            );


        if (!registerForm) {

            return;
        }


        const usernameInput =
            getElement(
                "username"
            );


        const passwordInput =
            getElement(
                "password"
            );


        const confirmPasswordInput =
            getElement(
                "confirmPassword"
            );


        const roleInput =
            getElement(
                "role"
            );


        const nurseRole =
            getElement(
                "nurseRole"
            );


        const doctorRole =
            getElement(
                "doctorRole"
            );


        const registerButton =
            getElement(
                "registerButton"
            );


        const registerButtonText =
            getElement(
                "registerButtonText"
            );


        const registerError =
            getElement(
                "registerError"
            );


        const passwordToggle =
            getElement(
                "passwordToggle"
            );


        const confirmPasswordToggle =
            getElement(
                "confirmPasswordToggle"
            );


        const usernameError =
            getElement(
                "usernameError"
            );


        const passwordError =
            getElement(
                "passwordError"
            );


        const confirmPasswordError =
            getElement(
                "confirmPasswordError"
            );


        let selectedRole =
            roleInput?.value ||
            "nurse";


        /* -------------------------------------------------
           ROLE SELECTION
        ------------------------------------------------- */

        function selectRole(
            role
        ) {

            role =
                String(
                    role
                ).toLowerCase();


            if (
                role !== "nurse" &&
                role !== "doctor"
            ) {

                role = "nurse";
            }


            selectedRole =
                role;


            if (roleInput) {

                roleInput.value =
                    role;
            }


            if (nurseRole) {

                nurseRole.classList.toggle(
                    "active",
                    role === "nurse"
                );

                nurseRole.setAttribute(
                    "aria-selected",
                    String(
                        role === "nurse"
                    )
                );
            }


            if (doctorRole) {

                doctorRole.classList.toggle(
                    "active",
                    role === "doctor"
                );

                doctorRole.setAttribute(
                    "aria-selected",
                    String(
                        role === "doctor"
                    )
                );
            }
        }


        if (nurseRole) {

            nurseRole.addEventListener(
                "click",
                () => {

                    selectRole(
                        "nurse"
                    );
                }
            );
        }


        if (doctorRole) {

            doctorRole.addEventListener(
                "click",
                () => {

                    selectRole(
                        "doctor"
                    );
                }
            );
        }


        /* -------------------------------------------------
           PASSWORD TOGGLE HELPER
        ------------------------------------------------- */

        function setupPasswordToggle(
            toggle,
            input
        ) {

            if (
                !toggle ||
                !input
            ) {

                return;
            }


            toggle.addEventListener(
                "click",
                () => {

                    const isPassword =
                        input.type ===
                        "password";


                    input.type =
                        isPassword
                            ? "text"
                            : "password";


                    toggle.setAttribute(
                        "aria-label",
                        isPassword
                            ? "Hide password"
                            : "Show password"
                    );
                }
            );
        }


        setupPasswordToggle(
            passwordToggle,
            passwordInput
        );


        setupPasswordToggle(
            confirmPasswordToggle,
            confirmPasswordInput
        );


        /* -------------------------------------------------
           ERROR HELPERS
        ------------------------------------------------- */

        function clearRegisterErrors() {

            if (registerError) {

                registerError.textContent =
                    "";

                registerError.classList.remove(
                    "show"
                );
            }


            [
                usernameError,
                passwordError,
                confirmPasswordError
            ].forEach(
                element => {

                    if (element) {

                        element.textContent =
                            "";
                    }
                }
            );


            document
                .querySelectorAll(
                    ".form-group.has-error"
                )
                .forEach(
                    group => {

                        group.classList.remove(
                            "has-error"
                        );
                    }
                );
        }


        function showRegisterError(
            message
        ) {

            if (!registerError) {

                return;
            }


            registerError.textContent =
                message;


            registerError.classList.add(
                "show"
            );
        }


        /* -------------------------------------------------
           FORM VALIDATION
        ------------------------------------------------- */

        function validateRegistration(
            username,
            password,
            confirmPassword
        ) {

            if (!username) {

                if (usernameError) {

                    usernameError.textContent =
                        "Please enter your username.";
                }

                return false;
            }


            if (
                username.length <
                3
            ) {

                if (usernameError) {

                    usernameError.textContent =
                        "Username must contain at least 3 characters.";
                }

                return false;
            }


            if (!password) {

                if (passwordError) {

                    passwordError.textContent =
                        "Please enter your password.";
                }

                return false;
            }


            if (
                password.length <
                6
            ) {

                if (passwordError) {

                    passwordError.textContent =
                        "Password must contain at least 6 characters.";
                }

                return false;
            }


            if (!confirmPassword) {

                if (confirmPasswordError) {

                    confirmPasswordError.textContent =
                        "Please confirm your password.";
                }

                return false;
            }


            if (
                password !==
                confirmPassword
            ) {

                if (confirmPasswordError) {

                    confirmPasswordError.textContent =
                        "Passwords do not match.";
                }

                return false;
            }


            return true;
        }


        /* -------------------------------------------------
           SUBMIT REGISTRATION
        ------------------------------------------------- */

        registerForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                clearRegisterErrors();


                const username =
                    usernameInput
                        ? usernameInput.value.trim()
                        : "";


                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";


                const confirmPassword =
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : "";


                const role =
                    roleInput?.value ||
                    selectedRole ||
                    "nurse";


                /*
                ---------------------------------------------
                VALIDATION
                ---------------------------------------------
                */

                const valid =
                    validateRegistration(
                        username,
                        password,
                        confirmPassword
                    );


                if (!valid) {

                    return;
                }


                /*
                ---------------------------------------------
                BUTTON LOADING
                ---------------------------------------------
                */

                if (registerButton) {

                    registerButton.disabled =
                        true;
                }


                if (registerButtonText) {

                    registerButtonText.textContent =
                        "Creating...";
                }


                try {

                    /*
                    -----------------------------------------
                    CENTRAL API
                    -----------------------------------------
                    */

                    const data =
                        await ArogyaAPI.register(
                            username,
                            password,
                            role
                        );


                    /*
                    -----------------------------------------
                    CHECK RESPONSE
                    -----------------------------------------
                    */

                    if (
                        data &&
                        data.success === false
                    ) {

                        throw new Error(
                            data.message ||
                            "Registration failed."
                        );
                    }


                    /*
                    -----------------------------------------
                    SUCCESS
                    -----------------------------------------
                    */

                    if (registerButtonText) {

                        registerButtonText.textContent =
                            "Registered";
                    }


                    /*
                    -----------------------------------------
                    REDIRECT TO LOGIN
                    -----------------------------------------
                    */

                    setTimeout(
                        () => {

                            window.location.href =
                                "login.html";

                        },
                        700
                    );


                } catch (error) {

                    console.error(
                        "Registration error:",
                        error
                    );


                    showRegisterError(
                        error.message ||
                        "Unable to register. Please try again."
                    );


                    if (registerButton) {

                        registerButton.disabled =
                            false;
                    }


                    if (registerButtonText) {

                        registerButtonText.textContent =
                            "Register";
                    }
                }
            }
        );


        /*
        -----------------------------------------------------
        INITIAL ROLE
        -----------------------------------------------------
        */

        selectRole(
            selectedRole
        );
    }


    /* =====================================================
       AUTO LOGOUT BUTTONS
    ===================================================== */

    function initializeLogoutButtons() {

        const logoutButtons =
            document.querySelectorAll(
                "[data-logout]"
            );


        logoutButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        logoutUser(
                            true
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       PAGE INITIALIZATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initializeLoginPage();

            initializeRegisterPage();

            initializeLogoutButtons();
        }
    );


    /* =====================================================
       PUBLIC AUTH OBJECT
    ===================================================== */

    window.ArogyaAuth = {

        isLoggedIn,

        requireAuthentication,

        logoutUser,

        redirectByRole,

        getRole,

        getUsername,

        getUserId,

        getToken,

        getStoredUser,

        storeSession,

        clearSession
    };


})();