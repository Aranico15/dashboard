"use client"
import React from "react"
import Sidebar from "./Sidebar"
import { useSidebar } from "./SidebarContext"

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 relative z-0 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>
    </div>
  );
}
