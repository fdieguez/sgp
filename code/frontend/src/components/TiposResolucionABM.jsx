import { useEffect, useState } from 'react';
import api from '../config/axios';
import { Pencil, Trash2, Plus, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function TiposResolucionABM() {
    const [tipos, setTipos] = useState([]);
    const [atributosGlobales, setAtributosGlobales] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Modal state
    const [editingId, setEditingId] = useState(null);
    const [tipoName, setTipoName] = useState('');
    const [resolutorId, setResolutorId] = useState('');
    const [mapping, setMapping] = useState([]); // [{ atributoId, requerido, orden }]

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [tipsRes, attrRes, uRes] = await Promise.all([
                api.get('/api/tipos-resolucion'),
                api.get('/api/atributos-resolucion'),
                api.get('/api/users')
            ]);
            setTipos(tipsRes.data);
            setAtributosGlobales(attrRes.data);
            setUsuarios(uRes.data.filter(u => u.role === 'RESOLUTOR' || u.role === 'ADMINISTRADOR'));
        } catch (err) {}
        finally { setLoading(false); }
    };

    const handleAddMappingRow = () => {
        if (!atributosGlobales.length) return;
        setMapping([...mapping, { atributo: { id: atributosGlobales[0].id }, requerido: false, orden: mapping.length + 1 }]);
    };

    const handleRemoveMappingRow = (index) => {
        setMapping(mapping.filter((_, i) => i !== index));
    };

    const handleMappingChange = (index, field, value) => {
        const newMap = [...mapping];
        if (field === 'atributoId') {
            newMap[index].atributo = { id: parseInt(value) };
        } else {
            newMap[index][field] = value;
        }
        setMapping(newMap);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                tipo: tipoName,
                resolutor: resolutorId ? { id: resolutorId } : null,
                atributosConfig: mapping
            };
            
            if (editingId) {
                await api.put(`/api/tipos-resolucion/${editingId}`, payload);
            } else {
                await api.post('/api/tipos-resolucion', payload);
            }
            setShowModal(false);
            fetchAll();
        } catch (err) { alert('Error guardando el tipo de resolución'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro de eliminar este Formulario Dinámico? Las solicitudes creadas previamente no se verán afectadas (borrado lógico).')) return;
        try {
            await api.delete(`/api/tipos-resolucion/${id}`);
            fetchAll();
        } catch (err) { alert('Error al borrar'); }
    };

    const openEdit = (t) => {
        setEditingId(t.id);
        setTipoName(t.tipo);
        setResolutorId(t.resolutor?.id || '');
        setMapping(t.atributosConfig.map(ac => ({
            atributo: { id: ac.atributo?.id },
            requerido: ac.requerido,
            orden: ac.orden
        })));
        setShowModal(true);
    };

    const openNew = () => {
        setEditingId(null);
        setTipoName('');
        setResolutorId('');
        setMapping([]);
        setShowModal(true);
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-xl min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /> Tipos de Resolución</h2>
                    <p className="text-xs text-gray-500 mt-1">Gestiona los modelos de formularios que usan los resolutores.</p>
                </div>
                <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Nuevo Tipo
                </button>
            </div>
            
            <table className="w-full text-left bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <thead className="bg-gray-800/80 border-b border-gray-700">
                    <tr>
                        <th className="p-4 text-xs font-black text-gray-500 uppercase">Nombre (Clave)</th>
                        <th className="p-4 text-xs font-black text-gray-500 uppercase">Resolutor Default</th>
                        <th className="p-4 text-center text-xs font-black text-gray-500 uppercase">Cant. Campos</th>
                        <th className="p-4 text-right text-xs font-black text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {tipos.map(t => (
                        <tr key={t.id} className="hover:bg-gray-700/50">
                            <td className="p-4 text-sm font-bold text-indigo-300">{t.tipo}</td>
                            <td className="p-4 text-xs font-medium text-gray-400">{t.resolutor?.email || 'No asignado'}</td>
                            <td className="p-4 text-center">
                                <span className="px-2 py-1 bg-gray-800 rounded font-code text-[10px] text-gray-300 border border-gray-600">{t.atributosConfig?.length || 0}</span>
                            </td>
                            <td className="p-4 text-right">
                                <button onClick={() => openEdit(t)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded mr-2"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(t.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 className="h-4 w-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 max-w-2xl w-full my-8 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar Formulario Dinámico' : 'Nuevo Formulario Dinámico'}</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Único</label>
                                    <input required value={tipoName} onChange={e => setTipoName(e.target.value)} placeholder="Ej: ASESORAMIENTO" className="w-full px-4 py-2 border border-gray-600 bg-gray-900 rounded-xl text-white outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resolutor por Defecto</label>
                                    <select value={resolutorId} onChange={e => setResolutorId(e.target.value)} className="w-full px-4 py-2 border border-gray-600 bg-gray-900 rounded-xl text-white outline-none focus:border-indigo-500">
                                        <option value="">(Ninguno)</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>{u.email} ({u.firstName})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Campos Dinámicos Setup */}
                            <div className="border border-gray-700 bg-gray-900/50 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Campos Dinámicos</label>
                                    <button type="button" onClick={handleAddMappingRow} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white flex items-center gap-1 font-bold">
                                        <Plus className="w-3 h-3"/> Agregar
                                    </button>
                                </div>
                                
                                {mapping.length === 0 && <p className="text-sm text-gray-500 italic p-4 text-center">No has asignado ningún campo. El formulario estará en blanco.</p>}
                                
                                <div className="space-y-2">
                                    {mapping.map((m, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-gray-800 p-2 rounded-xl border border-gray-700">
                                            <input type="number" title="Orden" value={m.orden} onChange={(e) => handleMappingChange(index, 'orden', parseInt(e.target.value))} className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-center text-xs text-white" />
                                            
                                            <select value={m.atributo?.id || ''} onChange={(e) => handleMappingChange(index, 'atributoId', e.target.value)} className="flex-1 px-3 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white">
                                                {atributosGlobales.map(ag => (
                                                    <option key={ag.id} value={ag.id}>{ag.nombre} ({ag.tipoDato})</option>
                                                ))}
                                            </select>

                                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                <input type="checkbox" checked={m.requerido} onChange={(e) => handleMappingChange(index, 'requerido', e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                                                <span className="text-gray-400 font-bold">Req.</span>
                                            </label>

                                            <button type="button" onClick={() => handleRemoveMappingRow(index)} className="p-1 text-red-500 hover:bg-red-900/30 rounded"><XCircle className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-700 py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
