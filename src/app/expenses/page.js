'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthFetch } from '@/hooks/useAuthFetch';

export default function ExpensesPage() {
    const [activeTab, setActiveTab] = useState('claims');
    const [expenseClaims, setExpenseClaims] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const authFetch = useAuthFetch();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'claims') {
                const claimsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses`);
                if (claimsRes.ok) {
                    const data = await claimsRes.json();
                    setExpenseClaims(data.expenses || []);
                }
            } else if (activeTab === 'categories') {
                const categoriesRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/categories`);
                if (categoriesRes.ok) {
                    const data = await categoriesRes.json();
                    setCategories(data.categories || []);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'claims', label: 'Expense Claims', icon: '💰' },
        { id: 'categories', label: 'Categories', icon: '📂' },
        { id: 'reports', label: 'Reports', icon: '📊' }
    ];

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-codeat-dark mb-2">Expense Management</h1>
                    <p className="text-codeat-gray">Manage employee expense claims and reimbursements</p>
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
                            {activeTab === 'claims' && <ClaimsTab claims={expenseClaims} onRefresh={loadData} />}
                            {activeTab === 'categories' && <CategoriesTab categories={categories} onRefresh={loadData} />}
                            {activeTab === 'reports' && <ReportsTab onRefresh={loadData} />}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function ClaimsTab({ claims, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Expense Claims</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New Claim
                </button>
            </div>

            {claims.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Expense Claims</h3>
                    <p className="text-codeat-gray mb-4">Create your first expense claim to get started</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Create First Claim
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {claims.map((claim) => (
                        <div key={claim.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-medium text-codeat-dark mb-1">{claim.title}</h3>
                                    <p className="text-sm text-codeat-gray mb-2">
                                        {claim.first_name} {claim.last_name} • {claim.department}
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs mb-2">
                                        <span className={`px-2 py-1 rounded-full ${
                                            claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            claim.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                            claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            claim.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {claim.status.toUpperCase()}
                                        </span>
                                        <span className="text-codeat-gray">
                                            {new Date(claim.submitted_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-codeat-accent">
                                        ₹{claim.total_amount}
                                    </div>
                                    <div className="text-xs text-codeat-gray">
                                        {claim.item_count} items • {claim.attachment_count} receipts
                                    </div>
                                </div>
                            </div>

                            {claim.description && (
                                <p className="text-sm text-codeat-gray mb-3 line-clamp-2">
                                    {claim.description}
                                </p>
                            )}

                            <div className="flex justify-between items-center">
                                <div className="flex space-x-2">
                                    <button className="px-3 py-1 text-xs bg-codeat-accent text-white rounded hover:bg-opacity-90 transition-colors">
                                        View Details
                                    </button>
                                    {claim.status === 'draft' && (
                                        <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-opacity-90 transition-colors">
                                            Submit
                                        </button>
                                    )}
                                    {claim.status === 'submitted' && (
                                        <>
                                            <button className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-opacity-90 transition-colors">
                                                Approve
                                            </button>
                                            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-opacity-90 transition-colors">
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                                {claim.approved_by_first_name && (
                                    <div className="text-xs text-codeat-gray">
                                        Approved by {claim.approved_by_first_name} {claim.approved_by_last_name}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CategoriesTab({ categories, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Expense Categories</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Category
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📂</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Categories</h3>
                    <p className="text-codeat-gray mb-4">Create expense categories to organize claims</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Add First Category
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                        <div key={category.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-medium text-codeat-dark mb-1">{category.name}</h3>
                                    {category.description && (
                                        <p className="text-sm text-codeat-gray mb-2">{category.description}</p>
                                    )}
                                </div>
                                <div className="flex space-x-1">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        category.requires_approval ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                        {category.requires_approval ? 'Approval Required' : 'Auto Approve'}
                                    </span>
                                </div>
                            </div>

                            {category.max_amount && (
                                <div className="text-sm mb-2">
                                    <span className="text-codeat-gray">Max Amount:</span>
                                    <span className="ml-2 font-medium">₹{category.max_amount}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-codeat-gray">
                                    Active
                                </span>
                                <div className="flex space-x-2">
                                    <button className="px-2 py-1 text-xs bg-codeat-accent text-white rounded hover:bg-opacity-90 transition-colors">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ReportsTab({ onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Expense Reports</h2>
                <div className="flex space-x-2">
                    <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Generate Report
                    </button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {/* Summary Cards */}
                <div className="bg-codeat-dark rounded-lg p-4 text-white">
                    <h3 className="text-sm font-medium mb-2">Total Claims</h3>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs opacity-75">This month</p>
                </div>

                <div className="bg-codeat-accent rounded-lg p-4 text-white">
                    <h3 className="text-sm font-medium mb-2">Pending Approval</h3>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs opacity-75">Awaiting review</p>
                </div>

                <div className="bg-green-600 rounded-lg p-4 text-white">
                    <h3 className="text-sm font-medium mb-2">Total Spent</h3>
                    <div className="text-2xl font-bold">₹0</div>
                    <p className="text-xs opacity-75">This month</p>
                </div>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Expense Reports Coming Soon</h3>
                <p className="text-codeat-gray">Generate detailed expense reports and analytics</p>
            </div>
        </div>
    );
}
