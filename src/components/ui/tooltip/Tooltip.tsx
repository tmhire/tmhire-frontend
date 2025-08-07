import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

// Portal utility for rendering outside the main container
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);

  if (!mounted || !portalRef.current) return null;
  return ReactDOM.createPortal(children, portalRef.current);
};

// Tooltip component for tmhire project
// Renders outside the main container using a portal, styled to match the design theme
// Accepts content, children (trigger), fontSize, and placement props
//
// Usage:
// <Tooltip content="Hello!" fontSize="1.25rem"><button>Hover me</button></Tooltip>

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  fontSize?: string;
  className?: string;
  opacity?: number; // add this
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, fontSize = "0.7rem", className = "", opacity = 1 }) => {
  const [visible, setVisible] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });
    setVisible(true);
  };
  const moveTooltip = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });
  };
  const showTooltipOnFocus = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMousePos({
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + rect.height / 2 + window.scrollY,
      });
      setVisible(true);
    }
  };
  const hideTooltip = () => setVisible(false);

  // Positioning logic
  const getTooltipStyle = () => {
    const base: React.CSSProperties = {
      position: "absolute",
      zIndex: 9999,
      fontSize,
      pointerEvents: "none",
      transition: "opacity 0.15s",
      opacity: visible ? opacity : 0,
      whiteSpace: "pre-line",
      left: mousePos.x + 12,
      top: mousePos.y + 12,
      transform: "translate(0, 0)",
    };
    return base;
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseMove={moveTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltipOnFocus}
        onBlur={hideTooltip}
        style={{ display: "inline-block" }}
      >
        {children}
      </div>
      {visible && (
        <Portal>
          <div
            style={getTooltipStyle()}
            className={`tmhire-tooltip ${className} bg-gray-100 text-black dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-xl`}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  );
};

export default Tooltip;
