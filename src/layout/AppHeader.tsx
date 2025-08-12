"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
// import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useProfile } from "@/hooks/useProfile";
import { Truck } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSearch } from "@/context/SearchContext";
import SearchModal from "@/components/search/SearchModal";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const { profile, loading } = useProfile();
  const { setIsSearchOpen } = useSearch();

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsSearchOpen]);

  return (
    <>
      <header className="sticky top-0 flex w-full bg-white border-gray-200 z-10 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
        <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
          <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
            {/* Company Branding - Mobile */}
            <Link href="/" className="lg:hidden">
              <div className="flex items-center space-x-3">
                <div className="bg-brand-500 rounded-lg p-2 w-9 h-9 flex items-center justify-center">
                  {loading ? (
                    <Truck className="text-white w-6 h-6" />
                  ) : profile?.company ? (
                    <div className="text-white">
                      {profile.company
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </div>
                  ) : (
                    <Truck className="text-white w-6 h-6" />
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-gray-800 dark:text-white/90 text-xl font-semibold">
                    {loading ? "Loading..." : profile?.company || "Company"}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">powered by TM Grid</p>
                </div>
              </div>
            </Link>

            {/* Company Branding - Desktop */}
            <Link href="/" className="hidden lg:flex">
              <div className="flex items-center space-x-3">
                <div className="bg-brand-500 rounded-lg p-2 w-9 h-9 flex items-center justify-center">
                  {loading ? (
                    <Truck className="text-white w-6 h-6" />
                  ) : profile?.company ? (
                    <div className="text-white">
                      {profile.company
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </div>
                  ) : (
                    <Truck className="text-white w-6 h-6" />
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-gray-800 dark:text-white/90 text-lg font-semibold">
                    {loading ? "Loading..." : profile?.company || "Company"}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">powered by TM Grid</p>
                </div>
              </div>
            </Link>

            <button
              onClick={toggleApplicationMenu}
              className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                  fill="currentColor"
                />
              </svg>
            </button>

          </div>
          <div
            className={`${
              isApplicationMenuOpen ? "flex" : "hidden"
            } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
          >
            <div className="hidden lg:block">
              <button onClick={() => setIsSearchOpen(true)} className="relative w-full">
                <div className="relative w-full xl:w-[430px]">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="fill-gray-500 dark:fill-gray-400"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                      />
                    </svg>
                  </span>

                  <input
                    type="text"
                    placeholder="Search or type command..."
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />

                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    <span>⌘</span>
                    <span>K</span>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2 2xsm:gap-3">
              {/* <!-- Dark Mode Toggler --> */}
              <ThemeToggleButton />
              {/* <!-- Dark Mode Toggler --> */}

              {/* <NotificationDropdown /> */}
              {/* <!-- Notification Menu Area --> */}
            </div>
            {/* <!-- User Area --> */}
            <UserDropdown />
          </div>
        </div>
      </header>
      <SearchModal />
    </>
  );
};

export default AppHeader;
