"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSearch } from '@/context/SearchContext';
import { Search } from 'lucide-react';
import SearchResults from './SearchResults';
import { Modal } from '@/components/ui/modal';

const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, handleSearch, searchResults, handleResultClick } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    // Reset selected index when search results change
    setSelectedIndex(-1);
  }, [searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsSearchOpen(false);
        break;
    }
  };

  return (
    <Modal
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      className="max-w-2xl"
    >
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg">
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 px-3 py-2 ml-2 text-sm bg-transparent border-none focus:outline-none dark:text-white"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <SearchResults selectedIndex={selectedIndex} />
        </div>
      </div>
    </Modal>
  );
};

export default SearchModal; 