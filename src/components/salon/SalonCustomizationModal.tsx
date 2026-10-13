import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompressor';
import {
  X,
  Upload,
  Palette,
  Image as ImageIcon,
  Check,
  Sparkles,
  Trash2,
  Scissors,
  Store,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Roxo Real', hex: '#8B5CF6' },
  { name: 'Rosa Chic', hex: '#EC4899' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Ouro Âmbar', hex: '#D97706' },
  { name: 'Azul Real', hex: '#2563EB' },
  { name: 'Vermelho Rubi', hex: '#DC2626' },
  { name: 'Violeta Profundo', hex: '#6D28D9' },
  { name: 'Turquesa Elegante', hex: '#0D9488' },
  { name: 'Grafite Moderno', hex: '#334155' },
  { name: 'Preto Luxo', hex: '#0F172A' },
];

export const SalonCustomizationModal: React.FC<Props> = ({ onClose }) => {
  const { currentSalon, updateSalonCustomization } = useApp();

  const [salonName, setSalonName] = useState<string>(currentSalon?.name || '');
  const [primaryColor, setPrimaryColor] = useState<string>(
    currentSalon?.primaryColor || '#8B5CF6'
  );
  const [logoUrl, setLogoUrl] = useState<string>(currentSalon?.logoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza a cor em tempo real no documento para que todos os botões do salão reflitam a escolha imediatamente
  useEffect(() => {
    document.documentElement.style.setProperty('--salon-primary', primaryColor);
    document.documentElement.style.setProperty('--salon-primary-shadow', `${primaryColor}40`);
    document.documentElement.style.setProperty('--salon-primary-light', `${primaryColor}18`);
    document.documentElement.style.setProperty('--salon-primary-border', `${primaryColor}45`);

    return () => {
      const original = currentSalon?.primaryColor || '#8B5CF6';
      document.documentElement.style.setProperty('--salon-primary', original);
      document.documentElement.style.setProperty('--salon-primary-shadow', `${original}40`);
      document.documentElement.style.setProperty('--salon-primary-light', `${original}18`);
      document.documentElement.style.setProperty('--salon-primary-border', `${original}45`);
    };
  }, [primaryColor, currentSalon?.primaryColor]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      setError(null);
      const compressed = await compressImage(file, 260, 0.8);
      setLogoUrl(compressed);
    } catch {
      setError('Não foi possível processar a imagem do logótipo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSalon) return;

    if (!salonName.trim()) {
      setError('O nome do salão é obrigatório.');
      return;
    }

    setIsSaving(true);
    const success = await updateSalonCustomization(currentSalon.id, {
      name: salonName.trim(),
      primaryColor,
      logoUrl: logoUrl.trim() || undefined,
    });
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Personalização do Salão
              </h2>
              <p className="text-xs text-slate-500">
                Nome, cores e logótipo exclusivos do salão <strong>{salonName || currentSalon?.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Nome do Salão */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nome do Salão *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                placeholder="Ex: Atelier de Beleza & Estilo"
                className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none font-bold text-slate-900"
              />
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-400">
              Cada administrador pode alterar o nome do seu próprio salão. O nome atualiza imediatamente no topo do ecrã.
            </p>
          </div>

          {/* Secção: Logótipo do Salão */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Logótipo do Salão (Aparece no início da página do lado esquerdo)
            </label>

            <div className="flex items-center gap-4 p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl">
              {/* Pré-visualização do Logótipo */}
              <div className="shrink-0 text-center">
                {logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Logótipo do Salão"
                      className="w-16 h-16 rounded-xl object-contain bg-white border-2 border-slate-200 shadow-xs p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 cursor-pointer"
                      title="Remover logótipo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-md border-2 border-dashed border-slate-300"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Scissors className="w-7 h-7 transform -rotate-45" />
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">Pré-visualização</span>
              </div>

              {/* Controlos de Carregamento */}
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Carregar do Computador / Telemóvel</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="relative">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Ou cole o link URL da imagem..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              O logótipo será apresentado no canto superior esquerdo da barra de navegação principal.
            </p>
          </div>

          {/* Secção 2: Paleta de Cores do Salão */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Cor Principal do Salão
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                  {primaryColor}
                </span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shadow-2xs"
                  title="Escolher cor personalizada"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shadow-inner flex items-center justify-center text-white"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Demonstração visual dos botões nesta cor */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Visualização dos botões deste salão com esta cor:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  tabIndex={-1}
                  className="px-3.5 py-1.5 text-white rounded-xl text-xs font-bold shadow-md cursor-default transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  + Nova Reserva
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="px-3 py-1.5 text-white rounded-xl text-xs font-bold shadow-md cursor-default transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Registar Cliente
                </button>
                <span
                  className="px-2.5 py-1 text-white rounded-lg text-[11px] font-semibold cursor-default transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Separador Ativo
                </span>
              </div>
            </div>
          </div>

          {/* Nota de Isolamento */}
          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-[11px] text-purple-900 leading-snug">
            <strong>Isolamento Multi-Salão:</strong> Esta personalização é aplicada exclusivamente ao salão{' '}
            <strong>{currentSalon?.name}</strong>. Nenhum outro salão no sistema será alterado.
          </div>

          {/* Rodapé de Ações */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              <Sparkles className="w-4 h-4" />
              {isSaving ? 'A guardar...' : 'Guardar Personalização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
