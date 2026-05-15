'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthFetch } from '@/hooks/useAuthFetch';

export default function AssetsPage() {
    const [activeTab, setActiveTab] = useState('assets');
    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const authFetch = useAuthFetch();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'assets') {
                const assetsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets`);
                if (assetsRes.ok) {
                    const data = await assetsRes.json();
                    setAssets(data.assets || []);
                }
            } else if (activeTab === 'categories') {
                // We'll create categories API later
                setCategories([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'assets', label: 'Assets', icon: '💼' },
        { id: 'categories', label: 'Categories', icon: '📂' },
        { id: 'assignments', label: 'Assignments', icon: '🔗' },
        { id: 'maintenance', label: 'Maintenance', icon: '🔧' }
    ];

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-codeat-dark mb-2">Asset Management</h1>
                    <p className="text-codeat-gray">Track and manage company assets and equipment</p>
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
                            {activeTab === 'assets' && <AssetsTab assets={assets} onRefresh={loadData} />}
                            {activeTab === 'categories' && <CategoriesTab categories={categories} onRefresh={loadData} />}
                            {activeTab === 'assignments' && <AssignmentsTab onRefresh={loadData} />}
                            {activeTab === 'maintenance' && <MaintenanceTab onRefresh={loadData} />}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function AssetsTab({ assets, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Company Assets</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Asset
                </button>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">💼</div>
                    <h3 className="text-lg font-medium text-codeat-dark mb-2">No Assets</h3>
                    <p className="text-codeat-gray mb-4">Add your first asset to start tracking</p>
                    <button className="bg-codeat-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                        Add First Asset
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {assets.map((asset) => (
                        <div key={asset.id} className="border border-codeat-mid rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="font-medium text-codeat-dark">{asset.name}</h3>
                                        <span className="text-xs bg-codeat-mid px-2 py-1 rounded">
                                            {asset.asset_code}
                                        </span>
                                    </div>

                                    <p className="text-sm text-codeat-gray mb-2">
                                        {asset.category_name} • {asset.location}
                                    </p>

                                    <div className="flex items-center space-x-2 text-xs mb-2">
                                        <span className={`px-2 py-1 rounded-full ${
                                            asset.status === 'available' ? 'bg-green-100 text-green-800' :
                                            asset.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                            asset.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {asset.status.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full ${
                                            asset.condition_status === 'excellent' ? 'bg-green-100 text-green-800' :
                                            asset.condition_status === 'good' ? 'bg-blue-100 text-blue-800' :
                                            asset.condition_status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {asset.condition_status}
                                        </span>
                                    </div>

                                    {asset.is_assigned > 0 && asset.first_name && (
                                        <div className="text-sm text-codeat-gray">
                                            Assigned to: {asset.first_name} {asset.last_name}
                                            {asset.assigned_date && ` (${new Date(asset.assigned_date).toLocaleDateString()})`}
                                        </div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-codeat-accent mb-1">
                                        ₹{asset.current_value || asset.purchase_cost}
                                    </div>
                                    <div className="text-xs text-codeat-gray">
                                        {asset.purchase_cost && `Purchased: ₹${asset.purchase_cost}`}
                                    </div>
                                    <div className="text-xs text-codeat-gray mt-1">
                                        {asset.maintenance_count} maintenance records
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex space-x-2">
                                    <button className="px-3 py-1 text-xs bg-codeat-accent text-white rounded hover:bg-opacity-90 transition-colors">
                                        View Details
                                    </button>
                                    {asset.status === 'available' && (
                                        <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-opacity-90 transition-colors">
                                            Assign
                                        </button>
                                    )}
                                    <button className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-opacity-90 transition-colors">
                                        Maintenance
                                    </button>
                                </div>

                                {asset.serial_number && (
                                    <div className="text-xs text-codeat-gray">
                                        S/N: {asset.serial_number}
                                    </div>
                                )}
                            </div>

                            {asset.warranty_expiry && (
                                <div className="mt-2 text-xs text-codeat-gray">
                                    Warranty expires: {new Date(asset.warranty_expiry).toLocaleDateString()}
                                </div>
                            )}
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
                <h2 className="text-xl font-semibold text-codeat-dark">Asset Categories</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Add Category
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">📂</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Asset Categories Coming Soon</h3>
                <p className="text-codeat-gray">Organize assets by categories for better management</p>
            </div>
        </div>
    );
}

function AssignmentsTab({ onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Asset Assignments</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + New Assignment
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Asset Assignments Coming Soon</h3>
                <p className="text-codeat-gray">Track asset assignments to employees</p>
            </div>
        </div>
    );
}

function MaintenanceTab({ onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-codeat-dark">Maintenance Records</h2>
                <button className="bg-codeat-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    + Schedule Maintenance
                </button>
            </div>

            <div className="text-center py-12">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-lg font-medium text-codeat-dark mb-2">Maintenance Tracking Coming Soon</h3>
                <p className="text-codeat-gray">Schedule and track asset maintenance</p>
            </div>
        </div>
    );
}
