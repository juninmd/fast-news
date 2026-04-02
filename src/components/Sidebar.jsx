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
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        ${isCollapsed ? 'w-24' : 'w-80'}
        bg-white dark:bg-[#0b1120] border-r border-slate-200 dark:border-slate-800/60
        transform transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden scrollbar-hide shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`h-full flex flex-col ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8 relative`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    <Globe className="text-white h-6 w-6 animate-pulse" />
                </div>
                <h1 className="text-[26px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">NewsAI</h1>
              </div>
            ) : (
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
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
                    w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3 rounded-2xl text-[15px] font-bold transition-opacity transition-all duration-300 group relative
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 shadow-sm scale-105'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 hover:shadow-sm'
                    }
                  `}
                >
                  <Icon size={22} className={`transition-all duration-300 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-sm' : 'text-slate-400 group-hover:text-blue-500 group-hover:scale-110'}`} />

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
