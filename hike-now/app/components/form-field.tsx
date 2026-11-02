import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  /** Texto de la etiqueta (obligatorio por accesibilidad). */
  label: string;
  /** Mensaje de error. Si existe, el campo se marca como inválido. */
  error?: string;
  /** Ayuda opcional bajo el campo (se oculta si hay error). */
  hint?: string;
  /** Contenido a la derecha dentro del campo (p. ej. el botón de ver contraseña). */
  endAdornment?: ReactNode;
  /** Clases para el contenedor. */
  className?: string;
};

/** Etiqueta + input + mensaje de error/ayuda, con los atributos ARIA ya conectados. */
export default function FormField({
  label,
  error,
  hint,
  endAdornment,
  required,
  className = "",
  ...props
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={["flex flex-col gap-2", className].join(" ")}>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden="true" className="text-danger">
              *
            </span>
          </>
        )}
      </label>

      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={[
            "w-full rounded-control border bg-background px-3 py-2 text-small text-text placeholder:text-placeholder",
            "focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-field-border",
            endAdornment ? "pr-10" : "",
          ].join(" ")}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {endAdornment}
          </div>
        )}
      </div>

      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={["text-small", error ? "text-danger" : "text-text-subtle"].join(" ")}
        >
          {message}
        </p>
      )}
    </div>
  );
}
