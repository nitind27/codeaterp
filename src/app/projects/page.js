'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setProjects(data.projects || []);
      } else {
        toast.error(data.error || 'Failed to load projects');
      }
    } catch (error) {
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-blue-500/20 text-blue-400',
      active: 'bg-green-500/20 text-green-400',
      on_hold: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-purple-500/20 text-purple-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Projects</h1>
            <p className="text-codeat-gray text-lg">Manage and track your projects</p>
          </div>
          {(user.role === 'admin' || user.role === 'hr' || user.role === 'project_manager') && (
            <button className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          )}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 hover:border-codeat-accent/50 transition-all duration-300 shadow-lg hover:shadow-xl card-hover group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-codeat-silver font-bold text-xl mb-2 group-hover:text-codeat-accent transition">{project.name}</h3>
                  <p className="text-codeat-accent text-sm font-mono font-semibold">{project.projectCode}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(project.status)} border`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-codeat-gray text-sm mb-6 line-clamp-2 min-h-[2.5rem]">{project.description || 'No description available'}</p>
              <div className="space-y-3 pt-4 border-t border-codeat-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-codeat-gray flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Manager:
                  </span>
                  <span className="text-codeat-silver font-semibold">{project.managerName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-codeat-gray flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Tasks:
                  </span>
                  <span className="text-codeat-silver font-semibold">{project.taskCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-codeat-gray flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Team:
                  </span>
                  <span className="text-codeat-silver font-semibold">{project.memberCount || 0} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 lg:p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-30">📁</div>
            <p className="text-codeat-gray text-xl font-semibold mb-2">No projects found</p>
            <p className="text-codeat-gray text-sm">Create your first project to get started</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

