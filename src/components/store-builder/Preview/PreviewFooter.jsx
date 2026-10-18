import React from 'react';

const PreviewFooter = ({ activeTab, onChange, brandColors, brandFonts = { heading: 'Inter', body: 'Inter' }, cartTabName = 'Cart', ordersTabName = 'Orders', storeType = 'product', device = 'desktop' }) => {
  const isService = storeType === 'service';
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'cart', label: isService ? 'Service' : (cartTabName || 'Cart'), icon: isService ? 'spa' : 'shopping_cart' },
    { id: 'orders', label: isService ? 'Booking' : (ordersTabName || 'Orders'), icon: isService ? 'event_note' : 'receipt_long' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav 
      className="w-full bg-white border-t py-2 px-4 flex justify-around items-center flex-shrink-0 fixed bottom-0 left-0 right-0 z-50"
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
            className={`material-symbols-outlined ${device === "mobile" ? "text-xl" : "text-2xl"} ${
              activeTab === tab.id ? 'filled' : ''
            }`}
            style={{ 
              color: activeTab === tab.id ? brandColors.primary : brandColors.secondary || '#556067'
            }}
          >
            {tab.icon}
          </span>
          <span 
            className={`font-medium ${device === "mobile" ? "text-[10px]" : "text-xs"}`}
            style={{ 
              color: activeTab === tab.id ? brandColors.primary : brandColors.secondary || '#556067',
              fontFamily: brandFonts?.body || 'Inter'
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