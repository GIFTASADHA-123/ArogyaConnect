/* =========================================================
   AROGYACONNECT
   SHARED NAVIGATION
========================================================= */

(function () {

    "use strict";


    function getRole() {

        return (
            localStorage.getItem(
                "arogya_role"
            ) || ""
        ).toLowerCase();
    }


    function getUsername() {

        return (
            localStorage.getItem(
                "arogya_username"
            ) || "Staff"
        );
    }


    function getInitials(name) {

        if (!name) {
            return "ST";
        }


        const parts =
            String(name)
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
       USER INFORMATION
    ====================================================== */

    function updateUserInformation() {

        const username =
            getUsername();


        const role =
            getRole();


        const roleLabel =
            role === "doctor"
                ? "Doctor"
                : role === "nurse"
                    ? "Nurse"
                    : "Medical Staff";


        const initials =
            getInitials(username);


        document
            .querySelectorAll(
                "#headerUserName, #sidebarUserName, #profileUsername"
            )
            .forEach(
                element => {

                    element.textContent =
                        username;
                }
            );


        document
            .querySelectorAll(
                "#headerUserRole, #sidebarUserRole, #profileRole"
            )
            .forEach(
                element => {

                    element.textContent =
                        roleLabel;
                }
            );


        document
            .querySelectorAll(
                "#headerUserAvatar, #sidebarUserAvatar, #profileAvatar"
            )
            .forEach(
                element => {

                    element.textContent =
                        initials;
                }
            );


        const welcomeName =
            document.getElementById(
                "welcomeName"
            );


        if (welcomeName) {

            welcomeName.textContent =
                username;
        }
    }


    /* =====================================================
       ROLE FILTERING
    ====================================================== */

    function initializeRoleNavigation() {

        const role =
            getRole();


        /*
         * New/common method:
         *
         * data-role="doctor"
         * data-role="nurse"
         */

        document
            .querySelectorAll(
                "[data-role]"
            )
            .forEach(
                element => {

                    const allowed =
                        element
                            .getAttribute(
                                "data-role"
                            )
                            .toLowerCase()
                            .split(",");


                    element.style.display =
                        allowed.includes(role)
                            ? ""
                            : "none";
                }
            );


        /*
         * Existing HTML compatibility:
         *
         * data-nurse-only
         */

        document
            .querySelectorAll(
                "[data-nurse-only]"
            )
            .forEach(
                element => {

                    element.style.display =
                        role === "nurse"
                            ? ""
                            : "none";
                }
            );


        /*
         * Existing HTML compatibility:
         *
         * data-doctor-only
         */

        document
            .querySelectorAll(
                "[data-doctor-only]"
            )
            .forEach(
                element => {

                    element.style.display =
                        role === "doctor"
                            ? ""
                            : "none";
                }
            );
    }


    /* =====================================================
       ACTIVE PAGE
    ====================================================== */

    function initializeActiveNavigation() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        document
            .querySelectorAll(
                ".sidebar-nav-item"
            )
            .forEach(
                link => {

                    const href =
                        link.getAttribute(
                            "href"
                        );


                    if (!href) {
                        return;
                    }


                    const page =
                        href
                            .split("?")[0]
                            .split("#")[0]
                            .split("/")
                            .pop()
                            .toLowerCase();


                    if (
                        page === currentPage
                    ) {

                        link.classList.add(
                            "active"
                        );

                    } else {

                        link.classList.remove(
                            "active"
                        );
                    }
                }
            );
    }


    /* =====================================================
       SIDEBAR
    ====================================================== */

    function openSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (sidebar) {

            sidebar.classList.add(
                "sidebar-open"
            );
        }


        if (overlay) {

            overlay.classList.add(
                "active"
            );
        }
    }


    function closeSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (sidebar) {

            sidebar.classList.remove(
                "sidebar-open"
            );
        }


        if (overlay) {

            overlay.classList.remove(
                "active"
            );
        }
    }


    function initializeMobileMenu() {

        const button =
            document.getElementById(
                "mobileMenuBtn"
            );


        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (button) {

            button.addEventListener(
                "click",
                function () {

                    const sidebar =
                        document.getElementById(
                            "sidebar"
                        );


                    if (
                        sidebar &&
                        sidebar.classList.contains(
                            "sidebar-open"
                        )
                    ) {

                        closeSidebar();

                    } else {

                        openSidebar();
                    }
                }
            );
        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );
        }
    }


    /* =====================================================
       LOGOUT
    ====================================================== */

    function logout() {

        if (
            window.ArogyaAuth &&
            typeof
                window.ArogyaAuth.logoutUser ===
                "function"
        ) {

            window.ArogyaAuth.logoutUser();

            return;
        }


        if (
            window.Auth &&
            typeof
                window.Auth.logoutUser ===
                "function"
        ) {

            window.Auth.logoutUser();

            return;
        }


        localStorage.removeItem(
            "arogya_logged_in"
        );

        localStorage.removeItem(
            "arogya_username"
        );

        localStorage.removeItem(
            "arogya_role"
        );

        localStorage.removeItem(
            "arogya_user_id"
        );

        localStorage.removeItem(
            "arogya_access_token"
        );

        localStorage.removeItem(
            "arogya_user"
        );


        window.location.href =
            "login.html";
    }


    function initializeLogout() {

        document
            .querySelectorAll(
                "#logoutButton, #profileLogoutButton, .sidebar-logout, [data-logout]"
            )
            .forEach(
                button => {

                    if (
                        button.dataset
                            .logoutBound ===
                        "true"
                    ) {
                        return;
                    }


                    button.dataset
                        .logoutBound =
                        "true";


                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();

                            logout();
                        }
                    );
                }
            );
    }


    /* =====================================================
       RESIZE
    ====================================================== */

    function initializeResize() {

        window.addEventListener(
            "resize",
            function () {

                if (
                    window.innerWidth > 900
                ) {

                    closeSidebar();
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
    ====================================================== */

    function init() {

        updateUserInformation();

        initializeRoleNavigation();

        initializeActiveNavigation();

        initializeMobileMenu();

        initializeLogout();

        initializeResize();
    }


    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ArogyaNavigation = {

        openSidebar,

        closeSidebar,

        refresh: function () {

            updateUserInformation();

            initializeRoleNavigation();

            initializeActiveNavigation();
        },

        logout
    };

})();