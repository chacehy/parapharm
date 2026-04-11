import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './database.types'

export interface CartItem {
  product: Product
  quantity: number
  pharmacyId: string
  pharmacyName: string
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, pharmacyId: string, pharmacyName: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  pharmacyId: () => string | null
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, pharmacyId, pharmacyName) => {
        const items = get().items
        const currentPharmacyId = get().pharmacyId()

        // Enforce single pharmacy per cart
        if (currentPharmacyId && currentPharmacyId !== pharmacyId) {
          if (!confirm('Your cart contains items from another pharmacy. Clear cart and add this item?')) return
          set({ items: [] })
        }

        const existing = items.find((i) => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        } else {
          set({ items: [...get().items, { product, quantity: 1, pharmacyId, pharmacyName }] })
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      pharmacyId: () => {
        const items = get().items
        return items.length > 0 ? items[0].pharmacyId : null
      },
    }),
    { name: 'parapharm-cart' }
  )
)
