import React, { useState, useEffect } from 'react';
import orderService from '../services/orderService';
import personService from '../services/personService';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);

    // Generic form state
    const [description, setDescription] = useState('');
    const [origin, setOrigin] = useState('NOTE');
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [status, setStatus] = useState('PENDING');
    const [newPersonName, setNewPersonName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersData, personsData] = await Promise.all([
                orderService.getAll(),
                personService.getAll()
            ]);
            setOrders(ordersData);
            setPersons(personsData);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPersonId) return alert('Select a person');

        const newOrder = {
            description,
            origin,
            status,
            entryDate: new Date().toISOString().split('T')[0],
            person: { id: selectedPersonId } // Backend expects a Person object ref
        };

        try {
            await orderService.create(newOrder);
            // Reset form and reload
            setDescription('');
            fetchData();
        } catch (error) {
            console.error("Error creating order", error);
        }
    };

    const handleCreatePerson = async (e) => {
        e.preventDefault();
        if (!newPersonName) return;
        try {
            const p = await personService.create({ name: newPersonName, type: 'INDIVIDUAL' }); // Default type
            setPersons([...persons, p]);
            setSelectedPersonId(p.id);
            setNewPersonName('');
            alert('Solicitante creado!');
        } catch (error) {
            console.error("Error creating person", error);
        }
    };

    if (loading) return <div>Loading orders...</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Pedidos (Orders)</h1>

            {/* Quick Person Creation */}
            <div className="bg-gray-100 p-4 rounded shadow mb-6">
                <h2 className="text-lg font-semibold mb-2">1. Crear Nuevo Solicitante (Rápido)</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nombre del Solicitante"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="border p-2 rounded flex-grow"
                    />
                    <button onClick={handleCreatePerson} className="bg-green-600 text-white px-4 py-2 rounded">
                        Crear +
                    </button>
                </div>
            </div>

            {/* Basic Creation Form */}
            <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl mb-4">2. Nuevo Pedido</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Solicitante</label>
                        <select
                            value={selectedPersonId}
                            onChange={(e) => setSelectedPersonId(e.target.value)}
                            className="w-full border p-2 rounded"
                        >
                            <option value="">Seleccionar Solicitante...</option>
                            {persons.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Origen</label>
                        <select
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            className="w-full border p-2 rounded"
                        >
                            <option value="NOTE">Nota</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="EMAIL">Email</option>
                            <option value="SOCIAL_MEDIA">Redes Sociales</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border p-2 rounded"
                            rows="3"
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                        Guardar Pedido
                    </button>
                </form>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{order.entryDate}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{order.person ? order.person.name : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{order.origin}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {/* Future: Add derive to subsidy button */}
                                    Derivar
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrdersPage;
