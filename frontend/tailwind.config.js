/**
 * SIGER · Tokens de diseño "SIGER Core" para Tailwind CSS 3.4 (T-01-05).
 *
 * Fuente: project_stitch_siger_event_management/siger_core/DESIGN.md (colores, tipografía y espaciado)
 * y la configuración común de los 37 prototipos de Stitch (radios). Los nombres de las clases son los mismos
 * de los prototipos, de modo que su HTML se puede pasar a JSX sin cambiar clases.
 *
 * @type {import('tailwindcss').Config}
 */
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Igual que los prototipos: las clases dark: solo se activan con la clase .dark en <html>.
  // Con el valor por defecto ('media') se activarían solas con el modo oscuro del sistema operativo.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Superficies y texto
        background: '#f9f9ff',
        'on-background': '#151c27',
        surface: '#f9f9ff',
        'surface-dim': '#d3daea',
        'surface-bright': '#f9f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f0f3ff',
        'surface-container': '#e7eefe',
        'surface-container-high': '#e2e8f8',
        'surface-container-highest': '#dce2f3',
        'surface-variant': '#dce2f3',
        'surface-tint': '#4059aa',
        'on-surface': '#151c27',
        'on-surface-variant': '#444651',
        'inverse-surface': '#2a313d',
        'inverse-on-surface': '#ebf1ff',
        outline: '#757682',
        'outline-variant': '#c5c5d3',
        // Primario: navegación, encabezados y acciones principales
        primary: '#00236f',
        'on-primary': '#ffffff',
        'primary-container': '#1e3a8a',
        'on-primary-container': '#90a8ff',
        'inverse-primary': '#b6c4ff',
        'primary-fixed': '#dce1ff',
        'primary-fixed-dim': '#b6c4ff',
        'on-primary-fixed': '#00164e',
        'on-primary-fixed-variant': '#264191',
        // Secundario: enlaces, foco y selección activa
        secondary: '#0058be',
        'on-secondary': '#ffffff',
        'secondary-container': '#2170e4',
        'on-secondary-container': '#fefcff',
        'secondary-fixed': '#d8e2ff',
        'secondary-fixed-dim': '#adc6ff',
        'on-secondary-fixed': '#001a42',
        'on-secondary-fixed-variant': '#004395',
        // Terciario (neutros oscuros)
        tertiary: '#282a2c',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#3e4042',
        'on-tertiary-container': '#aaacae',
        'tertiary-fixed': '#e1e2e4',
        'tertiary-fixed-dim': '#c5c6c8',
        'on-tertiary-fixed': '#191c1e',
        'on-tertiary-fixed-variant': '#444749',
        // Error
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        // Estados semánticos (DESIGN.md: "Semantic Colors" para Disponible, Pendiente, Lleno y Cancelado).
        // DESIGN.md no fija sus valores; se toman de la escala de Tailwind que ya usan los prototipos (green, amber).
        exito: '#15803d',          // green-700
        'exito-container': '#dcfce7', // green-100
        'on-exito-container': '#166534', // green-800
        advertencia: '#b45309',    // amber-700
        'advertencia-container': '#fef3c7', // amber-100
        'on-advertencia-container': '#92400e', // amber-800
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Alias de los prototipos (font-body-base, font-label-md…); todos son Inter.
        'display-lg': ['Inter'],
        'display-lg-mobile': ['Inter'],
        'headline-md': ['Inter'],
        'title-sm': ['Inter'],
        'body-base': ['Inter'],
        'body-sm': ['Inter'],
        'label-md': ['Inter'],
      },
      fontSize: {
        'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-base': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      // Escala de los prototipos: lg = botones e inputs (8 px), xl = tarjetas (12 px), full = chips.
      // DESIGN.md describe esos mismos tamaños en su texto (sección Shapes).
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
        'sidebar-width': '260px',
        'container-max-width': '1440px',
      },
      maxWidth: {
        'container-max-width': '1440px',
      },
      width: {
        sidebar: '260px',
      },
      boxShadow: {
        // DESIGN.md · Elevation & Depth
        card: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 10px 15px -3px rgba(0, 0, 0, 0.05)',
        modal: '0px 20px 25px -5px rgba(0, 0, 0, 0.12), 0px 8px 10px -6px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [forms, containerQueries],
};
