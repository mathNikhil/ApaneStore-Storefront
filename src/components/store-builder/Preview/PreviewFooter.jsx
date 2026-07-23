import React from 'react';

const PreviewFooter = ({ activeTab, onChange, brandColors }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'cart', label: 'Cart', icon: 'shopping_cart' },
    { id: 'orders', label: 'Orders', icon: 'receipt_long' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav 
      className="w-full bg-white border-t py-2 px-4 flex justify-around items-center flex-shrink-0"
      style={{ 
        borderColor: brandColors.secondary || '#e0e3e6',
        backgroundColor: brandColors.background || '#FFFFFF'
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors hover:bg-[#f2f4f7]"
        >
          <span 
            className={`material-symbols-outlined text-2xl ${
              activeTab === tab.id ? 'filled' : ''
            }`}
            style={{ 
              color: activeTab === tab.id ? brandColors.primary : brandColors.secondary || '#556067'
            }}
          >
            {tab.icon}
          </span>
          <span 
            className="text-xs font-medium"
            style={{ 
              color: activeTab === tab.id ? brandColors.primary : brandColors.secondary || '#556067'
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default PreviewFooter;