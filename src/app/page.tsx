"use client";

import LandingPage from "./landing/page";

export default function Page() {
  // Root page always shows the landing page
  // No auth checks here - let users see the marketing page
  return <LandingPage />;
}
