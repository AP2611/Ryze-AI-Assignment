import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Deterministic UI Agent",
  description: "AI-powered deterministic UI generator using a fixed component library"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

