'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    estimatedHours: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadTasks();
    
    // Load employees and projects for admin/HR/PM
    if (['admin', 'hr', 'project_manager'].includes(parsedUser.role)) {
      loadEmployees();
      loadProjects();
    }
  }, []);

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        toast.error(data.error || 'Failed to load tasks');
      }
    } catch (error) {
      toast.error('Error loading tasks');
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

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      projectId: '',
      assignedTo: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      estimatedHours: ''
    });
    setIsEditing(false);
    setSelectedTask(null);
  };

  const openNewTaskModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      projectId: task.projectId || '',
      assignedTo: task.assignedTo || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      estimatedHours: task.estimatedHours || ''
    });
    setSelectedTask(task);
    setIsEditing(true);
    setShowModal(true);
  };

  const openStatusModal = (task) => {
    setSelectedTask(task);
    setShowStatusModal(true);
  };

  const openDeleteModal = (task) => {
    setSelectedTask(task);
    setShowDeleteModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error('Task title is required');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `/api/tasks/${selectedTask.id}` : '/api/tasks';
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
        toast.success(isEditing ? 'Task updated successfully!' : 'Task created successfully!');
        setShowModal(false);
        resetForm();
        loadTasks();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedTask) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task status updated!');
        setShowStatusModal(false);
        setSelectedTask(null);
        loadTasks();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task deleted successfully!');
        setShowDeleteModal(false);
        setSelectedTask(null);
        loadTasks();
      } else {
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      toast.error('Error deleting task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  if (loading || !user) {
    return <LogoLoader />;
  }

  const canManageTasks = user.role === 'admin' || user.role === 'hr' || user.role === 'project_manager';
  const isEmployee = user.role === 'employee' || user.role === 'intern';

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      done: 'bg-green-500/20 text-green-400 border-green-500/30',
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
      todo: '📋',
      in_progress: '🚀',
      review: '👀',
      done: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Tasks</h1>
            <p className="text-codeat-gray text-lg">
              {canManageTasks ? 'Manage and assign tasks to team members' : 'Manage your assigned tasks and track progress'}
            </p>
          </div>
          {canManageTasks && (
            <button 
              onClick={openNewTaskModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {['all', 'todo', 'in_progress', 'review', 'done'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                filter === status
                  ? 'bg-gradient-to-r from-codeat-teal to-codeat-accent text-white shadow-lg shadow-codeat-teal/30 scale-105'
                  : 'bg-codeat-mid text-codeat-silver hover:bg-codeat-muted border border-codeat-muted/30 hover:scale-105 active:scale-95'
              }`}
            >
              {status === 'all' ? 'ALL' : status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', count: tasks.length, color: 'from-purple-500 to-purple-600' },
            { label: 'To Do', count: tasks.filter(t => t.status === 'todo').length, color: 'from-gray-500 to-gray-600' },
            { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length, color: 'from-blue-500 to-blue-600' },
            { label: 'Review', count: tasks.filter(t => t.status === 'review').length, color: 'from-yellow-500 to-yellow-600' },
            { label: 'Done', count: tasks.filter(t => t.status === 'done').length, color: 'from-green-500 to-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-4 text-center">
              <div className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.count}
              </div>
              <div className="text-codeat-gray text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 hover:border-codeat-accent/50 transition-all duration-300 shadow-lg hover:shadow-xl card-hover">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-codeat-accent to-codeat-teal flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-codeat-silver font-bold text-xl mb-2">{task.title}</h3>
                      <p className="text-codeat-gray text-sm mb-4 leading-relaxed">{task.description || 'No description provided'}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {task.projectName && (
                          <div className="flex items-center gap-2 text-codeat-gray">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-codeat-silver font-medium">{task.projectName}</span>
                          </div>
                        )}
                        {task.assignedName && (
                          <div className="flex items-center gap-2 text-codeat-gray">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-codeat-silver font-medium">{task.assignedName}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-2 text-codeat-gray">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-codeat-silver font-medium">
                              {new Date(task.dueDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {task.estimatedHours && (
                          <div className="flex items-center gap-2 text-codeat-gray">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-codeat-silver font-medium">{task.estimatedHours}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold ${getStatusColor(task.status)} border`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      task.status === 'done' ? 'bg-green-400' :
                      task.status === 'in_progress' ? 'bg-blue-400' :
                      task.status === 'review' ? 'bg-yellow-400' :
                      task.status === 'cancelled' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></span>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getPriorityColor(task.priority)} border`}>
                    {task.priority?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-codeat-muted/30">
                {/* Update Status Button - for employees */}
                <button
                  onClick={() => openStatusModal(task)}
                  className="flex-1 px-4 py-2.5 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Status
                </button>
                
                {canManageTasks && (
                  <>
                    <button
                      onClick={() => openEditModal(task)}
                      className="flex-1 px-4 py-2.5 bg-codeat-teal/20 hover:bg-codeat-teal/30 text-codeat-accent rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(task)}
                      className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 lg:p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-30">✅</div>
            <p className="text-codeat-gray text-xl font-semibold mb-2">No tasks found</p>
            <p className="text-codeat-gray text-sm">
              {canManageTasks ? 'Create your first task to get started' : 'Tasks assigned to you will appear here'}
            </p>
            {canManageTasks && (
              <button
                onClick={openNewTaskModal}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg"
              >
                Create First Task
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-codeat-silver">
                  {isEditing ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p className="text-codeat-gray text-sm mt-1">
                  {isEditing ? 'Update task details' : 'Fill in the task information'}
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
              {/* Task Title */}
              <div>
                <label className="block text-codeat-silver font-semibold mb-2">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
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
                  placeholder="Enter task description"
                  rows={3}
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition resize-none"
                />
              </div>

              {/* Project & Assign To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Project</label>
                  <select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">
                    Assign To <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
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
                    <option value="todo">📋 To Do</option>
                    <option value="in_progress">🚀 In Progress</option>
                    <option value="review">👀 Review</option>
                    <option value="done">✅ Done</option>
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

              {/* Due Date & Estimated Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver font-semibold mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={handleInputChange}
                    placeholder="e.g. 8"
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/30 rounded-xl text-codeat-silver placeholder-codeat-gray focus:outline-none focus:border-codeat-accent/50 focus:ring-2 focus:ring-codeat-accent/20 transition"
                  />
                </div>
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
                      {isEditing ? 'Update Task' : 'Create Task'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-codeat-muted/30 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-codeat-silver">Update Task Status</h2>
                <p className="text-codeat-gray text-sm mt-1 line-clamp-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2 hover:bg-codeat-dark rounded-xl transition text-codeat-gray hover:text-codeat-silver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              {[
                { value: 'todo', label: 'To Do', icon: '📋', color: 'hover:bg-gray-500/20' },
                { value: 'in_progress', label: 'In Progress', icon: '🚀', color: 'hover:bg-blue-500/20' },
                { value: 'review', label: 'Review', icon: '👀', color: 'hover:bg-yellow-500/20' },
                { value: 'done', label: 'Done', icon: '✅', color: 'hover:bg-green-500/20' },
                { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'hover:bg-red-500/20' },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusUpdate(status.value)}
                  disabled={submitting || selectedTask.status === status.value}
                  className={`w-full px-4 py-3 bg-codeat-dark ${status.color} text-codeat-silver rounded-xl transition-all duration-200 text-left font-medium flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedTask.status === status.value ? 'ring-2 ring-codeat-accent' : ''
                  }`}
                >
                  <span className="text-xl">{status.icon}</span>
                  <span>{status.label}</span>
                  {selectedTask.status === status.value && (
                    <span className="ml-auto text-codeat-accent text-sm">Current</span>
                  )}
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full px-6 py-3 bg-codeat-dark hover:bg-codeat-muted/30 text-codeat-silver rounded-xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-codeat-silver mb-2">Delete Task?</h2>
              <p className="text-codeat-gray mb-2">Are you sure you want to delete</p>
              <p className="text-codeat-accent font-semibold mb-4">"{selectedTask.title}"?</p>
              <p className="text-red-400 text-sm mb-6">This action cannot be undone.</p>
              
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
                      Delete Task
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
