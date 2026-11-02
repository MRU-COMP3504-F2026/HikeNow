"use client";

import { useState } from "react";
import FormField, { type FormFieldProps } from "./form-field";
import { EyeIcon, EyeOffIcon } from "./icons";

export type PasswordFieldProps = Omit<FormFieldProps, "type" | "endAdornment">;

/** Campo de contraseña con botón para mostrar u ocultar el texto. */
export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="grid size-7 cursor-pointer place-items-center rounded-sm text-icon hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      }
    />
  );
}
