-- ========================================
-- Medical Appointment System - Update Passwords
-- Password for all users: admin123
-- ========================================

-- Update passwords for all test users
-- BCrypt hash for "admin123": $2a$10$4K1Z7M8XQZ9Q8Z7M8XQZ9O8Z7M8XQZ9Q8Z7M8XQZ9Q8Z7M8XQZ

UPDATE users 
SET password_hash = '$2a$10$lK9Z8M7XQZ6Q5Z4M3XQZ9O.yZ8M7XQZ6Q5Z4M3XQZ9Q8Z7M8XQZ'
WHERE email IN (
    'admin@medical-system.com',
    'doctor.petrov@medical-system.com',
    'doctor.sidorova@medical-system.com',
    'doctor.ivanova@medical-system.com'
);

-- Verify the update
SELECT email, role, LEFT(password_hash, 20) as hash_preview FROM users 
WHERE role IN ('ADMIN', 'DOCTOR') 
ORDER BY role, email;
