import type { ReactNode } from "react";

type PageProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function Page({ title, description, children }: PageProps) {
  return (
    <div className="stack-vertical gap-3">
      {(title || description) && (
        <header className="flex-between">
          <div>
            {title && <h1 className="text-base font-semibold">{title}</h1>}
            {description && <p className="text-xs text-muted mt-1">{description}</p>}
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}

type StackProps = {
  direction?: "vertical" | "horizontal";
  gap?: "xs" | "sm" | "md";
  children: ReactNode;
};

export function Stack({ direction = "vertical", gap = "md", children }: StackProps) {
  const dirClass = direction === "vertical" ? "stack-vertical" : "stack-horizontal";
  const gapClass = gap === "xs" ? "gap-1" : gap === "sm" ? "gap-2" : "gap-3";
  return <div className={`${dirClass} ${gapClass}`}>{children}</div>;
}

type SectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="bordered-box stack-vertical gap-2">
      {(title || description) && (
        <header>
          {title && <h2 className="text-sm font-medium">{title}</h2>}
          {description && <p className="text-xs text-muted mt-1">{description}</p>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

type SidebarProps = {
  title?: string;
  children: ReactNode;
};

export function Sidebar({ title, children }: SidebarProps) {
  return (
    <aside className="stack-vertical gap-2">
      {title && <div className="text-xs font-semibold text-muted uppercase">{title}</div>}
      <div className="bordered-box stack-vertical gap-2">{children}</div>
    </aside>
  );
}

type NavbarProps = {
  title?: string;
  right?: ReactNode;
};

export function Navbar({ title, right }: NavbarProps) {
  return (
    <nav className="flex-between mb-2">
      <div className="stack-vertical gap-1">
        {title && <div className="text-sm font-medium">{title}</div>}
      </div>
      {right && <div className="stack-horizontal gap-2">{right}</div>}
    </nav>
  );
}

