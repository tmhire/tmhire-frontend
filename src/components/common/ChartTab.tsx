import React, { useState } from "react";

interface ChartTabProps {
  onSelect?: (index: number) => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<"optionOne" | "optionTwo">(
    "optionOne"
  );

  const getButtonClass = (option: "optionOne" | "optionTwo") =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  const handleSelect = (option: "optionOne" | "optionTwo", index: number) => {
    setSelected(option);
    onSelect?.(index);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => handleSelect("optionOne", 0)}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "optionOne"
        )}`}
      >
        Quantity
      </button>

      <button
        onClick={() => handleSelect("optionTwo", 1)}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "optionTwo"
        )}`}
      >
        TMs
      </button>
    </div>
  );
};

export default ChartTab;
