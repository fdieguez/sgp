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

    const [filterStatus, setFilterStatus] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersData, personsData] = await Promise.all([
                orderService.getAll({ status: filterStatus, search: filterSearch }),
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

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPersonId) return alert('Select a person');

        const newOrder = {
            description,
            origin,
            status,
            entryDate: new Date().toISOString().split('T')[0],
            person: { id: selectedPersonId }
        };

        try {
            await orderService.create(newOrder);
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
            const p = await personService.create({ name: newPersonName, type: 'INDIVIDUAL' });
            setPersons([...persons, p]);
            setSelectedPersonId(p.id);
            setNewPersonName('');
            alert('Solicitante creado!');
        } catch (error) {
            console.error("Error creating person", error);
        }
    };

    if (loading) return <div className="p-8 text-white">Cargando pedidos...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8 text-indigo-500">Gestión de Pedidos</h1>

            {/* Filters */}
            <form onSubmit={handleSearch} className="bg-gray-800 p-4 rounded-xl shadow-lg mb-8 border border-gray-700 flex gap-4 flex-wrap items-end">
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Buscar</label>
                    <input
                        type="text"
                        placeholder="Nombre, Descripción..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">Todos</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="COMPLETED">Completado</option>
                        <option value="REJECTED">Rechazado</option>
                    </select>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors font-medium h-10">
                    Filtrar
                </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Create Order */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Quick Person Creation */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-green-400">1. Crear Nuevo Solicitante</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nombre completo"
                                value={newPersonName}
                                onChange={(e) => setNewPersonName(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 flex-grow text-sm outline-none"
                            />
                            <button onClick={handleCreatePerson} className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors">
                                +
                            </button>
                        </div>
                    </div>

                    {/* New Order Form */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-blue-400">2. Nuevo Pedido</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Solicitante</label>
                                <select
                                    value={selectedPersonId}
                                    onChange={(e) => setSelectedPersonId(e.target.value)}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {persons.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Origen</label>
                                <select
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 outline-none"
                                >
                                    <option value="NOTE">Nota</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="SOCIAL_MEDIA">Redes Sociales</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 outline-none"
                                    rows="3"
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                Guardar Pedido
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: List */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Solicitante</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Origen</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron pedidos.
                                        </td>
                                    </tr>
                                ) : orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{order.entryDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{order.person ? order.person.name : '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">{order.origin}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${order.status === 'PENDING'
                                                ? 'bg-yellow-900/30 text-yellow-500 border-yellow-800'
                                                : order.status === 'COMPLETED'
                                                    ? 'bg-green-900/30 text-green-500 border-green-800'
                                                    : 'bg-gray-800 text-gray-400 border-gray-600'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer">
                                            Detalles
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default OrdersPage;
