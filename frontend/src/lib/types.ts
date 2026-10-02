export type UserRole = 'customer' | 'staff' | 'admin'
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type BayStatus = 'free' | 'occupied' | 'maintenance'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  branch_id: string | null
}

export interface Branch {
  id: string
  name: string
  address: string
  city: string
  state: string
  phone: string | null
  latitude: number | null
  longitude: number | null
  opens_at: string
  closes_at: string
}

export type EnquiryStatus = 'new' | 'contacted' | 'closed'

export interface Enquiry {
  id: string
  full_name: string
  phone: string
  email: string | null
  car_make: string
  car_model: string
  car_year: number | null
  registration_no: string | null
  service_type: string
  preferred_branch: string | null
  preferred_date: string | null
  message: string | null
  status: EnquiryStatus
  created_at: string
}

export interface Bay {
  id: string
  branch_id: string
  bay_number: number
  status: BayStatus
}

export interface ServiceItem {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  active: boolean
}
export interface Vehicle {
  id: string
  owner_id: string
  make: string
  model: string
  year: number
  plate_number: string
  vin: string | null
  vehicle_type: string
  mileage: number
}

export interface Booking {
  id: string
  customer_id: string
  vehicle_id: string
  branch_id: string
  service_id: string
  bay_id: string | null
  scheduled_start: string
  scheduled_end: string
  status: BookingStatus
  notes: string | null
  created_at: string
  updated_at: string
  // joined fields (populated client-side via select())
  vehicles?: Vehicle
  services?: ServiceItem
  branches?: Branch
  profiles?: Profile
}

export interface BayBoardRow {
  bay_id: string
  branch_id: string
  bay_number: number
  bay_status: BayStatus
  booking_id: string | null
  booking_status: BookingStatus | null
  scheduled_start: string | null
  scheduled_end: string | null
  make: string | null
  model: string | null
  plate_number: string | null
  service_name: string | null
  customer_name: string | null
}
