'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthFetch } from '@/hooks/useAuthFetch';

export default function TrainingPage() {
    const [activeTab, setActiveTab] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const authFetch = useAuthFetch();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'courses') {
                const coursesRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/training/courses`);
                if (coursesRes.ok) {
                    const data = await coursesRes.json();
                    setCourses(data.courses || []);
                }
            } else if (activeTab === 'certifications') {
                const certsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/training/certifications`);
                if (certsRes.ok) {
                    const data = await certsRes.json();
                    setCertifications(data.certifications || []);
                }
            } else if (activeTab === 'skills') {
                const skillsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/training/skills`);
                if (skillsRes.ok) {
                    const data = await skillsRes.json();
                    setSkills(data.skills || []);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'courses', label: 'Training Courses', icon: '📚' },
        { id: 'certifications', label: 'Certifications', icon: '🏆' },
        { id: 'skills', label: 'Skills Inventory', icon: '🛠️' },
        { id: 'sessions', label: 'Training Sessions', icon: '📅' }
    ];

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-codeat-dark mb-2">Training & Development</h1>
                    <p className="text-codeat-gray">Manage employee training, certifications, and skill development</p>
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
                            {activeTab === 'courses' && <CoursesTab courses={courses} onRefresh={loadData} />}
                            {activeTab === 'certifications' && <CertificationsTab certifications={certifications} onRefresh={loadData} />}
                            {activeTab === 'skills' && <SkillsTab skills={skills} onRefresh={loadData} />}
                            {activeTab === 'sessions' && <SessionsTab onRefresh={loadData} />}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function CoursesTab({ courses, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Training Courses</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New Course
                </button>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Training Courses</h3>
                    <p className="text-codeat-gray mb-4">Create your first training course to get started</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Create First Course
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <div key={course.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-medium text-codeat-dark mb-1">{course.title}</h3>
                                    <p className="text-sm text-codeat-gray mb-2 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center space-x-2 text-xs">
                                        <span className={`px-2 py-1 rounded-full ${
                                            course.status === 'active' ? 'bg-green-100 text-green-800' :
                                            course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {course.status.toUpperCase()}
                                        </span>
                                        <span className="text-codeat-gray">{course.course_type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {course.duration_hours && (
                                    <div className="flex justify-between">
                                        <span className="text-codeat-gray">Duration:</span>
                                        <span>{course.duration_hours} hours</span>
                                    </div>
                                )}
                                {course.instructor && (
                                    <div className="flex justify-between">
                                        <span className="text-codeat-gray">Instructor:</span>
                                        <span>{course.instructor}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-codeat-gray">Enrolled:</span>
                                    <span>{course.enrolled_count || 0}/{course.max_participants || '∞'}</span>
                                </div>
                                {course.cost > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-codeat-gray">Cost:</span>
                                        <span>₹{course.cost}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex space-x-2">
                                <button className="flex-1 bg-codeat-accent text-white text-sm py-2 rounded hover:bg-opacity-90 transition-colors">
                                    Enroll
                                </button>
                                <button className="px-3 py-2 text-codeat-accent border border-codeat-accent rounded text-sm hover:bg-codeat-accent hover:text-white transition-colors">
                                    View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CertificationsTab({ certifications, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Certifications</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Certification
                </button>
            </div>

            {certifications.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Certifications</h3>
                    <p className="text-codeat-gray mb-4">Add employee certifications to track professional development</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Add First Certification
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {certifications.map((cert) => (
                        <div key={cert.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-medium text-codeat-dark mb-1">{cert.certification_name}</h3>
                                    <p className="text-sm text-codeat-gray mb-2">
                                        {cert.first_name} {cert.last_name} • {cert.issuing_organization}
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs">
                                        <span className={`px-2 py-1 rounded-full ${
                                            cert.status === 'active' ? 'bg-green-100 text-green-800' :
                                            cert.status === 'expired' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {cert.status.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full ${
                                            cert.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                                            cert.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {cert.verification_status}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {cert.days_until_expiry !== null && cert.days_until_expiry <= 30 && (
                                        <div className="text-xs text-red-600 font-medium mb-1">
                                            Expires in {cert.days_until_expiry} days
                                        </div>
                                    )}
                                    <div className="text-sm text-codeat-gray">
                                        Issued: {new Date(cert.issue_date).toLocaleDateString()}
                                    </div>
                                    {cert.expiry_date && (
                                        <div className="text-sm text-codeat-gray">
                                            Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {cert.certification_number && (
                                <div className="text-sm mb-2">
                                    <span className="text-codeat-gray">Certificate No:</span>
                                    <span className="ml-2 font-mono">{cert.certification_number}</span>
                                </div>
                            )}

                            {cert.skills_acquired && (
                                <div className="text-sm">
                                    <span className="text-codeat-gray">Skills:</span>
                                    <span className="ml-2">{cert.skills_acquired}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SkillsTab({ skills, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Skills Inventory</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Skill
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">🛠️</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Skills Management Coming Soon</h3>
                <p className="text-codeat-gray">Track and manage employee skills and competencies</p>
            </div>
        </div>
    );
}

function SessionsTab({ onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Training Sessions</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Schedule Session
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Training Sessions Coming Soon</h3>
                <p className="text-codeat-gray">Schedule and manage training sessions</p>
            </div>
        </div>
    );
}
