export interface Client {
  id: string
  owner_name: string
  dog_name: string
  breed: string | null
  dog_age: string | null
  phone: string | null
  behavior_notes: string | null
  tips_notes: string | null
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  scheduled_at: string
  duration_minutes: number
  came_dirty: boolean
  price: number | null
  notes: string | null
  created_at: string
  client?: Client
}

export type NewClient = Omit<Client, "id" | "created_at">
export type NewAppointment = Omit<Appointment, "id" | "created_at" | "client">
