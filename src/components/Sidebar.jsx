import React from 'react';
import { LayoutGrid, Globe, Cpu, Briefcase, Trophy, Car, Film, Bitcoin, Heart, ShoppingBag, Gamepad2, Bot, X, Rocket, Map, Microscope, ChevronLeft, ChevronRight } from 'lucide-react';

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
  'IA': Bot,
  'Personalizado': Globe
};

const Sidebar = ({ isOpen, onClose, categories, selectedCategory, onSelectCategory, isCollapsed, toggleCollapse }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        ${isCollapsed ? 'w-20' : 'w-72'}
        bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700
        transform transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`h-full flex flex-col ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8 relative`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                    <Globe className="text-white h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">NewsAI</h1>
              </div>
            ) : (
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                    <Globe className="text-white h-6 w-6" />
                </div>
            )}

            {/* Collapse Button (Desktop) */}
            <button
                onClick={toggleCollapse}
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1.5 rounded-full shadow-md text-gray-500 hover:text-blue-600 transition-colors z-20"
                style={{ right: isCollapsed ? '-20px' : '-20px' }} // Position it outside mostly
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

             {/* Close Button (Mobile) */}
            <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X size={20} />
            </button>
          </div>

          <nav className="space-y-1.5 flex-grow">
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
                    w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                    ${isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm ring-1 ring-blue-100 dark:ring-blue-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <Icon size={20} className={`transition-colors shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />

                  {!isCollapsed && (
                      <>
                        <span className="relative z-10 whitespace-nowrap">{category}</span>
                        {isSelected && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        )}
                      </>
                  )}
                </button>
              );
            })}
          </nav>

          <div className={`mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 ${isCollapsed ? 'hidden' : 'block'}`}>
             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <Bot size={16} /> Agente Telegram
                    </div>
                    <p className="text-xs text-indigo-100 mb-3 leading-relaxed opacity-90">Automatize o envio de notícias resumidas para seu canal.</p>
                </div>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
