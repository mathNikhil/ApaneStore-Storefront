import React from 'react';

const DEFAULT_TABS = [
  { id: 'home',    label: 'Home',    icon: 'home',          customIcon: null },
  { id: 'cart',    label: 'Cart',    icon: 'shopping_cart', customIcon: null },
  { id: 'orders',  label: 'Orders',  icon: 'receipt_long',  customIcon: null },
  { id: 'profile', label: 'Profile', icon: 'person',        customIcon: null },
];

const PreviewFooter = ({
  activeTab,
  onChange,
  brandColors,
  brandFonts = { heading: 'Inter', body: 'Inter' },
  cartTabName = 'Cart',
  ordersTabName = 'Orders',
  storeType = 'product',
  device = 'desktop',
  navTabs = null,
}) => {
  const isService = storeType === 'service';

  // Service stores swap the cart and orders tabs' label + default icon.
  // This applies whether navTabs came from DB or fell back to defaults.
  // If the admin set a customIcon we keep it; label and default icon still
  // reflect the store type so "Cart" never shows on a service store.
  const applyServiceOverrides = (tab) => {
    if (tab.id === 'cart') {
      return {
        ...tab,
        label: isService ? 'Service' : (cartTabName || tab.label || 'Cart'),
        icon: tab.customIcon ? tab.icon : (isService ? 'spa' : 'shopping_cart'),
      };
    }
    if (tab.id === 'orders') {
      return {
        ...tab,
        label: isService ? 'Booking' : (ordersTabName || tab.label || 'Orders'),
        icon: tab.customIcon ? tab.icon : (isService ? 'event_note' : 'receipt_long'),
      };
    }
    return tab;
  };

  const tabs = (navTabs && navTabs.length > 0 ? navTabs : DEFAULT_TABS).map(applyServiceOverrides);

  return (
    <nav
      className="w-full bg-white border-t py-2 px-4 flex justify-around items-center flex-shrink-0 fixed bottom-0 left-0 right-0 z-50"
      style={{
        borderColor: brandColors.secondary || '#e0e3e6',
        backgroundColor: brandColors.background || '#FFFFFF',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const activeColor  = brandColors.primary  || '#25D366';
        const inactiveColor = brandColors.secondary || '#556067';

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors hover:bg-[#f2f4f7]"
          >
            {/* Custom icon (data URL) or Material Symbol */}
            {tab.customIcon ? (
              <img
                src={tab.customIcon}
                alt={tab.label}
                className={device === 'mobile' ? 'w-5 h-5' : 'w-6 h-6'}
                style={{
                  objectFit: 'contain',
                  opacity: isActive ? 1 : 0.55,
                  filter: isActive
                    ? 'none'
                    : 'grayscale(40%) opacity(0.75)',
                }}
              />
            ) : (
              <span
                className={`material-symbols-outlined ${device === 'mobile' ? 'text-xl' : 'text-2xl'} ${isActive ? 'filled' : ''}`}
                style={{ color: isActive ? activeColor : inactiveColor }}
              >
                {tab.icon}
              </span>
            )}

            <span
              className={`font-medium ${device === 'mobile' ? 'text-[10px]' : 'text-xs'}`}
              style={{
                color: isActive ? activeColor : inactiveColor,
                fontFamily: brandFonts?.body || 'Inter',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default PreviewFooter;
