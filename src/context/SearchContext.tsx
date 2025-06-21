"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  name: string;
  path: string;
  type: "main" | "sub";
  parentName?: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode | null;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

type SearchContextType = {
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  searchResults: SearchResult[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (query: string) => void;
  handleResultClick: (result: SearchResult) => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search through main routes
    navItems.forEach((item) => {
      if (item.name.toLowerCase().includes(queryLower)) {
        results.push({
          name: item.name,
          path: item.path || "",
          type: "main",
        });
      }

      // Search through sub-items
      item.subItems?.forEach((subItem) => {
        if (subItem.name.toLowerCase().includes(queryLower)) {
          results.push({
            name: subItem.name,
            path: subItem.path,
            type: "sub",
            parentName: item.name,
          });
        }
      });
    });

    // Search through other items
    // othersItems.forEach((item) => {
    //   if (item.name.toLowerCase().includes(queryLower)) {
    //     results.push({
    //       name: item.name,
    //       path: "",
    //       type: "main",
    //     });
    //   }

    //   item.subItems?.forEach((subItem) => {
    //     if (subItem.name.toLowerCase().includes(queryLower)) {
    //       results.push({
    //         name: subItem.name,
    //         path: subItem.path,
    //         type: "sub",
    //         parentName: item.name,
    //       });
    //     }
    //   });
    // });

    setSearchResults(results);
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.path) {
        router.push(result.path);
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    },
    [router]
  );

  return (
    <SearchContext.Provider
      value={{
        isSearchOpen,
        setIsSearchOpen,
        searchResults,
        searchQuery,
        setSearchQuery,
        handleSearch,
        handleResultClick,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

// Import the navigation items from AppSidebar
const navItems: NavItem[] = [
  {
    icon: null,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: null,
    name: "Plants",
    path: "/plants",
  },
  {
    icon: null,
    name: "Clients",
    path: "/clients",
  },
  {
    icon: null,
    name: "Transit Mixers",
    path: "/transit-mixers",
  },
  {
    icon: null,
    name: "Pumps",
    path: "/pumps",
  },
  {
    icon: null,
    name: "Schedules",
    path: "/schedules",
    subItems: [
      { name: "New Pumping Schedule", path: "/schedules/new", pro: false },
    ],
  },
  {
    icon: null,
    name: "Calendar",
    path: "/calendar",
  },
];

// const othersItems: NavItem[] = [
//   {
//     icon: null,
//     name: "Charts",
//     subItems: [
//       { name: "Line Chart", path: "/line-chart", pro: false },
//       { name: "Bar Chart", path: "/bar-chart", pro: false },
//     ],
//   },
//   {
//     icon: null,
//     name: "UI Elements",
//     subItems: [
//       { name: "Alerts", path: "/alerts", pro: false },
//       { name: "Avatar", path: "/avatars", pro: false },
//       { name: "Badge", path: "/badge", pro: false },
//       { name: "Buttons", path: "/buttons", pro: false },
//       { name: "Images", path: "/images", pro: false },
//       { name: "Videos", path: "/videos", pro: false },
//     ],
//   },
//   {
//     icon: null,
//     name: "Authentication",
//     subItems: [
//       { name: "Sign In", path: "/signin", pro: false },
//       { name: "Sign Up", path: "/signup", pro: false },
//     ],
//   },
// ];
