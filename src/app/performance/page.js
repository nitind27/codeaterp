'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthFetch } from '@/hooks/useAuthFetch';

export default function PerformancePage() {
    const [activeTab, setActiveTab] = useState('reviews');
    const [reviews, setReviews] = useState([]);
    const [goals, setGoals] = useState([]);
    const [kpis, setKpis] = useState([]);
    const [loading, setLoading] = useState(true);
    const authFetch = useAuthFetch();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'reviews') {
                const reviewsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/performance/reviews`);
                if (reviewsRes.ok) {
                    const data = await reviewsRes.json();
                    setReviews(data.reviews || []);
                }
            } else if (activeTab === 'goals') {
                const goalsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/performance/goals`);
                if (goalsRes.ok) {
                    const data = await goalsRes.json();
                    setGoals(data.goals || []);
                }
            } else if (activeTab === 'kpis') {
                const kpisRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/performance/kpis`);
                if (kpisRes.ok) {
                    const data = await kpisRes.json();
                    setKpis(data.kpis || []);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'reviews', label: 'Performance Reviews', icon: '📊' },
        { id: 'goals', label: 'Goals & Objectives', icon: '🎯' },
        { id: 'kpis', label: 'KPIs', icon: '📈' },
        { id: 'competencies', label: 'Competencies', icon: '🧠' }
    ];

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-codeat-dark mb-2">Performance Management</h1>
                    <p className="text-codeat-gray">Track employee performance, goals, and development</p>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-6">
                    <div className="border-b border-codeat-mid">
                        <nav className="flex space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                        activeTab === tab.id
                                            ? 'border-codeat-accent text-codeat-accent'
                                            : 'border-transparent text-codeat-gray hover:text-codeat-silver hover:border-codeat-gray'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-lg shadow-sm border border-codeat-mid">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-codeat-accent mx-auto"></div>
                            <p className="mt-4 text-codeat-gray">Loading...</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            {activeTab === 'reviews' && <ReviewsTab reviews={reviews} onRefresh={loadData} />}
                            {activeTab === 'goals' && <GoalsTab goals={goals} onRefresh={loadData} />}
                            {activeTab === 'kpis' && <KPIsTab kpis={kpis} onRefresh={loadData} />}
                            {activeTab === 'competencies' && <CompetenciesTab onRefresh={loadData} />}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function ReviewsTab({ reviews, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Performance Reviews</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New Review
                </button>
            </div>

            {reviews.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Performance Reviews</h3>
                    <p className="text-codeat-gray mb-4">Start by creating your first performance review</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Create First Review
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-medium text-codeat-dark">
                                        {review.first_name} {review.last_name}
                                    </h3>
                                    <p className="text-sm text-codeat-gray">{review.cycle_name}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    review.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    review.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {review.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-codeat-gray">Self Rating:</span>
                                    <span className="ml-2 font-medium">{review.self_rating || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-codeat-gray">Reviewer Rating:</span>
                                    <span className="ml-2 font-medium">{review.reviewer_rating || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-codeat-gray">Overall Rating:</span>
                                    <span className="ml-2 font-medium">{review.overall_rating || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-codeat-gray">Due Date:</span>
                                    <span className="ml-2 font-medium">
                                        {review.next_review_date ? new Date(review.next_review_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function GoalsTab({ goals, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Goals & Objectives</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New Goal
                </button>
            </div>

            {goals.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Goals Set</h3>
                    <p className="text-codeat-gray mb-4">Create goals to track employee objectives and progress</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Create First Goal
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {goals.map((goal) => (
                        <div key={goal.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-medium text-codeat-dark mb-1">{goal.title}</h3>
                                    <p className="text-sm text-codeat-gray mb-2">{goal.description}</p>
                                    <div className="flex items-center space-x-4 text-xs">
                                        <span className="text-codeat-gray">
                                            {goal.first_name} {goal.last_name}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full ${
                                            goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                                            goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {goal.priority.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full ${
                                            goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {goal.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-codeat-accent">
                                        {goal.progress_percentage || 0}%
                                    </div>
                                    <div className="text-xs text-codeat-gray">Complete</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-codeat-mid rounded-full h-2 mb-2">
                                <div
                                    className="bg-codeat-accent h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${goal.progress_percentage || 0}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between text-sm text-codeat-gray">
                                <span>Due: {goal.due_date ? new Date(goal.due_date).toLocaleDateString() : 'N/A'}</span>
                                <span>{goal.update_count || 0} updates</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function KPIsTab({ kpis, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Key Performance Indicators</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New KPI
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">KPIs Coming Soon</h3>
                <p className="text-codeat-gray">Track and measure key performance indicators</p>
            </div>
        </div>
    );
}

function CompetenciesTab({ onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Employee Competencies</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Competency
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Competencies Coming Soon</h3>
                <p className="text-codeat-gray">Manage employee skills and competencies</p>
            </div>
        </div>
    );
}
