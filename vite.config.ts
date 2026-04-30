/**
 * Summary: Vite configuration file.
 * Modifications: Imported and added the tailwindcss plugin to the Vite configuration array.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Added Tailwind plugin import

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // Added Tailwind plugin to the execution pipeline
  ],
  server: {
    allowedHosts: [
      '6241-189-34-53-184.ngrok-free.app'
    ]}
})