import React from 'react';
import { LayoutGrid, Globe, Cpu, Briefcase, Trophy, Car, Film, Bitcoin, Heart, ShoppingBag, Gamepad2, Bot, X, Rocket, Map, Microscope, ChevronLeft, ChevronRight, Newspaper, Headphones, Plane, BookOpen, Landmark } from 'lucide-react';

const CATEGORY_ICONS = {
  'Todas': LayoutGrid,
  'Tecnologia': Cpu,
  'Brasil': Map,
  'Mundo': Globe,
  'Negócios': Briefcase,
  'Ciência': Microscope,
  'Esportes': Trophy,
  'Automóveis': Car,
  'Entretenimento': Film,
  'Games': Gamepad2,
  'Saúde': Heart,
  'Cripto': Bitcoin,
  'Marketing': Rocket,
  'Moda': ShoppingBag,
  'Música': Headphones,
  'IA': Bot,
  'Turismo': Plane,
  'Educação': BookOpen,
  'Política': Landmark,
  'Geral': Newspaper,
  'Personalizado': Globe
};

const Sidebar = ({ isOpen, onClose, categories, selectedCategory, onSelectCategory, isCollapsed, toggleCollapse }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-r-2 border-slate-100 dark:border-slate-800/80 transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-[20px_0_40px_-15px_rgba(0,0,0,0.1)] lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-24' : 'w-80'}
      `}>
        <div className="p-6 flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800/80 h-[88px] shrink-0">
            <div className={`flex items-center gap-4 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 transform hover:scale-105 transition-transform">
                    <Globe className="text-white" size={22} />
                </div>
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">NewsAI</h1>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleCollapse}
                    className="hidden lg:flex p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                    {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
                </button>
                <button onClick={onClose} className="lg:hidden p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <X size={24} />
                </button>
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar">
            <div className="space-y-1.5">
                <p className={`text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Categorias</p>
                {categories.map((category) => {
                  const Icon = CATEGORY_ICONS[category] || LayoutGrid;
                  const isSelected = selectedCategory === category;
                  return (
                    <button
                        key={category}
                        onClick={() => { onSelectCategory(category); onClose(); }}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[1.2rem] transition-all duration-200 group relative overflow-hidden
                            ${isSelected
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 font-bold shadow-sm border border-blue-100/50 dark:border-blue-800/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-medium border border-transparent'
                            }
                        `}
                        title={isCollapsed ? category : ''}
                    >
                        {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600" />
                        )}
                        <span className={`shrink-0 transition-transform duration-300 ${isSelected ? 'scale-110 text-blue-600 dark:text-blue-400' : 'group-hover:scale-110 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>
                            <Icon size={20} />
                        </span>
                        <span className={`whitespace-nowrap transition-all duration-300 text-[15px] ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
                            {category}
                        </span>
                    </button>
                  );
                })}
            </div>
        </nav>

        {/* Footer Area */}
        <div className={`p-6 border-t-2 border-slate-100 dark:border-slate-800/80 transition-all duration-300 ${isCollapsed ? 'items-center px-4' : ''}`}>
             <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
                 <div className="w-12 h-12 rounded-[1.2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                     <span className="text-[15px] font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-600 to-slate-400 dark:from-slate-300 dark:to-slate-500">AI</span>
                 </div>
                 {!isCollapsed && (
                     <div className="flex flex-col">
                         <span className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">Agente Autônomo</span>
                         <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                             Sincronizado
                         </span>
                     </div>
                 )}
             </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
