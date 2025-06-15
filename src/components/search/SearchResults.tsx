"use client";

import React from 'react';
import { useSearch } from '@/context/SearchContext';
import { Search } from 'lucide-react';

interface SearchResultsProps {
  selectedIndex: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({ selectedIndex }) => {
  const { searchResults, handleResultClick } = useSearch();

  if (searchResults.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <Search className="w-6 h-6 mx-auto mb-2" />
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {searchResults.map((result, index) => (
        <button
          key={`${result.name}-${index}`}
          onClick={() => handleResultClick(result)}
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <div className="flex items-center">
            <span className="text-sm text-gray-700 dark:text-gray-300">{result.name}</span>
            {result.type === 'sub' && result.parentName && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                in {result.parentName}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default SearchResults; 