import { Link } from 'react-router';
import Logo from '../Logo';

// Tarjeta centrada de las pantallas de acceso (prototipos siger_login, siger_registro, 
// siger_recuperar_contrase_a…).
export default function AuthLayout({ titulo, subtitulo, ancho = 'max-w-[440px]', children, pie }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" aria-hidden="true" />
      <main className={`relative z-10 w-full ${ancho}`}>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-card sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link to="/eventos" aria-label="SIGER, ir al catálogo de eventos" className="mb-4">
              <Logo className="h-11" />
            </Link>
            <h1 className="text-headline-md text-primary">{titulo}</h1>
            {subtitulo && <p className="mt-1 text-body-sm text-on-surface-variant">{subtitulo}</p>}
          </div>
          {children}
          {pie && <div className="mt-8 border-t border-outline-variant pt-6 text-center text-body-sm text-on-surface-variant">{pie}</div>}
        </div>
      </main>
    </div>
  );
}
