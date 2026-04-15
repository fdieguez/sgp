import { useEffect, useState } from 'react';
import api from '../config/axios';
import { Pencil, Trash2, Plus, Settings } from 'lucide-react';

export default function AtributosABM() {
    const [atributos, setAtributos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', tipoDato: 'TEXT', opciones: '' });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const res = await api.get('/api/atributos-resolucion');
            setAtributos(res.data);
        } catch (err) {}
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) await api.put(`/api/atributos-resolucion/${editing.id}`, formData);
            else await api.post('/api/atributos-resolucion', formData);
            setShowModal(false);
            setEditing(null);
            setFormData({ nombre: '', tipoDato: 'TEXT', opciones: '' });
            fetchAll();
        } catch (err) { alert('Error guardando atributo'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro de eliminar este atributo global?')) return;
        try {
            await api.delete(`/api/atributos-resolucion/${id}`);
            fetchAll();
        } catch (err) { alert('Error eliminando atributo'); }
    };

    const openEdit = (attr) => {
        setEditing(attr);
        setFormData({ nombre: attr.nombre, tipoDato: attr.tipoDato, opciones: attr.opciones || '' });
        setShowModal(true);
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-xl min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-indigo-400" /> Catálogo de Atributos</h2>
                    <p className="text-xs text-gray-500 mt-1">Campos globales reutilizables para los formularios.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormData({ nombre: '', tipoDato: 'TEXT', opciones: '' }); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Nuevo Atributo
                </button>
            </div>
            
            <table className="w-full text-left">
                <thead className="bg-gray-900 border-b border-gray-700">
                    <tr>
                        <th className="p-3 text-xs font-black text-gray-500 uppercase">Nombre del Campo</th>
                        <th className="p-3 text-xs font-black text-gray-500 uppercase">Tipo</th>
                        <th className="p-3 text-xs font-black text-gray-500 uppercase">Opciones (Select)</th>
                        <th className="p-3 text-right text-xs font-black text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {atributos.map(a => (
                        <tr key={a.id} className="hover:bg-gray-700/50">
                            <td className="p-3 text-sm font-bold">{a.nombre}</td>
                            <td className="p-3"><span className="text-[10px] font-mono bg-gray-900 px-2 py-1 rounded text-emerald-400 border border-gray-700">{a.tipoDato}</span></td>
                            <td className="p-3 text-xs text-gray-400">{a.opciones || '-'}</td>
                            <td className="p-3 text-right">
                                <button onClick={() => openEdit(a)} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded mr-2"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded"><Trash2 className="h-4 w-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Atributo' : 'Nuevo Atributo'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre (Etiqueta)</label>
                                <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Dato</label>
                                <select value={formData.tipoDato} onChange={e => setFormData({...formData, tipoDato: e.target.value})} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                                    <option value="TEXT">Texto Corto</option>
                                    <option value="TEXTAREA">Texto Largo</option>
                                    <option value="NUMBER">Número numérico ($)</option>
                                    <option value="DATE">Selector de Fecha</option>
                                    <option value="FILE">Subida de Archivo (PDF/Img)</option>
                                    <option value="SELECT">Selector Desplegable</option>
                                </select>
                            </div>
                            {formData.tipoDato === 'SELECT' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opciones (separadas por coma)</label>
                                    <input value={formData.opciones} onChange={e => setFormData({...formData, opciones: e.target.value})} placeholder="Ej: SI,NO,TAL VEZ" className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                                </div>
                            )}
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-700 py-2 rounded-lg font-bold hover:bg-gray-600">Cancelar</button>
                                <button type="submit" className="flex-1 bg-indigo-600 py-2 rounded-lg font-bold text-white hover:bg-indigo-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
