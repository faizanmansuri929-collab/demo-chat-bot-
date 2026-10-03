/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        uai: {
          brand: 'var(--uai-brand, #0B2545)',
          accent: 'var(--uai-accent, #F2B54A)',
          bg: 'var(--uai-bg, #F4F6F9)',
          surface: 'var(--uai-surface, #FFFFFF)',
          'surface-muted': 'var(--uai-surface-muted, #F7F9FB)',
          border: 'var(--uai-border, #E3E8EF)',
          'border-strong': 'var(--uai-border-strong, #D5DCE6)',
          text: 'var(--uai-text, #1B2433)',
          'text-2': 'var(--uai-text-2, #3A4556)',
          'text-muted': 'var(--uai-text-muted, #5A6578)',
          'text-subtle': 'var(--uai-text-subtle, #6B7586)',
          online: 'var(--uai-online, #4ADE9B)',
          whatsapp: 'var(--uai-whatsapp, #25D366)',
          success: 'var(--uai-success, #1E7E4E)',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
