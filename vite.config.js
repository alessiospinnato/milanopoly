import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sostituisci 'milanopoly' con il nome ESATTO del tuo repository
export default defineConfig({
  plugins: [react()],
  base: 'https://github.com/alessiospinnato/milanopoly/', 
})