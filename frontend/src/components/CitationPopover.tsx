"use client";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";

export default function CitationPopover({
    num,
    snippet,
    onMouseEnter,
    onMouseLeave,
  }: {
    num: number;
    snippet: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  }) {
    return (
      <Popover className="relative inline-block">
        <PopoverButton
          as="sup"
          className="cursor-pointer select-none text-blue-600"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          [{num}]
        </PopoverButton>

        <PopoverPanel className="absolute z-10 mt-2 w-72 rounded bg-white p-3 text-sm shadow ring-1 ring-black/10">
          <p className="text-gray-700">{snippet}</p>
        </PopoverPanel>
      </Popover>
    );
  }
