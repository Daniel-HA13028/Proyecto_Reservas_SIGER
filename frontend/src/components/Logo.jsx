// Logotipo de SIGER (prototipo siger_logo). tono="claro" para fondos oscuros como el sidebar.
export default function Logo({ tono = 'oscuro', soloIcono = false, className = 'h-9' }) {
  const texto = tono === 'claro' ? '#FFFFFF' : '#1E3A8A';
  const anillo = tono === 'claro' ? '#FFFFFF' : '#1E3A8A';
  return (
    <svg
      className={className}
      viewBox={soloIcono ? '15 15 30 30' : '15 15 150 30'}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SIGER"
    >
      <circle cx="30" cy="30" r="15" fill={anillo} />
      <circle cx="30" cy="30" r="5" fill="#3B82F6" />
      {!soloIcono && (
        <text x="58" y="41.5" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="32" fill={texto}>
          SIGER
        </text>
      )}
    </svg>
  );
}
