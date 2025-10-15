"use client";

import { useEffect } from "react";
import { useAuthContext } from "@/components/auth-provider";
import Dashboard from "@/components/ui/dashboard";
import LandingPage from "./landing/page";

export default function Page() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}
