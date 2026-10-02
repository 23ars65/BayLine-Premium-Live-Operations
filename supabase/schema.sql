-- ============================================================================
-- Vehicle Service Center Booking System — Database Schema
-- Target: Supabase PostgreSQL 15+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'customer',
    'staff',
    'admin'
);

CREATE TYPE booking_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE bay_status AS ENUM (
    'free',
    'occupied',
    'maintenance'
);

CREATE TYPE enquiry_status AS ENUM (
    'new',
    'contacted',
    'closed'
);
-- ----------------------------------------------------------------------------
-- 2. Profiles (extends Supabase auth.users — 1:1)
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
    id          UUID PRIMARY KEY
                REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name   TEXT NOT NULL,

    phone       TEXT,

    role        user_role NOT NULL DEFAULT 'customer',

    branch_id   UUID,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. Branches
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name        TEXT NOT NULL,

    address     TEXT NOT NULL,

    city        TEXT NOT NULL,

    state       TEXT NOT NULL DEFAULT 'Maharashtra',

    phone       TEXT,

    latitude    NUMERIC(9,6),

    longitude   NUMERIC(9,6),

    opens_at    TIME NOT NULL DEFAULT '09:00',

    closes_at   TIME NOT NULL DEFAULT '18:00',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (opens_at < closes_at)
);

-- Add FK after branches exist
ALTER TABLE profiles
ADD CONSTRAINT profiles_branch_fk
FOREIGN KEY (branch_id)
REFERENCES branches(id)
ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX idx_profiles_branch
ON profiles(branch_id);

CREATE INDEX idx_branches_city
ON branches(city);

CREATE INDEX idx_branches_state
ON branches(state);

-- ----------------------------------------------------------------------------
-- 4. Service Bays
-- ----------------------------------------------------------------------------
CREATE TABLE bays (

    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    branch_id   UUID NOT NULL
                REFERENCES branches(id)
                ON DELETE CASCADE,

    bay_number  INT NOT NULL,

    status      bay_status NOT NULL DEFAULT 'free',

    UNIQUE(branch_id, bay_number)
);

CREATE INDEX idx_bays_branch
ON bays(branch_id);

-- ----------------------------------------------------------------------------
-- 5. Service Catalog
-- ----------------------------------------------------------------------------
CREATE TABLE services (

    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name                TEXT NOT NULL,

    description         TEXT,

    duration_minutes    INT NOT NULL
                        CHECK(duration_minutes > 0),

    price               NUMERIC(10,2) NOT NULL
                        CHECK(price >= 0),

    active              BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_services_active
ON services(active);
-- ----------------------------------------------------------------------------
-- 6. Vehicles
-- ----------------------------------------------------------------------------
CREATE TABLE vehicles (

    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    owner_id        UUID NOT NULL
                    REFERENCES profiles(id)
                    ON DELETE CASCADE,

    make            TEXT NOT NULL,

    model           TEXT NOT NULL,

    year            INT NOT NULL
                    CHECK (year BETWEEN 1980 AND 2100),

    plate_number    TEXT NOT NULL,

    vin             TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(owner_id, plate_number)
);

-- Indexes
CREATE INDEX idx_vehicles_owner
ON vehicles(owner_id);

CREATE INDEX idx_vehicles_plate
ON vehicles(plate_number);

-- ----------------------------------------------------------------------------
-- 7. Bookings
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (

    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id         UUID NOT NULL
                        REFERENCES profiles(id)
                        ON DELETE CASCADE,

    vehicle_id          UUID NOT NULL
                        REFERENCES vehicles(id)
                        ON DELETE CASCADE,

    branch_id           UUID NOT NULL
                        REFERENCES branches(id)
                        ON DELETE CASCADE,

    service_id          UUID NOT NULL
                        REFERENCES services(id),

    bay_id              UUID
                        REFERENCES bays(id)
                        ON DELETE SET NULL,

    scheduled_start     TIMESTAMPTZ NOT NULL,

    scheduled_end       TIMESTAMPTZ NOT NULL,

    status              booking_status NOT NULL
                        DEFAULT 'pending',

    notes               TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (scheduled_end > scheduled_start)
);

-- ----------------------------------------------------------------------------
-- Prevent overlapping bookings in the same bay
-- ----------------------------------------------------------------------------
ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bay_bookings
EXCLUDE USING gist (

    bay_id WITH =,

    tstzrange(scheduled_start, scheduled_end) WITH &&

)
WHERE (
    bay_id IS NOT NULL
    AND status NOT IN ('cancelled','completed')
);

-- ----------------------------------------------------------------------------
-- Performance Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX idx_bookings_customer
ON bookings(customer_id);

CREATE INDEX idx_bookings_vehicle
ON bookings(vehicle_id);

CREATE INDEX idx_bookings_branch
ON bookings(branch_id);

CREATE INDEX idx_bookings_service
ON bookings(service_id);

CREATE INDEX idx_bookings_bay
ON bookings(bay_id);

CREATE INDEX idx_bookings_status
ON bookings(status);

CREATE INDEX idx_bookings_schedule
ON bookings(scheduled_start);

-- ----------------------------------------------------------------------------
-- 8. Booking Status History
-- ----------------------------------------------------------------------------
CREATE TABLE booking_status_history (

    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id      UUID NOT NULL
                    REFERENCES bookings(id)
                    ON DELETE CASCADE,

    old_status      booking_status,

    new_status      booking_status NOT NULL,

    changed_by      UUID
                    REFERENCES profiles(id),

    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_history_booking
ON booking_status_history(booking_id);

CREATE INDEX idx_booking_history_date
ON booking_status_history(changed_at);
-- ----------------------------------------------------------------------------
-- 9. Functions & Triggers
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 9.1 Auto Update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 9.2 Booking Status History
-- ============================================================================

CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    -- New Booking
    IF TG_OP = 'INSERT' THEN

        INSERT INTO booking_status_history
        (
            booking_id,
            old_status,
            new_status,
            changed_by
        )
        VALUES
        (
            NEW.id,
            NULL,
            NEW.status,
            COALESCE(auth.uid(), NEW.customer_id)
        );

    -- Status Changed
    ELSIF TG_OP = 'UPDATE'
        AND OLD.status IS DISTINCT FROM NEW.status THEN

        INSERT INTO booking_status_history
        (
            booking_id,
            old_status,
            new_status,
            changed_by
        )
        VALUES
        (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(auth.uid(), NEW.customer_id)
        );

    END IF;

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_booking_status_history
AFTER INSERT OR UPDATE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_status_change();


-- ============================================================================
-- 9.3 Synchronize Bay Status
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_bay_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    -- -------------------------
    -- OLD BAY
    -- -------------------------
    IF TG_OP IN ('UPDATE','DELETE') THEN

        IF OLD.bay_id IS NOT NULL THEN

            UPDATE bays
            SET status = CASE

                WHEN EXISTS (

                    SELECT 1
                    FROM bookings

                    WHERE bay_id = OLD.bay_id

                    AND status IN
                    (
                        'confirmed',
                        'in_progress'
                    )

                )

                THEN 'occupied'::bay_status

                ELSE 'free'::bay_status

            END

            WHERE id = OLD.bay_id;

        END IF;

    END IF;


    -- -------------------------
    -- NEW BAY
    -- -------------------------
    IF TG_OP IN ('INSERT','UPDATE') THEN

        IF NEW.bay_id IS NOT NULL THEN

            UPDATE bays
            SET status = CASE

                WHEN EXISTS (

                    SELECT 1
                    FROM bookings

                    WHERE bay_id = NEW.bay_id

                    AND status IN
                    (
                        'confirmed',
                        'in_progress'
                    )

                )

                THEN 'occupied'::bay_status

                ELSE 'free'::bay_status

            END

            WHERE id = NEW.bay_id;

        END IF;

    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_sync_bay_status
AFTER INSERT OR UPDATE OR DELETE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_bay_status();


-- ============================================================================
-- 9.4 Automatically Create Profile After Signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO profiles
    (
        id,
        full_name,
        role
    )

    VALUES
    (
        NEW.id,

        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            'New User'
        ),

        'customer'
    );

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
-- ----------------------------------------------------------------------------
-- 10. Enquiries
-- ----------------------------------------------------------------------------

CREATE TABLE enquiries (

    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    full_name           TEXT NOT NULL,

    phone               TEXT NOT NULL,

    email               TEXT,

    car_make            TEXT NOT NULL,

    car_model           TEXT NOT NULL,

    car_year            INT,

    registration_no     TEXT,

    service_type        TEXT NOT NULL,

    preferred_branch    UUID
                        REFERENCES branches(id)
                        ON DELETE SET NULL,

    preferred_date      DATE,

    message             TEXT,

    status              enquiry_status NOT NULL DEFAULT 'new',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enquiries_branch_status
ON enquiries(preferred_branch, status);

-- ----------------------------------------------------------------------------
-- 11. Bay Board View
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_bay_board AS

SELECT

    b.id                    AS bay_id,
    b.branch_id,
    b.bay_number,
    b.status                AS bay_status,

    bk.id                   AS booking_id,
    bk.status               AS booking_status,
    bk.scheduled_start,
    bk.scheduled_end,

    v.make,
    v.model,
    v.plate_number,

    s.name                  AS service_name,

    p.full_name             AS customer_name

FROM bays b

LEFT JOIN bookings bk
ON bk.bay_id = b.id
AND bk.status IN ('confirmed','in_progress')
AND bk.scheduled_start::date = CURRENT_DATE

LEFT JOIN vehicles v
ON v.id = bk.vehicle_id

LEFT JOIN services s
ON s.id = bk.service_id

LEFT JOIN profiles p
ON p.id = bk.customer_id;

-- ----------------------------------------------------------------------------
-- Helper Functions (Create BEFORE RLS Policies)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_role_is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('staff','admin')
);
$$;

CREATE OR REPLACE FUNCTION current_user_branch()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
SELECT branch_id
FROM profiles
WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_role_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role='admin'
);
$$;

-- ----------------------------------------------------------------------------
-- 12. Enable Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Profiles
-- ----------------------------------------------------------------------------

CREATE POLICY profiles_select
ON profiles
FOR SELECT
USING (
    id = auth.uid()
    OR current_role_is_staff_or_admin()
);

CREATE POLICY profiles_update
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Branches
-- ----------------------------------------------------------------------------

CREATE POLICY branches_read
ON branches
FOR SELECT
USING (TRUE);

CREATE POLICY branches_admin
ON branches
FOR ALL
USING (current_role_is_admin())
WITH CHECK (current_role_is_admin());

-- ----------------------------------------------------------------------------
-- Bays
-- ----------------------------------------------------------------------------

CREATE POLICY bays_read
ON bays
FOR SELECT
USING (TRUE);

CREATE POLICY bays_staff
ON bays
FOR ALL
USING (
    current_role_is_admin()
    OR (
        current_role_is_staff_or_admin()
        AND branch_id = current_user_branch()
    )
)
WITH CHECK (
    current_role_is_admin()
    OR (
        current_role_is_staff_or_admin()
        AND branch_id = current_user_branch()
    )
);

-- ----------------------------------------------------------------------------
-- Services
-- ----------------------------------------------------------------------------

CREATE POLICY services_read
ON services
FOR SELECT
USING (TRUE);

CREATE POLICY services_admin
ON services
FOR ALL
USING (current_role_is_admin())
WITH CHECK (current_role_is_admin());

-- ----------------------------------------------------------------------------
-- Vehicles
-- ----------------------------------------------------------------------------

CREATE POLICY vehicles_select
ON vehicles
FOR SELECT
USING (
    owner_id = auth.uid()
    OR current_role_is_staff_or_admin()
);

CREATE POLICY vehicles_manage
ON vehicles
FOR ALL
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- ----------------------------------------------------------------------------
-- Bookings
-- ----------------------------------------------------------------------------

CREATE POLICY bookings_select
ON bookings
FOR SELECT
USING (

    customer_id = auth.uid()

    OR current_role_is_admin()

    OR (
        current_role_is_staff_or_admin()
        AND branch_id = current_user_branch()
    )

);

CREATE POLICY bookings_insert
ON bookings
FOR INSERT
WITH CHECK (
    customer_id = auth.uid()
);

CREATE POLICY bookings_update
ON bookings
FOR UPDATE
USING (

    customer_id = auth.uid()

    OR current_role_is_admin()

    OR (
        current_role_is_staff_or_admin()
        AND branch_id = current_user_branch()
    )

)
WITH CHECK (

    customer_id = auth.uid()

    OR current_role_is_admin()

    OR (
        current_role_is_staff_or_admin()
        AND branch_id = current_user_branch()
    )

);

-- ----------------------------------------------------------------------------
-- Booking History
-- ----------------------------------------------------------------------------

CREATE POLICY history_select
ON booking_status_history
FOR SELECT
USING (

EXISTS (

SELECT 1

FROM bookings bk

WHERE bk.id = booking_status_history.booking_id

AND (

bk.customer_id = auth.uid()

OR current_role_is_admin()

OR (

current_role_is_staff_or_admin()

AND bk.branch_id = current_user_branch()

)

)

)

);

-- ----------------------------------------------------------------------------
-- Enquiries
-- ----------------------------------------------------------------------------

CREATE POLICY enquiries_insert
ON enquiries
FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY enquiries_select
ON enquiries
FOR SELECT
USING (

current_role_is_admin()

OR (

current_role_is_staff_or_admin()

AND preferred_branch = current_user_branch()

)

);

CREATE POLICY enquiries_update
ON enquiries
FOR UPDATE
USING (

current_role_is_admin()

OR (

current_role_is_staff_or_admin()

AND preferred_branch = current_user_branch()

)

)
WITH CHECK (

current_role_is_admin()

OR (

current_role_is_staff_or_admin()

AND preferred_branch = current_user_branch()

)

);

-- ----------------------------------------------------------------------------
-- 13. Realtime
-- ----------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime
ADD TABLE bookings;

ALTER PUBLICATION supabase_realtime
ADD TABLE bays;

ALTER PUBLICATION supabase_realtime
ADD TABLE enquiries;

-- ----------------------------------------------------------------------------
-- 14. Seed Data
-- ----------------------------------------------------------------------------

INSERT INTO branches
(name,address,city,state,phone,latitude,longitude)
VALUES

('Downtown Auto Care','12 MG Road, Camp','Pune','Maharashtra','+91-20-55501234',18.5162,73.8636),
('Highway Service Point','NH48 Service Rd, Baner','Pune','Maharashtra','+91-20-55505678',18.5590,73.7868),
('Hinjewadi Express Care','Phase 1, Rajiv Gandhi Infotech Park','Pune','Maharashtra','+91-20-55509012',18.5913,73.7389),
('Bandra Service Studio','Linking Road, Bandra West','Mumbai','Maharashtra','+91-22-55501122',19.0596,72.8295),
('Andheri MIDC Garage','MIDC Industrial Area, Andheri East','Mumbai','Maharashtra','+91-22-55503344',19.1197,72.8697),
('Wardha Road Service Hub','Wardha Rd, near Ravi Nagar','Nagpur','Maharashtra','+91-712-5550123',21.1180,79.0570),
('Connaught Place Auto Hub','Outer Circle, Connaught Place','New Delhi','Delhi','+91-11-55501111',28.6315,77.2167),
('Gurugram Cyber Care','DLF Cyber City, Sector 24','Gurugram','Haryana','+91-124-5550222',28.4950,77.0890),
('Koramangala Motor Works','80 Feet Rd, Koramangala','Bengaluru','Karnataka','+91-80-55501333',12.9352,77.6245),
('Whitefield Quick Service','ITPL Main Rd, Whitefield','Bengaluru','Karnataka','+91-80-55501444',12.9698,77.7500),
('T Nagar Car Clinic','Usman Rd, T Nagar','Chennai','Tamil Nadu','+91-44-55501555',13.0418,80.2341),
('Salt Lake Auto Point','Sector V, Salt Lake City','Kolkata','West Bengal','+91-33-55501666',22.5744,88.4331),
('HITEC City Garage','Hitec City Main Rd','Hyderabad','Telangana','+91-40-55501777',17.4474,78.3762),
('SG Highway Auto Care','SG Highway, Bodakdev','Ahmedabad','Gujarat','+91-79-55501888',23.0339,72.5079),
('Malviya Nagar Service Hub','Malviya Nagar','Jaipur','Rajasthan','+91-141-5550199',26.8535,75.8114),
('Gomti Nagar Car Studio','Vipin Khand, Gomti Nagar','Lucknow','Uttar Pradesh','+91-522-5550210',26.8511,80.9895),
('Sector 34 Auto Care','Sector 34-A','Chandigarh','Chandigarh','+91-172-5550221',30.7194,76.7681),
('Vyttila Service Center','Vyttila Hub Rd','Kochi','Kerala','+91-484-5550232',9.9679,76.3192),
('Vijay Nagar Garage','AB Rd, Vijay Nagar','Indore','Madhya Pradesh','+91-731-5550243',22.7532,75.8937),
('Boring Road Auto Fix','Boring Road','Patna','Bihar','+91-612-5550254',25.6127,85.1197);

INSERT INTO bays(branch_id,bay_number)

SELECT id, gs

FROM branches,
generate_series(1,4) gs;

INSERT INTO services
(name,description,duration_minutes,price)

VALUES

('Oil Change','Engine oil + filter replacement',30,899),

('Brake Inspection','Front/rear brake check and pad replacement',60,2499),

('General Service','Full multi-point inspection and service',120,3999),

('Wheel Alignment','4-wheel alignment and balancing',45,1499),

('AC Service','AC gas top-up and system check',40,1799),

('Battery Replacement','Battery health check and replacement if needed',20,599);
