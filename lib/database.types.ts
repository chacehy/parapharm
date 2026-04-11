export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: string
          delivery_location: unknown
          id: string
          notes: string | null
          payment_method: string
          pharmacy_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address: string
          delivery_location?: unknown
          id?: string
          notes?: string | null
          payment_method?: string
          pharmacy_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: string
          delivery_location?: unknown
          id?: string
          notes?: string | null
          payment_method?: string
          pharmacy_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          pharmacy_id: string
          price: number
          stock: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          pharmacy_id: string
          price: number
          stock?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          pharmacy_id?: string
          price?: number
          stock?: number
        }
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          id: string
          location: unknown
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          id: string
          location?: unknown
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          location?: unknown
          name?: string
          phone?: string | null
          role?: string
        }
      }
    }
    Functions: {
      find_nearby_pharmacies: {
        Args: {
          p_lat: number
          p_lng: number
          p_product_search?: string
          p_radius_km?: number
        }
        Returns: {
          distance_km: number
          pharmacy_address: string
          pharmacy_id: string
          pharmacy_lat: number
          pharmacy_lng: number
          pharmacy_name: string
          product_count: number
        }[]
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type NearbyPharmacy = Database['public']['Functions']['find_nearby_pharmacies']['Returns'][0]

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
