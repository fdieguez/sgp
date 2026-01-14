import React, { useState, useEffect } from 'react';
import subsidyService from '../services/subsidyService';

const SubsidiesPage = () => {
    const [subsidies, setSubsidies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await subsidyService.getAll();
            setSubsidies(data);
        } catch (error) {
            console.error("Error fetching subsidies", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading subsidies...</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Subsidios</h1>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido Origen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {subsidies.map(sub => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4 whitespace-nowrap">#{sub.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {sub.order ? `Pedido #${sub.order.id}` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">${sub.amount}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{sub.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{sub.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{sub.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubsidiesPage;
