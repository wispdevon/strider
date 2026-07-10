import { Suspense } from "react";
import ProjectDetail from "@/components/ProjectDetail";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading…</div>}>
      <ProjectDetail slug={slug} />
    </Suspense>
  );
}