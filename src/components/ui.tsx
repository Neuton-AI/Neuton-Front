import type React from "react";
import { Spinner } from "@/components/feedback";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";
type ButtonRadius = "pill" | "input" | "card";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-ink-on-primary shadow-[0_6px_18px_rgba(204,120,92,0.28)]",
  secondary: "bg-surface-dark text-ink-on-dark",
  ghost: "bg-surface-cream-strong text-ink",
  danger: "border border-semantic-error/40 bg-semantic-error/10 text-ink",
  outline:
    "border border-hairline bg-surface-canvas text-ink hover:bg-surface-soft hover:border-ink/20",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-label",
  md: "h-11 px-4 text-body",
  lg: "h-[52px] px-5 text-body",
};

/** Form-heavy screens in the design use an 8px radius; primary CTAs stay pill. */
const BUTTON_RADII: Record<ButtonRadius, string> = {
  pill: "rounded-pill",
  input: "rounded-input",
  card: "rounded-card",
};

interface IButton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  loading?: boolean;
  block?: boolean;
}

export const Button: React.FC<IButton> = ({
  variant = "primary",
  size = "md",
  radius = "pill",
  type = "button",
  loading = false,
  block = false,
  className = "",
  children,
  disabled,
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`pressable inline-flex items-center justify-center gap-2 font-medium disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${BUTTON_RADII[radius]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
};

/** Same visual language as Button, but renders a router link. */
interface IButtonLink {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  block?: boolean;
  className?: string;
  children: ReactNode;
}

export const ButtonLink: React.FC<IButtonLink> = ({
  to,
  variant = "primary",
  size = "md",
  radius = "pill",
  block = false,
  className = "",
  children,
}) => {
  return (
    <Link
      to={to}
      className={`pressable inline-flex items-center justify-center gap-2 font-medium ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${BUTTON_RADII[radius]} ${block ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
};

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */

const CONTROL =
  "w-full rounded-input border border-hairline bg-surface-canvas px-3 text-body text-ink placeholder:text-ink-muted-soft transition-colors duration-200 focus:border-brand-primary focus:outline-none disabled:opacity-50";

interface IField {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Field: React.FC<IField> = ({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-label font-medium text-ink-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-label text-ink-muted-soft">{hint}</p> : null}
    </div>
  );
};

/** The design's form frames use 40px controls; list and modal forms use 44px. */
interface IInput extends InputHTMLAttributes<HTMLInputElement> {
  dense?: boolean;
}

export const Input: React.FC<IInput> = ({
  dense = false,
  className = "",
  ...rest
}) => {
  return (
    <input
      className={`${CONTROL} ${dense ? "h-10" : "h-11"} ${className}`}
      {...rest}
    />
  );
};

interface ITextarea extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoComplete?: TextareaHTMLAttributes<HTMLTextAreaElement>["autoComplete"];
}

export const Textarea: React.FC<ITextarea> = ({ className = "", ...rest }) => {
  return (
    <textarea
      className={`${CONTROL} resize-none py-2.5 ${className}`}
      {...rest}
    />
  );
};

interface ISelect extends SelectHTMLAttributes<HTMLSelectElement> {
  autoComplete?: SelectHTMLAttributes<HTMLSelectElement>["autoComplete"];
}

export const Select: React.FC<ISelect> = ({ className = "", ...rest }) => {
  return (
    <select
      className={`${CONTROL} h-11 appearance-none ${className}`}
      {...rest}
    />
  );
};
