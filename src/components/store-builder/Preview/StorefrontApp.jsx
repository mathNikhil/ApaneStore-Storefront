import React, { useState, useRef, useEffect } from 'react';
import PreviewHeader from './PreviewHeader';
import PreviewFooter from './PreviewFooter';
import PreviewCustomerAuth from './PreviewCustomerAuth';
import PreviewHomeTab from './tabs/PreviewHomeTab';
import PreviewCartTab from './tabs/PreviewCartTab';
import PreviewOrdersTab from './tabs/PreviewOrdersTab';
import PreviewProfileTab from './tabs/PreviewProfileTab';
import { usePreviewData } from './hooks/usePreviewData';
import { DeviceFrameContext } from './DeviceFrameContext';

// The actual storefront — login gate, header, tabs, footer. Shared by BOTH
// the builder's simulated preview (wrapped in a device frame) AND the real
// published storefront (full page, no chrome). This is deliberately the
// exact same component in both places: what the tenant tests is what their
// customers get, byte for byte.
const StorefrontApp = ({ builderData, storeId, device = 'desktop', className = '', style = {} }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customerMobile, setCustomerMobile] = useState(null);

  // Any modal (product quick-view, etc.) portals into this root, so it stays
  // contained within whatever box this component is rendered inside —
  // the simulated device frame in the builder, or the whole page when live.
  const rootRef = useRef(null);
  const [rootNode, setRootNode] = useState(null);
  useEffect(() => { setRootNode(rootRef.current); }, []);

  const {
    storeData,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartItemCount,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    placeOrder,
    cancelOrder,
  } = usePreviewData({
    brandName: builderData.brand.brandName,
    tagline: builderData.brand.tagline,
    logo: builderData.brand.logo,
    brandColors: builderData.brand.colors,
    headingFont: builderData.brand.fonts.heading,
    bodyFont: builderData.brand.fonts.body,
    baseFontSize: builderData.brand.baseFontSize,

    categories: builderData.products.categories,
    enableImageZoom: builderData.products.enableImageZoom,
    bannerImage: builderData.products.banner.image,
    bannerTagline: builderData.products.banner.tagline,
    bannerSubtitle: builderData.products.banner.subtitle,
    bannerCta: builderData.products.banner.cta,
    bannerHeight: builderData.products.banner.height,
    bannerBgColor: builderData.products.banner.bgColor,
    showCta: builderData.products.banner.showCta,
    showText: builderData.products.banner.showText,
    textAlignment: builderData.products.banner.textAlignment,
    textColor: builderData.products.banner.textColor,

    freeDelivery: builderData.cart.freeDelivery,
    freeDeliveryThreshold: builderData.cart.freeDeliveryThreshold,
    deliveryCharge: builderData.cart.deliveryCharge,
    showProgressBar: builderData.cart.showProgressBar,
    showDeliveryMessage: builderData.cart.showDeliveryMessage,
    enableGST: builderData.cart.enableGST,
    gstRate: builderData.cart.gstRate,
    taxLabel: builderData.cart.taxLabel,
    showGSTBreakdownCart: builderData.cart.showGSTBreakdownCart,
    showGSTBreakdownCheckout: builderData.cart.showGSTBreakdownCheckout,

    codEnabled: builderData.payment.codEnabled,
    upiEnabled: builderData.payment.upiEnabled,
    cardEnabled: builderData.payment.cardEnabled,
    netBankingEnabled: builderData.payment.netBankingEnabled,
    upiId: builderData.payment.upiId,
    upiAppName: builderData.payment.upiAppName,
    showQRCode: builderData.payment.showQRCode,
    showUPIId: builderData.payment.showUPIId,
    defaultPayment: builderData.payment.defaultPayment,

    maxAddresses: builderData.address.maxAddresses,
    allowDefaultAddress: builderData.address.allowDefaultAddress,
    showAddressLabels: builderData.address.showAddressLabels,
    allowAddressEditing: builderData.address.allowAddressEditing,
    allowAddressDeletion: builderData.address.allowAddressDeletion,
    addressFields: builderData.address.fields,

    enableCancellation: builderData.order.enableCancellation,
    cancellationWindow: builderData.order.cancellationWindow,
    cancelOnlyConfirmed: builderData.order.cancelOnlyConfirmed,
    showCancelReason: builderData.order.showCancelReason,
    sendCancelEmail: builderData.order.sendCancelEmail,
    showStatusTimeline: builderData.order.showStatusTimeline,
    showEstimatedDelivery: builderData.order.showEstimatedDelivery,

    officeNumber: builderData.profile.officeNumber,
    supportTime: builderData.profile.supportTime,
    supportEmail: builderData.profile.supportEmail,
    aboutUs: builderData.profile.aboutUs,
    socialLinks: builderData.profile.socialLinks,
    feedbackLinks: builderData.profile.feedbackLinks,
  });

  const handleAddToCart = (productId, variationId, sizeId) => {
    const allProducts = storeData.products || [];
    const product = allProducts.find(p => p.id === productId);
    if (product) addToCart(product, variationId, sizeId);
  };

  const handleLogout = () => {
    setCustomerMobile(null);
    setActiveTab('home');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <PreviewHomeTab data={storeData} onAddToCart={handleAddToCart} device={device} />;
      case 'cart':
        return (
          <PreviewCartTab
            data={storeData}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            placeOrder={placeOrder}
            onGoToProfile={() => setActiveTab('profile')}
          />
        );
      case 'orders':
        return <PreviewOrdersTab data={storeData} cancelOrder={cancelOrder} />;
      case 'profile':
        return (
          <PreviewProfileTab
            data={storeData}
            customerMobile={customerMobile}
            addAddress={addAddress}
            updateAddress={updateAddress}
            deleteAddress={deleteAddress}
            setDefaultAddress={setDefaultAddress}
            onLogout={handleLogout}
          />
        );
      default:
        return <PreviewHomeTab data={storeData} onAddToCart={handleAddToCart} device={device} />;
    }
  };

  return (
    <div ref={rootRef} className={`flex flex-col relative ${className}`} style={style}>
      <DeviceFrameContext.Provider value={rootNode}>
        {!customerMobile ? (
          <div className="flex-1 overflow-y-auto">
            <PreviewCustomerAuth
              brand={storeData.brand}
              storeId={storeId}
              onAuthenticated={(mobile) => setCustomerMobile(mobile)}
            />
          </div>
        ) : (
          <>
            <PreviewHeader brand={storeData.brand || {}} cartCount={getCartItemCount()} />
            <div className="flex-1 overflow-y-auto">
              {renderTab()}
            </div>
            <PreviewFooter
              activeTab={activeTab}
              onChange={setActiveTab}
              brandColors={storeData.brand?.colors || {}}
            />
          </>
        )}
      </DeviceFrameContext.Provider>
    </div>
  );
};

export default StorefrontApp;
