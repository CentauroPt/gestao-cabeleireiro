import React, { useState } from 'react';
import type { Service } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Scissors, Clock, DollarSign, Tag } from 'lucide-react';

interface Props {
  initialService?: Service | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ServiceFormModal: React.FC<Props> = ({ initialService, onClose, onSuccess }) => {
  const { addService, updateService } = useApp();

  const [name, setName] = useState(initialService?.name || '');
  const [category, setCategory] = useState<'Cabelo' | 'Estética' | 'Barba' | 'Tratamento'>(
    initialService?.category || 'Cabelo'
  );
  const [durationMinutes, setDurationMinutes] = useState(initialService?.durationMinutes || 45);
  const [price, setPrice] = useState(initialService?.price || 25);
  const [description, setDescription] = useState(initialService?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do serviço é obrigatório.');
      return;
    }
    if (durationMinutes <= 0) {
      setError('A duração tem de ser superior a 0 minutos.');
      return;
    }
    if (price < 0) {
      setError('O preço não pode ser negativo.');
      return;
    }

    setIsSubmitting(true);
    let success = false;

    if (initialService) {
      success = await updateService(initialService.id, {
        name: name.trim(),
        category,
        durationMinutes,
        price,
        description: description.trim() || undefined,
      });
    } else {
      success = await addService({
        name: name.trim(),
        category,
        durationMinutes,
        price,
        description: description.trim() || undefined,
      });
    }

    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-purple-600" />
            {initialService ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Serviço *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte Feminino & Brushing"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white cursor-pointer"
            >
              <option value="Cabelo">Cabelo</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Barba">Barba</option>
              <option value="Estética">Estética</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Duração (minutos) *
              </label>
              <input
                type="number"
                required
                min={5}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Preço (€) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={0.5}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Breve</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Lavagem com massagem incluída, corte personalizado..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50/50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all"
            >
              {isSubmitting ? 'A gravar...' : initialService ? 'Guardar' : 'Adicionar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
