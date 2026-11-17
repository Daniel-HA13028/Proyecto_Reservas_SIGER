import { forwardRef, useState } from 'react';
import { REQUISITOS_CONTRASENA } from '../../utils/validaciones';
import Input from './Input';

// Contraseña con botón para mostrarla y, si se pide, los requisitos marcados en vivo.
const PasswordInput = forwardRef(function PasswordInput({ mostrarRequisitos = false, value = '', ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        icono="lock"
        value={value}
        derecha={
          <button
            type="button"
            className="text-outline hover:text-secondary"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{visible ? 'visibility_off' : 'visibility'}</span>
          </button>
        }
        {...props}
      />
      {mostrarRequisitos && (
        <ul className="grid grid-cols-2 gap-1 px-1 text-[12px]" aria-label="Requisitos de la contraseña (RNF-01)">
          {REQUISITOS_CONTRASENA.map(([texto, prueba]) => {
            const ok = prueba(value);
            return (
              <li key={texto} className={`flex items-center gap-1 ${ok ? 'text-exito' : 'text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {ok ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {texto}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

export default PasswordInput;
