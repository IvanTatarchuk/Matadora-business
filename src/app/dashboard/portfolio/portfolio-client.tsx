'use client';

import { useState } from 'react';

type PortfolioProject = {
  id: string;
  title: string;
  status: string;
  address: string | null;
  surface_area: number | null;
  created_at: string;
  updated_at: string;
};

export function PortfolioClient({ initialProjects }: { initialProjects: PortfolioProject[] }) {
  const [projects] = useState<PortfolioProject[]>(initialProjects);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Portfolio Projektów</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">{project.title}</h3>
            <p className="text-sm text-gray-600">{project.status}</p>
            {project.address && (
              <p className="text-sm text-gray-500 mt-1">{project.address}</p>
            )}
            {project.surface_area && (
              <p className="text-sm text-gray-500 mt-1">Powierzchnia: {project.surface_area} m²</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Utworzono: {new Date(project.created_at).toLocaleDateString('pl-PL')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
