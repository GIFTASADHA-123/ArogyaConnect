-- ============================================================
-- AROGYACONNECT DATABASE
-- Corrected development database
-- ============================================================

DROP DATABASE IF EXISTS arogya_connect;

CREATE DATABASE arogya_connect
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE arogya_connect;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM('nurse', 'doctor') NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_username (username)
);


-- ============================================================
-- 2. PATIENTS
-- ============================================================

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_code VARCHAR(20) NOT NULL UNIQUE,

    full_name VARCHAR(100) NOT NULL,

    age INT NOT NULL,

    gender ENUM('Male', 'Female', 'Other') NOT NULL,

    phone VARCHAR(20),

    blood_group VARCHAR(10),

    admission_date DATE NOT NULL,

    diagnosis VARCHAR(255),

    medical_conditions TEXT,

    emergency_contact_name VARCHAR(100),

    emergency_contact_phone VARCHAR(20),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_patients_code (patient_code),

    INDEX idx_patients_active (is_active)
);


-- ============================================================
-- 3. BEDS
-- ============================================================

CREATE TABLE beds (
    id INT AUTO_INCREMENT PRIMARY KEY,

    bed_code VARCHAR(20) NOT NULL UNIQUE,

    ward_name VARCHAR(100) NOT NULL,

    room_number VARCHAR(20),

    floor_number VARCHAR(20),

    patient_id INT NULL,

    status ENUM(
        'available',
        'occupied',
        'maintenance'
    ) NOT NULL DEFAULT 'available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_beds_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================
-- 4. DEVICES
--
-- Internal only.
-- Never display device/ESP32/Wi-Fi information in UI.
-- ============================================================

CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    device_code VARCHAR(50) NOT NULL UNIQUE,

    patient_id INT NULL,

    status ENUM(
        'online',
        'offline'
    ) NOT NULL DEFAULT 'offline',

    last_seen_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_devices_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================
-- 5. SENSOR READINGS
--
-- One patient can have MANY readings.
--
-- Example:
--
-- P001
-- 08:00
-- 08:05
-- 08:10
-- 08:15
-- ...
--
-- Only the currently physically monitored patient
-- receives real/simulated sensor readings.
-- ============================================================

CREATE TABLE sensor_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    device_id INT NULL,

    temperature DECIMAL(5,2) NULL,

    gyro_x DECIMAL(10,4) NULL,

    gyro_y DECIMAL(10,4) NULL,

    gyro_z DECIMAL(10,4) NULL,

    force_fall DECIMAL(10,2) NULL,

    force_position DECIMAL(10,2) NULL,

    urine_distance DECIMAL(10,2) NULL,

    iv_distance DECIMAL(10,2) NULL,

    position_status VARCHAR(30) NULL,

    position_duration_seconds INT NULL,

    fall_detected BOOLEAN NOT NULL DEFAULT FALSE,

    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sensor_readings_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_sensor_readings_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_sensor_patient_date (
        patient_id,
        recorded_at
    ),

    INDEX idx_sensor_recorded_at (
        recorded_at
    )
);


-- ============================================================
-- 6. ALERTS
-- ============================================================

CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    device_id INT NULL,

    alert_type VARCHAR(50) NOT NULL,

    severity ENUM(
        'normal',
        'attention',
        'danger'
    ) NOT NULL DEFAULT 'attention',

    message VARCHAR(500) NOT NULL,

    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,

    acknowledged_by INT NULL,

    acknowledged_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alerts_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_alerts_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_alerts_user
        FOREIGN KEY (acknowledged_by)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_alerts_patient (
        patient_id
    ),

    INDEX idx_alerts_created (
        created_at
    ),

    INDEX idx_alerts_acknowledged (
        acknowledged
    )
);


-- ============================================================
-- 7. PATIENT EVENTS
-- ============================================================

CREATE TABLE patient_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    event_type VARCHAR(50) NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    severity ENUM(
        'normal',
        'attention',
        'danger'
    ) NOT NULL DEFAULT 'normal',

    created_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_events_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_events_patient (
        patient_id
    ),

    INDEX idx_events_created (
        created_at
    )
);


-- ============================================================
-- 8. DEVELOPMENT STAFF ACCOUNTS
-- ============================================================

INSERT INTO users (
    username,
    password,
    role
)
VALUES
(
    'nurse1',
    'nurse123',
    'nurse'
),
(
    'doctor1',
    'doctor123',
    'doctor'
);


-- ============================================================
-- 9. TEN PATIENT RECORDS
--
-- These are demographic/medical records only.
-- They do NOT receive fabricated sensor history.
-- ============================================================

INSERT INTO patients (
    patient_code,
    full_name,
    age,
    gender,
    phone,
    blood_group,
    admission_date,
    diagnosis,
    medical_conditions,
    emergency_contact_name,
    emergency_contact_phone
)
VALUES

(
    'P001',
    'Arun Kumar',
    56,
    'Male',
    '9000000001',
    'B+',
    CURDATE(),
    'Post-operative observation',
    'Under routine monitoring',
    'Lakshmi Kumar',
    '9000010001'
),

(
    'P002',
    'Priya Sharma',
    43,
    'Female',
    '9000000002',
    'O+',
    CURDATE(),
    'General observation',
    'Under clinical observation',
    'Raj Sharma',
    '9000010002'
),

(
    'P003',
    'Rahul Singh',
    61,
    'Male',
    '9000000003',
    'A+',
    CURDATE(),
    'Post-operative care',
    'Requires regular monitoring',
    'Anita Singh',
    '9000010003'
),

(
    'P004',
    'Meena Devi',
    49,
    'Female',
    '9000000004',
    'AB+',
    CURDATE(),
    'Medical observation',
    'Under routine monitoring',
    'Suresh Devi',
    '9000010004'
),

(
    'P005',
    'Vijay Raj',
    67,
    'Male',
    '9000000005',
    'O-',
    CURDATE(),
    'Post-operative observation',
    'Requires regular monitoring',
    'Kavitha Raj',
    '9000010005'
),

(
    'P006',
    'Anitha Rao',
    38,
    'Female',
    '9000000006',
    'B+',
    CURDATE(),
    'General observation',
    'Under clinical observation',
    'Ramesh Rao',
    '9000010006'
),

(
    'P007',
    'Suresh Babu',
    72,
    'Male',
    '9000000007',
    'A-',
    CURDATE(),
    'Medical observation',
    'Requires regular monitoring',
    'Geetha Babu',
    '9000010007'
),

(
    'P008',
    'Divya Menon',
    29,
    'Female',
    '9000000008',
    'O+',
    CURDATE(),
    'General observation',
    'Under routine monitoring',
    'Mohan Menon',
    '9000010008'
),

(
    'P009',
    'Karthik Reddy',
    51,
    'Male',
    '9000000009',
    'B-',
    CURDATE(),
    'Post-operative care',
    'Requires regular monitoring',
    'Sunitha Reddy',
    '9000010009'
),

(
    'P010',
    'Radha Krishnan',
    64,
    'Female',
    '9000000010',
    'AB-',
    CURDATE(),
    'Medical observation',
    'Under clinical observation',
    'Madhavan Krishnan',
    '9000010010'
);


-- ============================================================
-- 10. BEDS
-- ============================================================

INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B001',
    'General Ward',
    '101',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P001';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B002',
    'General Ward',
    '102',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P002';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B003',
    'General Ward',
    '103',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P003';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B004',
    'General Ward',
    '104',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P004';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B005',
    'General Ward',
    '105',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P005';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B006',
    'General Ward',
    '106',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P006';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B007',
    'General Ward',
    '107',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P007';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B008',
    'General Ward',
    '108',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P008';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B009',
    'General Ward',
    '109',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P009';


INSERT INTO beds (
    bed_code,
    ward_name,
    room_number,
    floor_number,
    patient_id,
    status
)
SELECT
    'B010',
    'General Ward',
    '110',
    '1',
    id,
    'occupied'
FROM patients
WHERE patient_code = 'P010';


-- ============================================================
-- 11. ONE CURRENTLY MONITORED DEVICE
--
-- P001 is the temporary development patient.
-- The UI does not expose this device information.
-- ============================================================

INSERT INTO devices (
    device_code,
    patient_id,
    status
)
SELECT
    'MONITOR-001',
    id,
    'offline'
FROM patients
WHERE patient_code = 'P001';


-- ============================================================
-- 12. VERIFICATION
-- ============================================================

SELECT COUNT(*) AS total_users
FROM users;

SELECT COUNT(*) AS total_patients
FROM patients;

SELECT COUNT(*) AS total_beds
FROM beds;

SELECT COUNT(*) AS total_devices
FROM devices;

SELECT COUNT(*) AS total_sensor_readings
FROM sensor_readings;

SELECT COUNT(*) AS total_alerts
FROM alerts;

SELECT COUNT(*) AS total_patient_events
FROM patient_events;



## remove



/* ============================================================
   AROGYACONNECT
   COMPLETE DEMO / PREDEFINED SENSOR DATABASE
   20 PATIENTS
   5 DAYS HISTORY
   24 READINGS PER DAY
   TOTAL = 2400 SENSOR READINGS
   ============================================================ */

USE arogya_connect;


/* ============================================================
   1. REMOVE OLD MONITORING TABLES
   DO NOT REMOVE USERS
   ============================================================ */

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS patient_events;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS beds;
DROP TABLE IF EXISTS patients;

SET FOREIGN_KEY_CHECKS = 1;


/* ============================================================
   2. PATIENTS
   ============================================================ */

CREATE TABLE patients (

    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_code VARCHAR(20) NOT NULL UNIQUE,

    full_name VARCHAR(120) NOT NULL,

    age INT NOT NULL,

    gender VARCHAR(20) NOT NULL,

    ward VARCHAR(50) NOT NULL,

    bed_number VARCHAR(20) NULL,

    blood_group VARCHAR(10) NULL,

    phone VARCHAR(30) NULL,

    emergency_contact VARCHAR(120) NULL,

    emergency_phone VARCHAR(30) NULL,

    diagnosis VARCHAR(255) NOT NULL,

    doctor_name VARCHAR(120) NOT NULL,

    admission_date DATE NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   3. BEDS
   ============================================================ */

CREATE TABLE beds (

    id INT AUTO_INCREMENT PRIMARY KEY,

    bed_code VARCHAR(20) NOT NULL UNIQUE,

    patient_id INT NOT NULL,

    ward VARCHAR(50) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'occupied',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bed_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   4. DEVICES
   ============================================================ */

CREATE TABLE devices (

    id INT AUTO_INCREMENT PRIMARY KEY,

    device_code VARCHAR(50) NOT NULL UNIQUE,

    patient_id INT NOT NULL,

    api_key VARCHAR(150) NOT NULL UNIQUE,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_device_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   5. SENSOR READINGS
   ============================================================ */

CREATE TABLE sensor_readings (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    device_id INT NOT NULL,


    /* ---------------- TEMPERATURE ---------------- */

    temperature FLOAT NULL,


    /* ---------------- GYROSCOPE ---------------- */

    gyro_x FLOAT NULL,

    gyro_y FLOAT NULL,

    gyro_z FLOAT NULL,


    /* ---------------- FORCE / FALL ---------------- */

    force_fall FLOAT NULL,

    force_position FLOAT NULL,


    /* ---------------- ULTRASONIC ---------------- */

    urine_distance FLOAT NULL,

    iv_distance FLOAT NULL,


    /* ---------------- CONDITIONS ---------------- */

    fall_detected TINYINT(1) NOT NULL DEFAULT 0,

    same_position TINYINT(1) NOT NULL DEFAULT 0,

    position_duration_seconds INT NOT NULL DEFAULT 0,

    position_label VARCHAR(50) NULL,


    /* ---------------- BUZZER ---------------- */

    buzzer_status TINYINT(1) NOT NULL DEFAULT 0,


    /* ---------------- TIME ---------------- */

    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,


    INDEX idx_sensor_patient_time
        (patient_id, recorded_at),

    INDEX idx_sensor_recorded_at
        (recorded_at),

    CONSTRAINT fk_reading_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reading_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   6. ALERTS
   ============================================================ */

CREATE TABLE alerts (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    alert_type VARCHAR(50) NOT NULL,

    severity VARCHAR(20) NOT NULL,

    message TEXT NOT NULL,

    sensor_value VARCHAR(100) NULL,

    acknowledged TINYINT(1) NOT NULL DEFAULT 0,

    acknowledged_by INT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    acknowledged_at DATETIME NULL,


    INDEX idx_alert_status
        (acknowledged, created_at),

    INDEX idx_alert_patient
        (patient_id, created_at),


    CONSTRAINT fk_alert_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_alert_user
        FOREIGN KEY (acknowledged_by)
        REFERENCES users(id)
        ON DELETE SET NULL

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   7. PATIENT EVENTS
   ============================================================ */

CREATE TABLE patient_events (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    event_type VARCHAR(50) NOT NULL,

    description TEXT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_event_patient_time
        (patient_id, created_at),

    CONSTRAINT fk_event_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   8. NOTIFICATIONS
   ============================================================ */

CREATE TABLE notifications (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NULL,

    alert_id BIGINT NULL,

    notification_type VARCHAR(50) NOT NULL,

    title VARCHAR(150) NOT NULL,

    message TEXT NOT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notification_read
        (is_read, created_at),

    INDEX idx_notification_patient
        (patient_id, created_at),

    CONSTRAINT fk_notification_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_alert
        FOREIGN KEY (alert_id)
        REFERENCES alerts(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   9. INSERT 20 PATIENTS
   ============================================================ */

INSERT INTO patients
(
    patient_code,
    full_name,
    age,
    gender,
    ward,
    bed_number,
    blood_group,
    phone,
    emergency_contact,
    emergency_phone,
    diagnosis,
    doctor_name,
    admission_date,
    status
)
VALUES

(
    'P001',
    'Arun Kumar',
    54,
    'Male',
    'Ward A',
    'A-01',
    'B+',
    '9876500001',
    'Ravi Kumar',
    '9876510001',
    'Post-operative monitoring',
    'Dr. Rajesh Kumar',
    DATE_SUB(CURDATE(), INTERVAL 8 DAY),
    'active'
),

(
    'P002',
    'Priya Devi',
    67,
    'Female',
    'Ward A',
    'A-02',
    'O+',
    '9876500002',
    'Suresh Devi',
    '9876510002',
    'Respiratory observation',
    'Dr. Rajesh Kumar',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    'active'
),

(
    'P003',
    'Vignesh Raman',
    43,
    'Male',
    'Ward A',
    'A-03',
    'A+',
    '9876500003',
    'Ramesh Raman',
    '9876510003',
    'Post-operative recovery',
    'Dr. Meena Devi',
    DATE_SUB(CURDATE(), INTERVAL 6 DAY),
    'active'
),

(
    'P004',
    'Lakshmi Priya',
    71,
    'Female',
    'Ward A',
    'A-04',
    'AB+',
    '9876500004',
    'Kannan Priya',
    '9876510004',
    'Mobility and pressure monitoring',
    'Dr. Meena Devi',
    DATE_SUB(CURDATE(), INTERVAL 9 DAY),
    'active'
),

(
    'P005',
    'Suresh Babu',
    59,
    'Male',
    'Ward B',
    'B-01',
    'O+',
    '9876500005',
    'Mahesh Babu',
    '9876510005',
    'General observation',
    'Dr. Aravind Kumar',
    DATE_SUB(CURDATE(), INTERVAL 7 DAY),
    'active'
),

(
    'P006',
    'Kavitha Raj',
    48,
    'Female',
    'Ward B',
    'B-02',
    'A+',
    '9876500006',
    'Raj Kumar',
    '9876510006',
    'Cardiac observation',
    'Dr. Aravind Kumar',
    DATE_SUB(CURDATE(), INTERVAL 12 DAY),
    'active'
),

(
    'P007',
    'Mohamed Irfan',
    62,
    'Male',
    'Ward B',
    'B-03',
    'B+',
    '9876500007',
    'Ibrahim Irfan',
    '9876510007',
    'Respiratory monitoring',
    'Dr. Faisal Ahmed',
    DATE_SUB(CURDATE(), INTERVAL 11 DAY),
    'active'
),

(
    'P008',
    'Divya Shree',
    36,
    'Female',
    'Ward B',
    'B-04',
    'O+',
    '9876500008',
    'Priya Shree',
    '9876510008',
    'Post-operative monitoring',
    'Dr. Faisal Ahmed',
    DATE_SUB(CURDATE(), INTERVAL 5 DAY),
    'active'
),

(
    'P009',
    'Karthik Raj',
    45,
    'Male',
    'Ward C',
    'C-01',
    'A+',
    '9876500009',
    'Siva Raj',
    '9876510009',
    'Neurological observation',
    'Dr. Priya Sharma',
    DATE_SUB(CURDATE(), INTERVAL 8 DAY),
    'active'
),

(
    'P010',
    'Anitha Devi',
    69,
    'Female',
    'Ward C',
    'C-02',
    'B+',
    '9876500010',
    'Ramesh Devi',
    '9876510010',
    'Diabetic monitoring',
    'Dr. Priya Sharma',
    DATE_SUB(CURDATE(), INTERVAL 13 DAY),
    'active'
),

(
    'P011',
    'Gokul Krishna',
    52,
    'Male',
    'Ward C',
    'C-03',
    'O+',
    '9876500011',
    'Mohan Krishna',
    '9876510011',
    'General observation',
    'Dr. Sanjay Kumar',
    DATE_SUB(CURDATE(), INTERVAL 9 DAY),
    'active'
),

(
    'P012',
    'Meena Kumari',
    58,
    'Female',
    'Ward C',
    'C-04',
    'AB+',
    '9876500012',
    'Kumar Meena',
    '9876510012',
    'Post-operative recovery',
    'Dr. Sanjay Kumar',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    'active'
),

(
    'P013',
    'Rahul Prasad',
    41,
    'Male',
    'Ward D',
    'D-01',
    'B+',
    '9876500013',
    'Ravi Prasad',
    '9876510013',
    'Respiratory observation',
    'Dr. Naveen Raj',
    DATE_SUB(CURDATE(), INTERVAL 7 DAY),
    'active'
),

(
    'P014',
    'Swetha Rani',
    63,
    'Female',
    'Ward D',
    'D-02',
    'O+',
    '9876500014',
    'Rani Kumar',
    '9876510014',
    'Mobility monitoring',
    'Dr. Naveen Raj',
    DATE_SUB(CURDATE(), INTERVAL 14 DAY),
    'active'
),

(
    'P015',
    'Dinesh Kumar',
    57,
    'Male',
    'Ward D',
    'D-03',
    'A+',
    '9876500015',
    'Suresh Kumar',
    '9876510015',
    'Cardiac monitoring',
    'Dr. Anjali Devi',
    DATE_SUB(CURDATE(), INTERVAL 6 DAY),
    'active'
),

(
    'P016',
    'Harini Priya',
    34,
    'Female',
    'Ward D',
    'D-04',
    'B+',
    '9876500016',
    'Priya Kumar',
    '9876510016',
    'General observation',
    'Dr. Anjali Devi',
    DATE_SUB(CURDATE(), INTERVAL 8 DAY),
    'active'
),

(
    'P017',
    'Manoj Kumar',
    73,
    'Male',
    'Ward E',
    'E-01',
    'O+',
    '9876500017',
    'Rajan Kumar',
    '9876510017',
    'Post-operative monitoring',
    'Dr. Karthik Raj',
    DATE_SUB(CURDATE(), INTERVAL 15 DAY),
    'active'
),

(
    'P018',
    'Aishwarya S',
    39,
    'Female',
    'Ward E',
    'E-02',
    'A+',
    '9876500018',
    'Sanjay S',
    '9876510018',
    'Neurological observation',
    'Dr. Karthik Raj',
    DATE_SUB(CURDATE(), INTERVAL 7 DAY),
    'active'
),

(
    'P019',
    'Santhosh Kumar',
    61,
    'Male',
    'Ward E',
    'E-03',
    'B+',
    '9876500019',
    'Muthu Kumar',
    '9876510019',
    'Respiratory monitoring',
    'Dr. Deepa Menon',
    DATE_SUB(CURDATE(), INTERVAL 11 DAY),
    'active'
),

(
    'P020',
    'Nandhini Devi',
    47,
    'Female',
    'Ward E',
    'E-04',
    'O+',
    '9876500020',
    'Devi Kumar',
    '9876510020',
    'General observation',
    'Dr. Deepa Menon',
    DATE_SUB(CURDATE(), INTERVAL 9 DAY),
    'active'
);


/* ============================================================
   10. INSERT BEDS
   ============================================================ */

INSERT INTO beds
(
    bed_code,
    patient_id,
    ward,
    status
)
SELECT
    bed_number,
    id,
    ward,
    'occupied'
FROM patients;


/* ============================================================
   11. INSERT DEVICES
   ============================================================ */

INSERT INTO devices
(
    device_code,
    patient_id,
    api_key,
    is_active,
    last_seen_at
)
SELECT
    CONCAT('ESP32-', patient_code),
    id,
    CONCAT(
        'AC-ESP32-',
        patient_code,
        '-DEMO-KEY'
    ),
    1,
    NOW()
FROM patients;


/* ============================================================
   12. GENERATE 2400 SENSOR READINGS

   20 PATIENTS
   × 5 DAYS
   × 24 READINGS
   = 2400
   ============================================================ */

INSERT INTO sensor_readings
(
    patient_id,
    device_id,

    temperature,

    gyro_x,
    gyro_y,
    gyro_z,

    force_fall,
    force_position,

    urine_distance,
    iv_distance,

    fall_detected,

    same_position,

    position_duration_seconds,

    position_label,

    buzzer_status,

    recorded_at
)

SELECT

    p.id,

    dev.id,


    /* ========================================================
       TEMPERATURE

       Values approximately 34.0 - 39.9 °C

       ALERT CONDITION:
       temperature > 35
       ======================================================== */

    ROUND(
        34.0 +
        MOD(
            p.id * 7 +
            hours.hour_no * 3 +
            days.day_no * 5,
            60
        ) / 10,
        1
    ) AS temperature,


    /* ========================================================
       GYROSCOPE X
       Range approximately -100 to +100
       ======================================================== */

    ROUND(
        -100 +
        MOD(
            p.id * 17 +
            hours.hour_no * 11 +
            days.day_no * 13,
            200
        ),
        2
    ) AS gyro_x,


    /* ========================================================
       GYROSCOPE Y
       ======================================================== */

    ROUND(
        -100 +
        MOD(
            p.id * 23 +
            hours.hour_no * 7 +
            days.day_no * 19,
            200
        ),
        2
    ) AS gyro_y,


    /* ========================================================
       GYROSCOPE Z
       ======================================================== */

    ROUND(
        -100 +
        MOD(
            p.id * 29 +
            hours.hour_no * 5 +
            days.day_no * 17,
            200
        ),
        2
    ) AS gyro_z,


    /* ========================================================
       FORCE FALL
       ======================================================== */

    ROUND(
        300 +
        MOD(
            p.id * 31 +
            hours.hour_no * 13 +
            days.day_no * 7,
            700
        ),
        2
    ) AS force_fall,


    /* ========================================================
       FORCE POSITION
       ======================================================== */

    ROUND(
        300 +
        MOD(
            p.id * 37 +
            hours.hour_no * 17 +
            days.day_no * 11,
            700
        ),
        2
    ) AS force_position,


    /* ========================================================
       ULTRASONIC SENSOR 1

       Range: 5 - 199 cm

       ALERT:
       < 20 cm
       ======================================================== */

    ROUND(
        5 +
        MOD(
            p.id * 19 +
            hours.hour_no * 13 +
            days.day_no * 7,
            195
        ),
        1
    ) AS urine_distance,


    /* ========================================================
       ULTRASONIC SENSOR 2

       Range: 5 - 199 cm

       ALERT:
       < 15 cm
       ======================================================== */

    ROUND(
        5 +
        MOD(
            p.id * 29 +
            hours.hour_no * 11 +
            days.day_no * 9,
            195
        ),
        1
    ) AS iv_distance,


    /* ========================================================
       FALL CONDITION

       Some records intentionally create falls.
       ======================================================== */

    CASE

        WHEN MOD(
            p.id +
            hours.hour_no +
            days.day_no,
            37
        ) = 0

        THEN 1

        ELSE 0

    END AS fall_detected,


    /* ========================================================
       SAME POSITION
       ======================================================== */

    CASE

        WHEN MOD(
            p.id +
            hours.hour_no +
            days.day_no,
            11
        ) = 0

        THEN 1

        ELSE 0

    END AS same_position,


    /* ========================================================
       POSITION DURATION
       ======================================================== */

    CASE

        WHEN MOD(
            p.id +
            hours.hour_no +
            days.day_no,
            11
        ) = 0

        THEN
            3600 +
            MOD(
                p.id * 100 +
                hours.hour_no * 60,
                3600
            )

        ELSE
            300 +
            MOD(
                p.id * 50 +
                hours.hour_no * 30,
                900
            )

    END AS position_duration_seconds,


    /* ========================================================
       POSITION
       ======================================================== */

    CASE MOD(
        p.id +
        hours.hour_no +
        days.day_no,
        5
    )

        WHEN 0 THEN 'Back'

        WHEN 1 THEN 'Left'

        WHEN 2 THEN 'Right'

        WHEN 3 THEN 'Sitting'

        ELSE 'Standing'

    END AS position_label,


    /* ========================================================
       BUZZER

       ON = 1

       OFF = 0

       Conditions:

       Temperature > 35
       OR fall
       OR ultrasonic warning
       OR prolonged position
       ======================================================== */

    CASE

        WHEN

            (
                34.0 +
                MOD(
                    p.id * 7 +
                    hours.hour_no * 3 +
                    days.day_no * 5,
                    60
                ) / 10
            ) > 35

            OR

            MOD(
                p.id +
                hours.hour_no +
                days.day_no,
                37
            ) = 0

            OR

            (
                5 +
                MOD(
                    p.id * 19 +
                    hours.hour_no * 13 +
                    days.day_no * 7,
                    195
                )
            ) < 20

            OR

            (
                5 +
                MOD(
                    p.id * 29 +
                    hours.hour_no * 11 +
                    days.day_no * 9,
                    195
                )
            ) < 15

            OR

            MOD(
                p.id +
                hours.hour_no +
                days.day_no,
                11
            ) = 0

        THEN 1

        ELSE 0

    END AS buzzer_status,


    /* ========================================================
       RECORDED TIME

       Five days of historical data.
       One record every hour.
       ======================================================== */

    DATE_ADD(

        DATE_SUB(

            NOW(),

            INTERVAL days.day_no DAY

        ),

        INTERVAL hours.hour_no HOUR

    ) AS recorded_at


FROM patients p

INNER JOIN devices dev

    ON dev.patient_id = p.id


/* ============================================================
   FIVE DAYS
   ============================================================ */

CROSS JOIN
(
    SELECT 1 AS day_no

    UNION ALL SELECT 2

    UNION ALL SELECT 3

    UNION ALL SELECT 4

    UNION ALL SELECT 5
) days


/* ============================================================
   24 HOURS
   ============================================================ */

CROSS JOIN
(
    SELECT 0 AS hour_no

    UNION ALL SELECT 1

    UNION ALL SELECT 2

    UNION ALL SELECT 3

    UNION ALL SELECT 4

    UNION ALL SELECT 5

    UNION ALL SELECT 6

    UNION ALL SELECT 7

    UNION ALL SELECT 8

    UNION ALL SELECT 9

    UNION ALL SELECT 10

    UNION ALL SELECT 11

    UNION ALL SELECT 12

    UNION ALL SELECT 13

    UNION ALL SELECT 14

    UNION ALL SELECT 15

    UNION ALL SELECT 16

    UNION ALL SELECT 17

    UNION ALL SELECT 18

    UNION ALL SELECT 19

    UNION ALL SELECT 20

    UNION ALL SELECT 21

    UNION ALL SELECT 22

    UNION ALL SELECT 23
) hours;


/* ============================================================
   13. TEMPERATURE ALERTS
   CONDITION:
   TEMPERATURE > 35
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'high_temperature',

    CASE

        WHEN temperature >= 38.5
        THEN 'critical'

        ELSE 'warning'

    END,

    CONCAT(
        'High temperature detected: ',
        ROUND(temperature, 1),
        ' °C'
    ),

    CONCAT(
        ROUND(temperature, 1),
        ' °C'
    ),

    0,

    recorded_at

FROM sensor_readings

WHERE temperature > 35;


/* ============================================================
   14. GYROSCOPE ALERTS

   CONDITION:
   ANY AXIS >= 85
   OR <= -85
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'abnormal_motion',

    'warning',

    CONCAT(
        'Abnormal gyroscope movement detected. ',
        'X=',
        ROUND(gyro_x, 2),
        ', Y=',
        ROUND(gyro_y, 2),
        ', Z=',
        ROUND(gyro_z, 2)
    ),

    CONCAT(
        'X=',
        ROUND(gyro_x, 2),
        ', Y=',
        ROUND(gyro_y, 2),
        ', Z=',
        ROUND(gyro_z, 2)
    ),

    0,

    recorded_at

FROM sensor_readings

WHERE

    ABS(gyro_x) >= 85

    OR

    ABS(gyro_y) >= 85

    OR

    ABS(gyro_z) >= 85;


/* ============================================================
   15. FALL ALERTS
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'fall',

    'critical',

    'Fall detected by the patient monitoring system.',

    'fall_detected=1',

    0,

    recorded_at

FROM sensor_readings

WHERE fall_detected = 1;


/* ============================================================
   16. URINE ULTRASONIC ALERT
   CONDITION:
   < 20 CM
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'urine_level',

    'warning',

    CONCAT(
        'Urine container distance is ',
        ROUND(urine_distance, 1),
        ' cm.'
    ),

    CONCAT(
        ROUND(urine_distance, 1),
        ' cm'
    ),

    0,

    recorded_at

FROM sensor_readings

WHERE urine_distance < 20;


/* ============================================================
   17. IV ULTRASONIC ALERT
   CONDITION:
   < 15 CM
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'iv_level',

    'warning',

    CONCAT(
        'IV container distance is ',
        ROUND(iv_distance, 1),
        ' cm.'
    ),

    CONCAT(
        ROUND(iv_distance, 1),
        ' cm'
    ),

    0,

    recorded_at

FROM sensor_readings

WHERE iv_distance < 15;


/* ============================================================
   18. PROLONGED POSITION ALERTS
   ============================================================ */

INSERT INTO alerts
(
    patient_id,
    alert_type,
    severity,
    message,
    sensor_value,
    acknowledged,
    created_at
)

SELECT

    patient_id,

    'prolonged_position',

    'warning',

    CONCAT(
        'Patient remained in the same position for ',
        position_duration_seconds,
        ' seconds.'
    ),

    CONCAT(
        position_duration_seconds,
        ' seconds'
    ),

    0,

    recorded_at

FROM sensor_readings

WHERE

    same_position = 1

    AND

    position_duration_seconds >= 3600;


/* ============================================================
   19. PATIENT EVENTS - TEMPERATURE
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'high_temperature',

    CONCAT(
        'Temperature reached ',
        ROUND(temperature, 1),
        ' °C.'
    ),

    recorded_at

FROM sensor_readings

WHERE temperature > 35;


/* ============================================================
   20. PATIENT EVENTS - FALL
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'fall',

    'Fall detection was reported by the monitoring device.',

    recorded_at

FROM sensor_readings

WHERE fall_detected = 1;


/* ============================================================
   21. PATIENT EVENTS - MOTION
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'abnormal_motion',

    CONCAT(
        'Abnormal movement detected. ',
        'Gyroscope X=',
        ROUND(gyro_x, 2),
        ', Y=',
        ROUND(gyro_y, 2),
        ', Z=',
        ROUND(gyro_z, 2)
    ),

    recorded_at

FROM sensor_readings

WHERE

    ABS(gyro_x) >= 85

    OR

    ABS(gyro_y) >= 85

    OR

    ABS(gyro_z) >= 85;


/* ============================================================
   22. PATIENT EVENTS - URINE
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'urine_level',

    CONCAT(
        'Urine sensor distance reached ',
        ROUND(urine_distance, 1),
        ' cm.'
    ),

    recorded_at

FROM sensor_readings

WHERE urine_distance < 20;


/* ============================================================
   23. PATIENT EVENTS - IV
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'iv_level',

    CONCAT(
        'IV sensor distance reached ',
        ROUND(iv_distance, 1),
        ' cm.'
    ),

    recorded_at

FROM sensor_readings

WHERE iv_distance < 15;


/* ============================================================
   24. PATIENT EVENTS - POSITION
   ============================================================ */

INSERT INTO patient_events
(
    patient_id,
    event_type,
    description,
    created_at
)

SELECT

    patient_id,

    'prolonged_position',

    CONCAT(
        'Patient remained in ',
        position_label,
        ' position for ',
        position_duration_seconds,
        ' seconds.'
    ),

    recorded_at

FROM sensor_readings

WHERE

    same_position = 1

    AND

    position_duration_seconds >= 3600;


/* ============================================================
   25. CREATE NOTIFICATIONS FROM ALERTS
   ============================================================ */

INSERT INTO notifications
(
    patient_id,
    alert_id,
    notification_type,
    title,
    message,
    is_read,
    created_at
)

SELECT

    a.patient_id,

    a.id,

    a.alert_type,

    CONCAT(
        'Patient Alert - ',
        p.patient_code
    ),

    a.message,

    0,

    a.created_at

FROM alerts a

INNER JOIN patients p

    ON p.id = a.patient_id;


/* ============================================================
   26. UPDATE DEVICE LAST SEEN
   ============================================================ */

UPDATE devices d

INNER JOIN
(
    SELECT

        patient_id,

        MAX(recorded_at) AS last_time

    FROM sensor_readings

    GROUP BY patient_id

) x

ON x.patient_id = d.patient_id

SET d.last_seen_at = x.last_time;


/* ============================================================
   27. FINAL CHECKS
   ============================================================ */

SELECT
    'PATIENTS' AS data_type,
    COUNT(*) AS total
FROM patients

UNION ALL

SELECT
    'BEDS',
    COUNT(*)
FROM beds

UNION ALL

SELECT
    'DEVICES',
    COUNT(*)
FROM devices

UNION ALL

SELECT
    'SENSOR READINGS',
    COUNT(*)
FROM sensor_readings

UNION ALL

SELECT
    'ALERTS',
    COUNT(*)
FROM alerts

UNION ALL

SELECT
    'PATIENT EVENTS',
    COUNT(*)
FROM patient_events

UNION ALL

SELECT
    'NOTIFICATIONS',
    COUNT(*)
FROM notifications;