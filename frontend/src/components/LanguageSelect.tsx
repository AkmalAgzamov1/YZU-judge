import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { focusRing } from "./ui";

// One entry in a language dropdown. `note` is the smaller trailing text, e.g. the
// compiler version, so a student can tell "C/C++ · MinGW GCC 6.3.0" from "C/C++ · MSVC".
export interface SelectOption {
  id: string;
  label: string;
  note?: string;
}

interface LanguageSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: SelectOption[];
  // Accessible name for the whole control, e.g. translated "Language".
  label: string;
  className?: string;
}

// A dropdown picker instead of a row of buttons, so the list stays readable when more
// languages (or more toolchains) are added. Built on the listbox pattern: Arrow keys
// move, Enter or Space chooses, Escape closes, and clicking away closes too.
export default function LanguageSelect({ value, onChange, options, label, className = "" }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = options.find((option) => option.id === value) ?? options[0];

  // Close when the student clicks anywhere outside the dropdown.
  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  function indexOfValue() {
    const found = options.findIndex((option) => option.id === value);
    return found === -1 ? 0 : found;
  }

  function openList(startAt?: number) {
    const index = startAt ?? indexOfValue();
    setActive(index);
    setOpen(true);
    // Focus the highlighted option once the list has rendered.
    requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function closeList(refocusTrigger = true) {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.id);
    closeList();
  }

  function moveActive(index: number) {
    const wrapped = (index + options.length) % options.length;
    setActive(wrapped);
    optionRefs.current[wrapped]?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open) moveActive(active + 1);
      else openList();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open) moveActive(active - 1);
      else openList(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openList();
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeList();
      }
    }
  }

  function onOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveActive(0);
        break;
      case "End":
        event.preventDefault();
        moveActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(index);
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="language-select-list"
        aria-label={label}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={`inline-flex w-full min-w-40 items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink-1 px-3 py-2 text-left text-sm font-medium text-white transition duration-300 ease-soft hover:bg-ink-2 ${focusRing}`}
      >
        <span className="min-w-0">
          {selected?.label}
          {selected?.note && <span className="text-neutral-500"> {selected.note}</span>}
        </span>
        <CaretDown size={16} weight="bold" aria-hidden="true" className={`shrink-0 transition duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id="language-select-list"
          role="listbox"
          aria-label={label}
          className="absolute left-0 z-30 mt-2 max-h-72 min-w-full overflow-y-auto rounded-lg border border-white/10 bg-ink-2 p-1 shadow-2xl"
        >
          {options.map((option, index) => {
            const isSelected = option.id === value;
            return (
              <li key={option.id} role="none">
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  tabIndex={-1}
                  onClick={() => choose(index)}
                  onKeyDown={(event) => onOptionKeyDown(event, index)}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded px-3 py-2 text-left text-sm transition duration-200 ease-soft ${focusRing} ${
                    active === index ? "bg-ink-3 text-white" : "text-neutral-300 hover:bg-ink-3 hover:text-white"
                  }`}
                >
                  <span>
                    {option.label}
                    {option.note && <span className="text-neutral-500"> {option.note}</span>}
                  </span>
                  {isSelected && <Check size={16} weight="bold" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
