import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  // ✅ Real customer session (was just the phone string before, from a fake
  // login). Persisted per-store in localStorage so a returning customer
  // within the token's validity doesn't have to re-verify every visit —
  // scoped by storeId since the same browser might shop at multiple
  // different stores, each with its own separate customer identity there.
  const [customer, setCustomer] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  // Only set while the auth screen was triggered mid-shopping (checkout) —
  // lets the person dismiss it and keep browsing instead of being stuck.
  const [checkoutNeedsAuth, setCheckoutNeedsAuth] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    try {
      const raw = localStorage.getItem(`customer_session_${storeId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        setCustomer(saved.customer);
        setCustomerToken(saved.token);
      }
    } catch (e) {
      console.error('Failed to load saved customer session:', e);
    }
  }, [storeId]);

  const handleAuthenticated = (customerData, token) => {
    setCustomer(customerData);
    setCustomerToken(token);
    setCheckoutNeedsAuth(false);
    try {
      localStorage.setItem(`customer_session_${storeId}`, JSON.stringify({ customer: customerData, token }));
    } catch (e) {
      console.error('Failed to persist customer session:', e);
    }
  };

  // ✅ Pulls real, current order status whenever the customer opens the
  // Orders tab — without this, a status change made in Store Admin would
  // never actually show up here; the storefront would keep showing
  // whatever the order looked like the moment it was placed. Also polls
  // every 30 seconds while the tab stays open, so a customer watching an
  // active delivery sees status changes without manually refreshing.
  useEffect(() => {
    if (activeTab !== 'orders' || !customer) return;
    refreshOrders();
    const interval = setInterval(refreshOrders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customer]);

  // ✅ Loads the customer's real name/email/address book right after
  // login — replaces the hardcoded "Amit Sharma" sample data every
  // customer used to see regardless of who they actually were.
  useEffect(() => {
    if (!customer) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Any modal (product quick-view, etc.) portals into this root, so it stays
  // contained within whatever box this component is rendered inside —
  // the simulated device frame in the builder, or the whole page when live.
  const rootRef = useRef(null);
  const [rootNode, setRootNode] = useState(null);
  useEffect(() => { setRootNode(rootRef.current); }, []);

  const flattenedData = useMemo(() => ({
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

    // ✅ Was missing entirely — Step 8's return policy never reached
    // usePreviewData at all, regardless of what usePreviewData itself did
    // with it. This is why every store showed the same hardcoded default
    // (returns always enabled, 7-day window) no matter what a tenant set.
    return: builderData.return,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [builderData]);

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
    refreshOrders,
    refreshProfile,
    updateProfileInfo,
  } = usePreviewData(flattenedData, storeId, customerToken);

  const handleAddToCart = (productId, variationId, sizeId) => {
    const allProducts = storeData.products || [];
    const product = allProducts.find(p => p.id === productId);
    if (product) addToCart(product, variationId, sizeId);
  };

  const handleLogout = () => {
    setCustomer(null);
    setCustomerToken(null);
    try {
      localStorage.removeItem(`customer_session_${storeId}`);
    } catch (e) {
      console.error('Failed to clear customer session:', e);
    }
    setActiveTab('home');
  };

  const AUTH_REQUIRED_TABS = ['orders', 'profile'];

  const renderTab = () => {
    if (AUTH_REQUIRED_TABS.includes(activeTab) && !customer) {
      return (
        <PreviewCustomerAuth
          brand={storeData.brand}
          storeId={storeId}
          onAuthenticated={handleAuthenticated}
          onCancel={() => setActiveTab('home')}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return <PreviewHomeTab data={storeData} onAddToCart={handleAddToCart} device={device} />;
      case 'cart':
        return checkoutNeedsAuth ? (
          <PreviewCustomerAuth
            brand={storeData.brand}
            storeId={storeId}
            onAuthenticated={handleAuthenticated}
            onCancel={() => setCheckoutNeedsAuth(false)}
          />
        ) : (
          <PreviewCartTab
            data={storeData}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            placeOrder={placeOrder}
            onGoToProfile={() => setActiveTab('profile')}
            isAuthenticated={!!customer}
            onRequireAuth={() => setCheckoutNeedsAuth(true)}
          />
        );
      case 'orders':
        return <PreviewOrdersTab data={storeData} cancelOrder={cancelOrder} addToCart={addToCart} onGoToCart={() => setActiveTab('cart')} storeId={storeId} customerToken={customerToken} />;
      case 'profile':
        return (
          <PreviewProfileTab
            data={storeData}
            customerMobile={customer?.phone}
            addAddress={addAddress}
            updateAddress={updateAddress}
            deleteAddress={deleteAddress}
            setDefaultAddress={setDefaultAddress}
            updateProfileInfo={updateProfileInfo}
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
        <PreviewHeader brand={storeData.brand || {}} cartCount={getCartItemCount()} />
        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
        <PreviewFooter
          activeTab={activeTab}
          onChange={setActiveTab}
          brandColors={storeData.brand?.colors || {}}
        />
      </DeviceFrameContext.Provider>
    </div>
  );
};

export default StorefrontApp;
