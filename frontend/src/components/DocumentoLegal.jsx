import { Link } from 'react-router';

// Plantilla de las páginas legales (Términos y Condiciones, Política de Privacidad): encabezado, índice de secciones
// con anclas y enlace al otro documento. «secciones»: [{ id, titulo, contenido }], donde contenido es JSX.
export default function DocumentoLegal({ titulo, actualizado, introduccion, secciones, otro }) {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">{titulo}</h1>
        <p className="text-body-sm text-on-surface-variant">Última actualización: {actualizado}</p>
      </header>

      <p className="text-body-base text-on-surface-variant">{introduccion}</p>

      <nav aria-label="Contenido" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
        <h2 className="mb-2 text-title-sm text-on-surface">Contenido</h2>
        <ol className="list-decimal space-y-1 pl-5 text-body-sm">
          {secciones.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-secondary hover:underline">
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {secciones.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 space-y-2">
          <h2 className="text-title-sm text-on-surface">
            {i + 1}. {s.titulo}
          </h2>
          <div className="space-y-2 text-body-base text-on-surface-variant [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">{s.contenido}</div>
        </section>
      ))}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-5 text-body-sm text-on-surface-variant">
        <span>
          ¿Dudas sobre este documento?{' '}
          <Link to="/ayuda/soporte" className="font-semibold text-secondary hover:underline">
            Contacta a soporte
          </Link>
          .
        </span>
        <Link to={otro.ruta} className="font-semibold text-secondary hover:underline">
          {otro.etiqueta} →
        </Link>
      </footer>
    </article>
  );
}
