"use client";

import dynamic from "next/dynamic";

const OnboardingChecklist = dynamic(
  () =>
    import("./OnboardingChecklist").then((mod) => mod.OnboardingChecklist),
  { ssr: false }
);

export function OnboardingChecklistLoader() {
  return <OnboardingChecklist />;
}
