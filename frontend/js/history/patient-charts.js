/*
 * ============================================================
 * ArogyaConnect
 * Patient History Charts
 * ============================================================
 *
 * This file renders:
 *
 * 1. Temperature Trend
 * 2. Movement / Gyroscope Trend
 * 3. Fluid Level Trend
 *
 * It receives readings from:
 *
 * window.ArogyaPatientCharts.render(readings)
 *
 * No database changes.
 * No fake sensor data.
 * No external chart library required.
 * ============================================================
 */

(function () {

    "use strict";


    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const CHART_HEIGHT = 330;

    const GRID_COLOR = "#e5e7eb";
    const TEXT_COLOR = "#64748b";
    const AXIS_COLOR = "#94a3b8";
    const BACKGROUND_COLOR = "#ffffff";

    const TEMPERATURE_COLOR = "#0f766e";
    const GYRO_X_COLOR = "#2563eb";
    const GYRO_Y_COLOR = "#7c3aed";
    const GYRO_Z_COLOR = "#ea580c";
    const URINE_COLOR = "#0891b2";
    const IV_COLOR = "#16a34a";


    /* =========================================================
       BASIC HELPERS
    ========================================================= */

    function getElement(id) {

        return document.getElementById(id);

    }


    function isValidNumber(value) {

        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value))
        );

    }


    function toNumber(value) {

        if (!isValidNumber(value)) {

            return null;

        }

        return Number(value);

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =========================================================
       DATE / TIME
    ========================================================= */

    function formatTime(value) {

        if (!value) {

            return "";

        }

        const date = new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function formatDateTime(value) {

        if (!value) {

            return "";

        }

        const date = new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }

        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =========================================================
       CANVAS SETUP
    ========================================================= */

    function createCanvas(container) {

        if (!container) {

            return null;

        }


        container.innerHTML = "";


        const canvas =
            document.createElement("canvas");


        canvas.style.width = "100%";
        canvas.style.height =
            CHART_HEIGHT + "px";

        canvas.style.display = "block";


        container.appendChild(canvas);


        return canvas;

    }


    function resizeCanvas(canvas) {

        if (!canvas) {

            return null;

        }


        const rect =
            canvas.getBoundingClientRect();


        const width =
            Math.max(
                300,
                Math.floor(rect.width)
            );


        const height =
            CHART_HEIGHT;


        const ratio =
            window.devicePixelRatio || 1;


        canvas.width =
            Math.floor(
                width * ratio
            );


        canvas.height =
            Math.floor(
                height * ratio
            );


        const context =
            canvas.getContext("2d");


        context.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );


        return {
            context: context,
            width: width,
            height: height
        };

    }


    /* =========================================================
       EMPTY STATE
    ========================================================= */

    function renderEmptyChart(
        containerId,
        title,
        message
    ) {

        const container =
            getElement(containerId);


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div
                style="
                    height:${CHART_HEIGHT}px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    padding:20px;
                    box-sizing:border-box;
                "
            >

                <div>

                    <strong
                        style="
                            display:block;
                            color:#0f172a;
                            font-size:15px;
                            margin-bottom:6px;
                        "
                    >
                        ${escapeHtml(title)}
                    </strong>

                    <span
                        style="
                            color:#64748b;
                            font-size:13px;
                        "
                    >
                        ${escapeHtml(message)}
                    </span>

                </div>

            </div>

        `;

    }


    /* =========================================================
       LEGEND
    ========================================================= */

    function createLegend(
        container,
        series
    ) {

        const legend =
            document.createElement("div");


        legend.style.display = "flex";
        legend.style.flexWrap = "wrap";
        legend.style.gap = "16px";
        legend.style.padding = "0 18px 14px 18px";
        legend.style.fontSize = "12px";
        legend.style.color = TEXT_COLOR;


        series.forEach(function (item) {

            const itemElement =
                document.createElement("div");


            itemElement.style.display =
                "flex";

            itemElement.style.alignItems =
                "center";

            itemElement.style.gap =
                "6px";


            const dot =
                document.createElement("span");


            dot.style.width = "9px";
            dot.style.height = "9px";
            dot.style.borderRadius = "50%";
            dot.style.background =
                item.color;

            dot.style.display =
                "inline-block";


            const label =
                document.createElement("span");


            label.textContent =
                item.label;


            itemElement.appendChild(dot);
            itemElement.appendChild(label);

            legend.appendChild(itemElement);

        });


        container.appendChild(legend);

    }


    /* =========================================================
       GENERIC LINE CHART
    ========================================================= */

    function drawLineChart(
        containerId,
        readings,
        configuration
    ) {

        const container =
            getElement(containerId);


        if (!container) {

            return;

        }


        if (
            !Array.isArray(readings) ||
            readings.length === 0
        ) {

            renderEmptyChart(
                containerId,
                "No chart data",
                "No sensor readings are available for the selected period."
            );

            return;

        }


        const usableReadings =
            readings.filter(function (reading) {

                return reading &&
                    reading.recorded_at;

            });


        if (
            usableReadings.length === 0
        ) {

            renderEmptyChart(
                containerId,
                "No chart data",
                "No valid sensor timestamps were found."
            );

            return;

        }


        container.innerHTML = "";


        const title =
            document.createElement("div");


        title.style.padding =
            "12px 18px 0 18px";

        title.style.fontSize =
            "12px";

        title.style.color =
            TEXT_COLOR;


        title.textContent =
            `${usableReadings.length} reading${
                usableReadings.length === 1
                    ? ""
                    : "s"
            }`;


        container.appendChild(title);


        const legend =
            configuration.series.filter(
                function (series) {

                    return usableReadings.some(
                        function (reading) {

                            return isValidNumber(
                                reading[
                                    series.key
                                ]
                            );

                        }
                    );

                }
            );


        if (legend.length) {

            createLegend(
                container,
                legend
            );

        }


        const canvas =
            createCanvas(container);


        const dimensions =
            resizeCanvas(canvas);


        if (!dimensions) {

            return;

        }


        const ctx =
            dimensions.context;


        const width =
            dimensions.width;


        const height =
            dimensions.height;


        /* -----------------------------------------------------
           CHART PADDING
        ----------------------------------------------------- */

        const padding = {

            top: 20,

            right: 24,

            bottom: 50,

            left: 56

        };


        const chartWidth =
            width -
            padding.left -
            padding.right;


        const chartHeight =
            height -
            padding.top -
            padding.bottom;


        /* -----------------------------------------------------
           BUILD DATA
        ----------------------------------------------------- */

        const points =
            usableReadings.map(
                function (reading, index) {

                    const time =
                        new Date(
                            reading.recorded_at
                        );


                    return {

                        reading: reading,

                        index: index,

                        time: time.getTime()

                    };

                }
            ).filter(function (item) {

                return Number.isFinite(
                    item.time
                );

            });


        if (!points.length) {

            renderEmptyChart(
                containerId,
                "No chart data",
                "The selected readings do not contain valid timestamps."
            );

            return;

        }


        /* -----------------------------------------------------
           COLLECT VALUES
        ----------------------------------------------------- */

        let allValues = [];


        configuration.series.forEach(
            function (series) {

                points.forEach(
                    function (point) {

                        const value =
                            toNumber(
                                point.reading[
                                    series.key
                                ]
                            );


                        if (
                            value !== null
                        ) {

                            allValues.push(
                                value
                            );

                        }

                    }
                );

            }
        );


        if (!allValues.length) {

            renderEmptyChart(
                containerId,
                "No sensor values",
                "No numeric values are available for this chart."
            );

            return;

        }


        /* -----------------------------------------------------
           MIN / MAX
        ----------------------------------------------------- */

        let minValue =
            Math.min(
                ...allValues
            );


        let maxValue =
            Math.max(
                ...allValues
            );


        if (
            minValue === maxValue
        ) {

            const paddingValue =
                Math.max(
                    Math.abs(minValue) * 0.05,
                    1
                );


            minValue -=
                paddingValue;

            maxValue +=
                paddingValue;

        }


        const valueRange =
            maxValue -
            minValue;


        minValue -=
            valueRange * 0.08;


        maxValue +=
            valueRange * 0.08;


        /* -----------------------------------------------------
           BACKGROUND
        ----------------------------------------------------- */

        ctx.fillStyle =
            BACKGROUND_COLOR;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /* -----------------------------------------------------
           GRID
        ----------------------------------------------------- */

        const gridCount = 5;


        ctx.font =
            "12px Arial";


        ctx.textAlign =
            "right";


        ctx.textBaseline =
            "middle";


        for (
            let i = 0;
            i <= gridCount;
            i++
        ) {

            const ratio =
                i / gridCount;


            const y =
                padding.top +
                chartHeight * ratio;


            ctx.beginPath();

            ctx.moveTo(
                padding.left,
                y
            );

            ctx.lineTo(
                width -
                padding.right,
                y
            );


            ctx.strokeStyle =
                GRID_COLOR;

            ctx.lineWidth = 1;

            ctx.stroke();


            const value =
                maxValue -
                (
                    maxValue -
                    minValue
                ) * ratio;


            ctx.fillStyle =
                TEXT_COLOR;


            ctx.fillText(
                formatAxisValue(value),
                padding.left - 10,
                y
            );

        }


        /* -----------------------------------------------------
           AXIS
        ----------------------------------------------------- */

        ctx.beginPath();

        ctx.moveTo(
            padding.left,
            padding.top
        );

        ctx.lineTo(
            padding.left,
            padding.top +
            chartHeight
        );

        ctx.lineTo(
            width -
            padding.right,
            padding.top +
            chartHeight
        );


        ctx.strokeStyle =
            AXIS_COLOR;

        ctx.lineWidth = 1;

        ctx.stroke();


        /* -----------------------------------------------------
           X AXIS LABELS
        ----------------------------------------------------- */

        const labelCount =
            Math.min(
                6,
                points.length
            );


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "top";


        for (
            let i = 0;
            i < labelCount;
            i++
        ) {

            const ratio =
                labelCount === 1
                    ? 0
                    : i /
                      (
                        labelCount -
                        1
                      );


            const pointIndex =
                Math.round(
                    ratio *
                    (
                        points.length -
                        1
                    )
                );


            const point =
                points[
                    pointIndex
                ];


            const x =
                padding.left +
                chartWidth *
                ratio;


            const label =
                formatTime(
                    point.reading.recorded_at
                );


            ctx.fillStyle =
                TEXT_COLOR;


            ctx.fillText(
                label,
                x,
                padding.top +
                chartHeight +
                12
            );

        }


        /* -----------------------------------------------------
           DRAW SERIES
        ----------------------------------------------------- */

        configuration.series.forEach(
            function (series) {

                const seriesPoints =
                    [];


                points.forEach(
                    function (point) {

                        const value =
                            toNumber(
                                point.reading[
                                    series.key
                                ]
                            );


                        if (
                            value === null
                        ) {

                            return;

                        }


                        const x =
                            points.length === 1
                                ? padding.left +
                                  chartWidth / 2
                                : padding.left +
                                  (
                                      point.index /
                                      (
                                          points.length -
                                          1
                                      )
                                  ) *
                                  chartWidth;


                        const y =
                            padding.top +
                            (
                                1 -
                                (
                                    (
                                        value -
                                        minValue
                                    ) /
                                    (
                                        maxValue -
                                        minValue
                                    )
                                )
                            ) *
                            chartHeight;


                        seriesPoints.push({

                            x: x,

                            y: y,

                            value: value,

                            reading:
                                point.reading

                        });

                    }
                );


                if (
                    seriesPoints.length === 0
                ) {

                    return;

                }


                /* ---------------------------------------------
                   LINE
                --------------------------------------------- */

                ctx.beginPath();


                seriesPoints.forEach(
                    function (point, index) {

                        if (index === 0) {

                            ctx.moveTo(
                                point.x,
                                point.y
                            );

                        } else {

                            ctx.lineTo(
                                point.x,
                                point.y
                            );

                        }

                    }
                );


                ctx.strokeStyle =
                    series.color;

                ctx.lineWidth = 2.5;

                ctx.lineJoin =
                    "round";

                ctx.lineCap =
                    "round";

                ctx.stroke();


                /* ---------------------------------------------
                   POINTS
                --------------------------------------------- */

                seriesPoints.forEach(
                    function (point) {

                        ctx.beginPath();

                        ctx.arc(
                            point.x,
                            point.y,
                            3,
                            0,
                            Math.PI * 2
                        );


                        ctx.fillStyle =
                            BACKGROUND_COLOR;

                        ctx.fill();


                        ctx.strokeStyle =
                            series.color;

                        ctx.lineWidth =
                            2;

                        ctx.stroke();

                    }
                );

            }
        );


        /* -----------------------------------------------------
           LAST VALUE
        ----------------------------------------------------- */

        configuration.series.forEach(
            function (series) {

                let latest = null;


                for (
                    let i =
                        points.length - 1;
                    i >= 0;
                    i--
                ) {

                    const value =
                        toNumber(
                            points[i].reading[
                                series.key
                            ]
                        );


                    if (
                        value !== null
                    ) {

                        latest = value;

                        break;

                    }

                }


                if (
                    latest !== null
                ) {

                    const latestElement =
                        document.createElement(
                            "div"
                        );


                    latestElement.style.position =
                        "absolute";


                    latestElement.style.display =
                        "none";


                    latestElement.textContent =
                        `${series.label}: ${formatAxisValue(latest)}`;

                }

            }
        );

    }


    /* =========================================================
       AXIS NUMBER FORMAT
    ========================================================= */

    function formatAxisValue(value) {

        if (
            !Number.isFinite(value)
        ) {

            return "—";

        }


        if (
            Math.abs(value) >= 100
        ) {

            return value.toFixed(0);

        }


        if (
            Math.abs(value) >= 10
        ) {

            return value.toFixed(1);

        }


        return value.toFixed(1);

    }


    /* =========================================================
       TEMPERATURE CHART
    ========================================================= */

    function renderTemperatureChart(
        readings
    ) {

        drawLineChart(
            "temperatureChart",
            readings,
            {

                series: [

                    {

                        key:
                            "temperature",

                        label:
                            "Temperature (°C)",

                        color:
                            TEMPERATURE_COLOR

                    }

                ]

            }
        );


        updateRangeLabel(
            "temperatureRange",
            readings
        );

    }


    /* =========================================================
       MOVEMENT CHART
    ========================================================= */

    function renderMovementChart(
        readings
    ) {

        drawLineChart(
            "movementChart",
            readings,
            {

                series: [

                    {

                        key:
                            "gyro_x",

                        label:
                            "Gyro X",

                        color:
                            GYRO_X_COLOR

                    },

                    {

                        key:
                            "gyro_y",

                        label:
                            "Gyro Y",

                        color:
                            GYRO_Y_COLOR

                    },

                    {

                        key:
                            "gyro_z",

                        label:
                            "Gyro Z",

                        color:
                            GYRO_Z_COLOR

                    }

                ]

            }
        );


        updateRangeLabel(
            "movementRange",
            readings
        );

    }


    /* =========================================================
       FLUID CHART
    ========================================================= */

    function renderFluidChart(
        readings
    ) {

        drawLineChart(
            "fluidChart",
            readings,
            {

                series: [

                    {

                        key:
                            "urine_distance",

                        label:
                            "Urine Distance (cm)",

                        color:
                            URINE_COLOR

                    },

                    {

                        key:
                            "iv_distance",

                        label:
                            "IV Distance (cm)",

                        color:
                            IV_COLOR

                    }

                ]

            }
        );


        updateRangeLabel(
            "fluidRange",
            readings
        );

    }


    /* =========================================================
       RANGE LABEL
    ========================================================= */

    function updateRangeLabel(
        elementId,
        readings
    ) {

        const element =
            getElement(elementId);


        if (!element) {

            return;

        }


        if (
            !Array.isArray(readings) ||
            readings.length === 0
        ) {

            element.textContent =
                "No readings";

            return;

        }


        const validDates =
            readings
                .map(
                    function (reading) {

                        return new Date(
                            reading.recorded_at
                        );

                    }
                )
                .filter(
                    function (date) {

                        return !Number.isNaN(
                            date.getTime()
                        );

                    }
                );


        if (
            validDates.length === 0
        ) {

            element.textContent =
                "Selected period";

            return;

        }


        let first =
            validDates[0];

        let last =
            validDates[0];


        validDates.forEach(
            function (date) {

                if (
                    date < first
                ) {

                    first = date;

                }


                if (
                    date > last
                ) {

                    last = date;

                }

            }
        );


        const firstText =
            first.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short"
                }
            );


        const lastText =
            last.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short"
                }
            );


        if (
            firstText === lastText
        ) {

            element.textContent =
                firstText;

        } else {

            element.textContent =
                `${firstText} – ${lastText}`;

        }

    }


    /* =========================================================
       MAIN RENDER FUNCTION
    ========================================================= */

    function render(
        readings
    ) {

        if (
            !Array.isArray(readings)
        ) {

            readings = [];

        }


        /*
         * Always sort chronologically for charts.
         */

        const sortedReadings =
            readings
                .slice()
                .sort(
                    function (a, b) {

                        return (
                            new Date(
                                a.recorded_at
                            ) -
                            new Date(
                                b.recorded_at
                            )
                        );

                    }
                );


        renderTemperatureChart(
            sortedReadings
        );


        renderMovementChart(
            sortedReadings
        );


        renderFluidChart(
            sortedReadings
        );

    }


    /* =========================================================
       WINDOW RESIZE
    ========================================================= */

    let resizeTimer = null;


    window.addEventListener(
        "resize",
        function () {

            window.clearTimeout(
                resizeTimer
            );


            resizeTimer =
                window.setTimeout(
                    function () {

                        const readings =
                            window.arogyaHistoryReadings ||
                            [];


                        render(readings);

                    },
                    150
                );

        }
    );


    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.ArogyaPatientCharts = {

        render: render

    };


})();