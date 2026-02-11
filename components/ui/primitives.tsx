import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "xs" | "sm" | "md";

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  label,
  variant = "primary",
  size = "md",
  icon,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "secondary" ? "btn-secondary" : variant === "ghost" ? "btn-ghost" : "";
  const sizeClass = size === "xs" ? "btn-xs" : size === "sm" ? "btn-sm" : "";

  return (
    <button className={`btn ${variantClass} ${sizeClass}`} type="button" {...rest}>
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  );
}

type InputProps = {
  label?: string;
  helperText?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, helperText, ...rest }: InputProps) {
  return (
    <div className="stack-vertical gap-1">
      {label && <label className="text-xs text-muted">{label}</label>}
      <input
        {...rest}
        className="bordered-box text-sm"
      />
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}

type TextareaProps = {
  label?: string;
  helperText?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, helperText, ...rest }: TextareaProps) {
  return (
    <div className="stack-vertical gap-1">
      {label && <label className="text-xs text-muted">{label}</label>}
      <textarea
        {...rest}
        className="bordered-box text-sm"
      />
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}

type CardProps = {
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function Card({ title, description, footer, children }: CardProps) {
  return (
    <div className="bordered-box stack-vertical gap-2">
      {(title || description) && (
        <header>
          {title && <div className="text-sm font-medium">{title}</div>}
          {description && <p className="text-xs text-muted mt-1">{description}</p>}
        </header>
      )}
      <div>{children}</div>
      {footer && <footer className="mt-2 text-xs text-muted">{footer}</footer>}
    </div>
  );
}

type BadgeProps = {
  text: string;
};

export function Badge({ text }: BadgeProps) {
  return <span className="pill-muted">{text}</span>;
}

