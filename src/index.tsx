import "./styles.css";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useLayoutEffect } from "react";

// @ts-expect-error This is fancy Vite-specific import syntax
import chart from "./fingering-chart.svg?raw";

// Parse SVG and create ID to label mapping
const parser = new DOMParser();
const svgDoc = parser.parseFromString(chart, "image/svg+xml");
const idToLabel = new Map<string, string>();
svgDoc.querySelectorAll("[id]").forEach((element) => {
  const label = element.getAttribute("inkscape:label");
  if (label) {
    // Aesthetic improvement: insert soft hyphen in "Thumbplate"
    // (Hyphen should only be visible if the word breaks)
    idToLabel.set(element.id, label.replace("Thumbplate", "Thumb\u00ADplate"));
  }
});

const pairs = {
  b: "b-half",
  a: "a-half",
  g: "g-half",
  e: "e-half",
  d: "d-half",
};

const leftHandButtons = [
  "octave-3",
  "octave-2",
  "octave-1",
  "thumbplate",
  "b",
  "b-half",
  "bd",
  "left-c-d-trill",
  "a",
  "bd2",
  "a-half",
  "left-c-c-sharp-trill",
  "g",
  "g-half",
  "left-g-sharp",
  "left-f",
  "left-e-flat",
  "low-b",
  "low-b-flat",
];

const rightHandButtons = [
  "right-a-sharp",
  "right-g-sharp",
  "f-sharp",
  "right-c-d-trill",
  "e",
  "e-half",
  "right-f",
  "d",
  "d-half",
  "banana",
  "right-c",
  "right-c-sharp",
  "right-eb",
  "f-resonance",
];

interface FingeringChartProps {
  blackIds: Set<string>;
  redIds: Set<string>;
  activeColor: "black" | "red";
  onIdsChange: (color: "black" | "red", ids: Set<string>) => void;
}

function FingeringChart({
  blackIds,
  redIds,
  activeColor,
  onIdsChange,
}: FingeringChartProps) {
  const [originalColors, setOriginalColors] = useState(new Map());

  // Initial SVG setup
  useLayoutEffect(() => {
    const container = document.getElementById("svgContainer");
    if (!container) return;

    container.textContent = ""; // Clear existing content
    container.insertAdjacentHTML("afterbegin", chart);

    const svg = container.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Store original colors
    const colors = new Map();
    container.querySelectorAll("svg *").forEach((element) => {
      if (element.id) {
        colors.set(
          element.id,
          element.style.fill || getComputedStyle(element).fill
        );
      }
    });
    setOriginalColors(colors);
  }, []);

  // Update SVG based on state changes
  useEffect(() => {
    // Reset all elements to original colors and opacity first
    originalColors.forEach((color, id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.fill = color;
        element.style.opacity = "1";
      }
    });

    // Apply black active states
    blackIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.fill = "#060606";
      }
      if (id in pairs) {
        const pairedId = pairs[id as keyof typeof pairs];
        const pairedElement = document.getElementById(pairedId);
        // Only hide paired element if it's not marked in either color
        if (pairedElement && !blackIds.has(pairedId) && !redIds.has(pairedId)) {
          pairedElement.style.opacity = "0";
        }
      }
    });

    // Apply red active states
    redIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.fill = "#ff0000";
      }
      if (id in pairs) {
        const pairedId = pairs[id as keyof typeof pairs];
        const pairedElement = document.getElementById(pairedId);
        // Only hide paired element if it's not marked in either color
        if (pairedElement && !blackIds.has(pairedId) && !redIds.has(pairedId)) {
          pairedElement.style.opacity = "0";
        }
      }
    });
  }, [blackIds, redIds, originalColors]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const id = target.id;
    if (!id || id === "separator" || id === "svg1" || id === "svgContainer")
      return;

    // Determine which set this ID belongs to
    const isInBlack = blackIds.has(id);
    const isInRed = redIds.has(id);

    if (isInBlack || isInRed) {
      // If clicking with the same color as current, turn off
      if (
        (isInBlack && activeColor === "black") ||
        (isInRed && activeColor === "red")
      ) {
        const currentSet = isInBlack ? blackIds : redIds;
        const newSet = new Set(currentSet);
        newSet.delete(id);
        onIdsChange(isInBlack ? "black" : "red", newSet);
      } else {
        // Switch to the other color directly
        const oldSet = new Set(isInBlack ? blackIds : redIds);
        const newSet = new Set(isInBlack ? redIds : blackIds);
        oldSet.delete(id);
        newSet.add(id);
        onIdsChange(isInBlack ? "black" : "red", oldSet);
        onIdsChange(isInBlack ? "red" : "black", newSet);
      }
    } else {
      // Turn on in active color's set (unchanged)
      const activeSet = activeColor === "black" ? blackIds : redIds;
      const newSet = new Set(activeSet);
      newSet.add(id);

      // Handle paired keys
      const isPairedKey = Object.values(pairs).includes(id);
      const mainKey = isPairedKey
        ? Object.entries(pairs).find(([_, half]) => half === id)?.[0]
        : null;

      if (isPairedKey && mainKey) {
        newSet.delete(mainKey);
      } else if (pairs[id as keyof typeof pairs]) {
        newSet.delete(pairs[id as keyof typeof pairs]);
      }

      onIdsChange(activeColor, newSet);
    }
  };

  return (
    <div
      id="svgContainer"
      onClick={handleClick}
      onDoubleClick={(e) => e.preventDefault()}
      className="fingering-chart"
    />
  );
}

function ButtonList({
  buttons,
  blackIds,
  redIds,
}: {
  buttons: string[];
  blackIds: Set<string>;
  redIds: Set<string>;
}) {
  const activeButtons = buttons
    .filter((id) => blackIds.has(id) || redIds.has(id))
    .map((id) => ({
      id,
      label: idToLabel.get(id) || id,
      color: blackIds.has(id) ? "black" : "red",
    }));

  if (activeButtons.length === 0) {
    return <div className="button-list__empty">None</div>;
  }

  return (
    <ul className="button-list" lang="en">
      {activeButtons.map(({ id, label, color }) => (
        <li
          key={id}
          className={`button-list__item button-list__item--${color}`}
        >
          <span className="button-list__bullet">•</span>
          {label}
        </li>
      ))}
    </ul>
  );
}

function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (!target.closest("#exportMenu") && !target.closest("button")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const copyURL = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        alert("URL copied to clipboard!");
        setIsOpen(false);
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
        alert("Failed to copy URL");
      });
  };

  const downloadSVG = () => {
    const svg = document.querySelector("#svgContainer svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "oboe-fingering.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="export-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="export-menu__trigger"
      >
        Share ▾
      </button>
      {isOpen && (
        <div id="exportMenu" className="export-menu__dropdown">
          <button onClick={copyURL} className="export-menu__option">
            Copy URL
          </button>
          <button onClick={downloadSVG} className="export-menu__option">
            Download SVG
          </button>
        </div>
      )}
    </div>
  );
}

function ColorPicker({
  activeColor,
  onColorChange,
}: {
  activeColor: "black" | "red";
  onColorChange: (color: "black" | "red") => void;
}) {
  return (
    <div className="color-picker">
      <button
        className={`color-picker__button ${activeColor === "black" ? "color-picker__button--active" : ""}`}
        onClick={() => onColorChange("black")}
        aria-label="Use black color"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button
        className={`color-picker__button ${activeColor === "red" ? "color-picker__button--active" : ""}`}
        onClick={() => onColorChange("red")}
        aria-label="Use red color"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}

function FingeringChartPage() {
  const [activeColor, setActiveColor] = useState<"black" | "red">("black");
  const [blackIds, setBlackIds] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return new Set(urlParams.get("active")?.split(",").filter(Boolean) || []);
  });
  const [redIds, setRedIds] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return new Set(urlParams.get("red")?.split(",").filter(Boolean) || []);
  });

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (blackIds.size > 0) {
      newParams.set("active", Array.from(blackIds).join(","));
    }
    if (redIds.size > 0) {
      newParams.set("red", Array.from(redIds).join(","));
    }
    const newUrl = `${window.location.pathname}${
      newParams.toString() ? "?" + newParams.toString() : ""
    }`;
    window.history.replaceState({}, "", newUrl);
  }, [blackIds, redIds]);

  const handleIdsChange = (color: "black" | "red", ids: Set<string>) => {
    if (color === "black") {
      setBlackIds(ids);
    } else {
      setRedIds(ids);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Oboe</h1>
        <div className="page__controls">
          <ColorPicker
            activeColor={activeColor}
            onColorChange={setActiveColor}
          />
          <ExportMenu />
        </div>
      </div>

      <div className="page__content">
        <div className="page__sidebar page__sidebar--right">
          <h2 className="page__sidebar-title">Right hand</h2>
          <ButtonList
            buttons={rightHandButtons}
            blackIds={blackIds}
            redIds={redIds}
          />
        </div>

        <FingeringChart
          blackIds={blackIds}
          redIds={redIds}
          activeColor={activeColor}
          onIdsChange={handleIdsChange}
        />

        <div className="page__sidebar page__sidebar--left">
          <h2 className="page__sidebar-title">Left hand</h2>
          <ButtonList
            buttons={leftHandButtons}
            blackIds={blackIds}
            redIds={redIds}
          />
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<FingeringChartPage />);
