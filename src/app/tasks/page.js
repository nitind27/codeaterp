'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadTasks();
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

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-500/20 text-gray-400',
      in_progress: 'bg-blue-500/20 text-blue-400',
      review: 'bg-yellow-500/20 text-yellow-400',
      done: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Tasks</h1>
          <p className="text-codeat-gray text-lg">Manage your assigned tasks and track progress</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {['all', 'todo', 'in_progress', 'review', 'done'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                filter === status
                  ? 'bg-gradient-to-r from-codeat-accent to-codeat-teal text-white shadow-lg shadow-codeat-accent/30 scale-105'
                  : 'bg-codeat-mid text-codeat-silver hover:bg-codeat-muted border border-codeat-muted/30 hover:scale-105 active:scale-95'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
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
                      ✅
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
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold ${getStatusColor(task.status)} border`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      task.status === 'done' ? 'bg-green-400' :
                      task.status === 'in_progress' ? 'bg-blue-400' :
                      task.status === 'review' ? 'bg-yellow-400' :
                      'bg-gray-400'
                    }`}></span>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 lg:p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-30">✅</div>
            <p className="text-codeat-gray text-xl font-semibold mb-2">No tasks found</p>
            <p className="text-codeat-gray text-sm">Tasks assigned to you will appear here</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

