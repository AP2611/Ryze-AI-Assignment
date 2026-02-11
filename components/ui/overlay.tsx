import { useState, type ReactNode } from "react";
import { Button } from "./primitives";

type ModalProps = {
  id?: string;
  title?: string;
  description?: string;
  triggerLabel?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

export function Modal({
  title,
  description,
  triggerLabel = "Open",
  primaryActionLabel,
  secondaryActionLabel
}: ModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack-vertical gap-1">
      <Button
        label={triggerLabel}
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="preview-inner bordered-box">
          <div className="stack-vertical gap-2">
            {title && <div className="text-sm font-medium">{title}</div>}
            {description && <div className="text-xs text-muted">{description}</div>}
            <div className="stack-horizontal gap-2 mt-2">
              {secondaryActionLabel && (
                <Button
                  label={secondaryActionLabel}
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                />
              )}
              {primaryActionLabel && (
                <Button
                  label={primaryActionLabel}
                  size="sm"
                  onClick={() => setOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

