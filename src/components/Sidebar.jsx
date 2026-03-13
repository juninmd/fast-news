import React from 'react';
import { LayoutGrid, Globe, Cpu, Briefcase, Trophy, Car, Film, Bitcoin, Heart, ShoppingBag, Gamepad2, Bot, X, Rocket, Map, Microscope, ChevronLeft, ChevronRight, Newspaper, Headphones, Plane } from 'lucide-react';

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
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        ${isCollapsed ? 'w-20' : 'w-72'}
        bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-3xl border-r border-slate-200/50 dark:border-slate-800/80
        transform transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden scrollbar-hide shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`h-full flex flex-col ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8 relative`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-[14px] shadow-lg shadow-blue-500/30">
                    <Globe className="text-white h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-black tracking-tight text-slate-900 dark:text-white">NewsAI</h1>
              </div>
            ) : (
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                    <Globe className="text-white h-5 w-5" />
                </div>
            )}

            {/* Collapse Button (Desktop) */}
            <button
                onClick={toggleCollapse}
                className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-full shadow-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-20"
            >
                {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
            </button>

             {/* Close Button (Mobile) */}
            <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <X size={20} />
            </button>
          </div>

          <nav className="space-y-1 flex-grow">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category] || LayoutGrid;
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => {
                    onSelectCategory(category);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  title={isCollapsed ? category : ''}
                  className={`
                    w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3.5 px-3.5'} py-2.5 rounded-[14px] text-sm font-semibold transition-all duration-200 group relative border-l-4
                    ${isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 shadow-sm'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                    }
                  `}
                >
                  <Icon size={20} className={`transition-colors shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />

                  {!isCollapsed && (
                        <span className="relative z-10 whitespace-nowrap">{category}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
