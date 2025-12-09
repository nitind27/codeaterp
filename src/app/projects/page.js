'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectManagerId: '',
    clientName: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    priority: 'medium',
    budget: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadProjects();
    loadEmployees();
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

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      projectManagerId: '',
      clientName: '',
      startDate: '',
      endDate: '',
      status: 'planning',
      priority: 'medium',
      budget: ''
    });
    setIsEditing(false);
    setSelectedProject(null);
  };

  const openNewProjectModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setFormData({
      name: project.name || '',
      description: project.description || '',
      projectManagerId: project.projectManagerId || '',
      clientName: project.clientName || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      budget: project.budget || ''
    });
    setSelectedProject(project);
    setIsEditing(true);
    setShowModal(true);
  };

  const openViewModal = async (project) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedProject(data.project);
        setShowViewModal(true);
      } else {
        toast.error('Failed to load project details');
      }
    } catch (error) {
      toast.error('Error loading project details');
    }
  };

  const openDeleteModal = (project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.projectManagerId) {
      toast.error('Project name and manager are required');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `/api/projects/${selectedProject.id}` : '/api/projects';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isEditing ? 'Project updated successfully!' : 'Project created successfully!');
        setShowModal(false);
        resetForm();
        loadProjects();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Error saving project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Project deleted successfully!');
        setShowDeleteModal(false);
        setSelectedProject(null);
        loadProjects();
      } else {
        toast.error(data.error || 'Failed to delete project');
      }
    } catch (error) {
      toast.error('Error deleting project');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusIcon = (status) => {
    const icons = {
      planning: '📋',
      active: '🚀',
      on_hold: '⏸️',
      completed: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📁';
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.managerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  const canManageProjects = user.role === 'admin' || user.role === 'hr' || user.role === 'project_manager';
  const canDeleteProjects = user.role === 'admin' || user.role === 'hr';

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Projects</h1>
            <p className="text-codeat-gray text-lg">Manage and track your projects</p>
          </div>
          {canManageProjects && (
            <button 
              onClick={openNewProjectModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-4 lg:p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-codeat-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects by name, code, client or manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
              />
            </div>
            {/* Status Filter */}
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {/* Results count */}
          <div className="mt-4 text-codeat-gray text-sm">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 hover:border-codeat-accent/50 transition-all duration-300 shadow-lg hover:shadow-xl card-hover group">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getStatusIcon(project.status)}</span>
                    <h3 className="text-codeat-silver font-bold text-xl group-hover:text-codeat-accent transition line-clamp-1">{project.name}</h3>
                  </div>
                  <p className="text-codeat-accent text-sm font-mono font-semibold">{project.projectCode}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(project.status)} border`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              <p className="text-codeat-gray text-sm mb-4 line-clamp-2 min-h-[2.5rem]">{project.description || 'No description available'}</p>

              {/* Priority Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(project.priority)} border`}>
                  {project.priority?.toUpperCase() || 'MEDIUM'} Priority
                </span>
              </div>

              {/* Project Details */}
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
                {project.clientName && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-codeat-gray flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Client:
                    </span>
                    <span className="text-codeat-silver font-semibold">{project.clientName}</span>
                  </div>
                )}
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
                {project.startDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-codeat-gray flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Timeline:
                    </span>
                    <span className="text-codeat-silver font-semibold text-xs">
                      {formatDate(project.startDate)} - {formatDate(project.endDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-codeat-muted/30">
                <button
                  onClick={() => openViewModal(project)}
                  className="flex-1 px-4 py-2.5 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                {canManageProjects && (
                  <button
                    onClick={() => openEditModal(project)}
                    className="flex-1 px-4 py-2.5 bg-codeat-teal/20 hover:bg-codeat-teal/30 text-codeat-accent rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
                {canDeleteProjects && (
                  <button
                    onClick={() => openDeleteModal(project)}
                    className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 lg:p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-30">📁</div>
            <p className="text-codeat-gray text-xl font-semibold mb-2">
              {searchTerm || statusFilter ? 'No matching projects found' : 'No projects found'}
            </p>
            <p className="text-codeat-gray text-sm">
              {searchTerm || statusFilter 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first project to get started'}
            </p>
            {canManageProjects && !searchTerm && !statusFilter && (
              <button
                onClick={openNewProjectModal}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg"
              >
                Create First Project
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-codeat-silver">
                  {isEditing ? 'Edit Project' : 'Create New Project'}
                </h2>
                <p className="text-codeat-gray text-sm mt-1">
                  {isEditing ? 'Update project details' : 'Fill in the project information'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-codeat-dark rounded-xl transition text-codeat-gray hover:text-codeat-silver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-codeat-silver font-semibold mb-2">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-codeat-silver font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter project description"
                  rows={3}
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition resize-none"
                />
              </div>

              {/* Project Manager & Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">
                    Project Manager <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="projectManagerId"
                    value={formData.projectManagerId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select Manager</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Client Name</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder="Enter client name"
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  />
                </div>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
                  >
                    <option value="planning">📋 Planning</option>
                    <option value="active">🚀 Active</option>
                    <option value="on_hold">⏸️ On Hold</option>
                    <option value="completed">✅ Completed</option>
                    <option value="cancelled">❌ Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-codeat-silver font-semibold mb-2">Budget (₹)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="Enter project budget"
                  min="0"
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-codeat-muted/30">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditing ? 'Update Project' : 'Create Project'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Project Modal */}
      {showViewModal && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getStatusIcon(selectedProject.status)}</span>
                <div>
                  <h2 className="text-2xl font-bold text-codeat-silver">{selectedProject.name}</h2>
                  <p className="text-codeat-accent font-mono text-sm">{selectedProject.projectCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-codeat-dark rounded-xl transition text-codeat-gray hover:text-codeat-silver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status & Priority */}
              <div className="flex flex-wrap gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedProject.status)} border`}>
                  {selectedProject.status?.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPriorityColor(selectedProject.priority)} border`}>
                  {selectedProject.priority?.toUpperCase()} Priority
                </span>
              </div>

              {/* Description */}
              <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                <h3 className="text-codeat-accent font-semibold mb-2">Description</h3>
                <p className="text-codeat-gray">{selectedProject.description || 'No description available'}</p>
              </div>

              {/* Project Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">Project Manager</h3>
                  <p className="text-codeat-silver font-semibold">{selectedProject.managerName}</p>
                </div>
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">Client</h3>
                  <p className="text-codeat-silver font-semibold">{selectedProject.clientName || 'Not specified'}</p>
                </div>
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">Start Date</h3>
                  <p className="text-codeat-silver font-semibold">{formatDate(selectedProject.startDate)}</p>
                </div>
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">End Date</h3>
                  <p className="text-codeat-silver font-semibold">{formatDate(selectedProject.endDate)}</p>
                </div>
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">Budget</h3>
                  <p className="text-codeat-silver font-semibold">{formatCurrency(selectedProject.budget)}</p>
                </div>
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-gray text-sm uppercase tracking-wide mb-1">Created</h3>
                  <p className="text-codeat-silver font-semibold">{formatDate(selectedProject.createdAt)}</p>
                </div>
              </div>

              {/* Team Members */}
              {selectedProject.members && selectedProject.members.length > 0 && (
                <div className="bg-codeat-dark rounded-xl p-4 border border-codeat-muted/30">
                  <h3 className="text-codeat-accent font-semibold mb-4">Team Members ({selectedProject.members.length})</h3>
                  <div className="space-y-3">
                    {selectedProject.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-codeat-mid rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-codeat-teal to-codeat-accent rounded-full flex items-center justify-center text-white font-bold">
                            {member.employeeName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-codeat-silver font-semibold">{member.employeeName}</p>
                            <p className="text-codeat-gray text-sm">{member.designation || 'Team Member'}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-codeat-teal/20 text-codeat-accent text-xs rounded-full font-medium">
                          {member.role || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-codeat-muted/30">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-6 py-3 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 font-medium"
                >
                  Close
                </button>
                {canManageProjects && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedProject);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Project
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-codeat-silver mb-2">Delete Project?</h2>
              <p className="text-codeat-gray mb-2">Are you sure you want to delete</p>
              <p className="text-codeat-accent font-semibold mb-4">"{selectedProject.name}"?</p>
              <p className="text-red-400 text-sm mb-6">This action cannot be undone. All tasks and data associated with this project will be permanently deleted.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
