import React, { useState, useRef, useEffect, useMemo } from 'react';
import PreviewHeader from './PreviewHeader';
import PreviewFooter from './PreviewFooter';
import PreviewCustomerAuth from './PreviewCustomerAuth';
import PreviewHomeTab from './tabs/PreviewHomeTab';
import PreviewCartTab from './tabs/PreviewCartTab';
import PreviewOrdersTab from './tabs/PreviewOrdersTab';
import PreviewProfileTab from './tabs/PreviewProfileTab';
import { usePreviewData } from './hooks/usePreviewData';
import { customerCartAPI } from '../../../services/api';
import { DeviceFrameContext } from './DeviceFrameContext';

const StorefrontApp = ({
  builderData,
  storeId,
  device = 'desktop',
  className = '',
  style = {},
  initialProductId = null,
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [customer, setCustomer] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  const [checkoutNeedsAuth, setCheckoutNeedsAuth] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    try {
      const raw = sessionStorage.getItem(`customer_session_${storeId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        setCustomer(saved.customer);
        setCustomerToken(saved.token);
      }
    } catch (e) {
      console.error('Failed to load saved customer session:', e);
    }
  }, [storeId]);

  const handleAuthenticated = async (customerData, token) => {
    setCustomer(customerData);
    setCustomerToken(token);
    setCheckoutNeedsAuth(false);
    try {
      sessionStorage.setItem(`customer_session_${storeId}`, JSON.stringify({ customer: customerData, token }));
    } catch (e) {
      console.error('Failed to persist customer session:', e);
    }
    // Restore saved cart from backend
    try {
      const cartResult = await customerCartAPI.getCart(storeId, token);
      if (cartResult.success && cartResult.data?.items?.length > 0) {
        cartResult.data.items.forEach(item => {
          addToCart({ 
            id: item.productId, 
            name: item.productName,
            images: item.image ? [{ url: item.image }] : [],
            discount: item.discount || 0,
            variations: [{
              id: item.variationId,
              name: item.variationName,
              sizes: [{ id: item.sizeId, size: item.size, unit: item.unit, price: String(item.price), label: item.sizeLabel }]
            }]
          }, item.variationId, item.sizeId);
        });
      }
    } catch (e) {
      console.error('Failed to restore cart:', e);
    }
  };

  useEffect(() => {
    if (activeTab !== 'orders' || !customer) return;
    refreshOrders();
    const interval = setInterval(refreshOrders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customer]);

  useEffect(() => {
    if (!customer) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const rootRef = useRef(null);
  const [rootNode, setRootNode] = useState(null);
  useEffect(() => { setRootNode(rootRef.current); }, []);

  useEffect(() => {
    const heading = builderData?.brand?.fonts?.heading || 'Inter';
    const body = builderData?.brand?.fonts?.body || 'Inter';
    const fonts = [...new Set([heading, body])].map(f => f.replace(/ /g, '+') + ':wght@400;500;600;700').join('&family=');
    const linkId = 'store-google-fonts';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${fonts}&display=swap`;
  }, [builderData?.brand?.fonts?.heading, builderData?.brand?.fonts?.body]);

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
    enableProductSearch: builderData.products.enableProductSearch,
    settings: {
      categoryImageSize: builderData.products.categoryImageSize || 'S',
      categoryImageShape: builderData.products.categoryImageShape || 'circle',
      autoSlideProductImages: builderData.products.autoSlideProductImages || false,
    },
    bannerImage: builderData.products.banner.image,
    bannerTagline: builderData.products.banner.tagline,
    bannerSubtitle: builderData.products.banner.subtitle,
    bannerCta: builderData.products.banner.cta,
    bannerHeight: builderData.products.banner.height,
    bannerBgColor: builderData.products.banner.bgColor,
    textShadow: builderData.products.banner.textShadow !== undefined ? builderData.products.banner.textShadow : true,
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
    gstNumber: builderData.cart.gstNumber || '',
    codEnabled: builderData.payment.codEnabled,
    upiEnabled: builderData.payment.upiEnabled,
    cardEnabled: builderData.payment.cardEnabled,
    netBankingEnabled: builderData.payment.netBankingEnabled,
    upiId: builderData.payment.upiId,
    upiAppName: builderData.payment.upiAppName,
    showQRCode: builderData.payment.showQRCode,
    showUPIId: builderData.payment.showUPIId,
    defaultPayment: builderData.payment.defaultPayment,
    cashfreeEnabled: builderData.payment.cashfreeEnabled,
    addToCartLabel: builderData.products?.addToCartLabel || builderData.addToCartLabel || 'Add to Cart',
    stripeEnabled: builderData.payment.stripeEnabled,
    payment: {
      codEnabled: builderData.payment.codEnabled,
      upiEnabled: builderData.payment.upiEnabled,
      cardEnabled: builderData.payment.cardEnabled,
      netBankingEnabled: builderData.payment.netBankingEnabled,
      cashfreeEnabled: builderData.payment.cashfreeEnabled,
      addToCartLabel: builderData.products?.addToCartLabel || builderData.addToCartLabel || 'Add to Cart',
      stripeEnabled: builderData.payment.stripeEnabled,
      upiId: builderData.payment.upiId,
      upiAppName: builderData.payment.upiAppName,
      showQRCode: builderData.payment.showQRCode,
      showUPIId: builderData.payment.showUPIId,
      defaultPayment: builderData.payment.defaultPayment,
    },
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
      sessionStorage.removeItem(`customer_session_${storeId}`);
      localStorage.removeItem(`customer_12hr_${storeId}`);
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
        return (
          <PreviewHomeTab
            data={storeData}
            onAddToCart={handleAddToCart}
            device={device}
            initialProductId={initialProductId}
          />
        );
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
        return (
          <PreviewOrdersTab
            data={storeData}
            cancelOrder={cancelOrder}
            addToCart={addToCart}
            onGoToCart={() => setActiveTab('cart')}
            storeId={storeId}
            customerToken={customerToken}
          />
        );
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
        return (
          <PreviewHomeTab
            data={storeData}
            onAddToCart={handleAddToCart}
            device={device}
            initialProductId={initialProductId}
          />
        );
    }
  };

  return (
    <div
      ref={rootRef}
      className={`store-root flex flex-col relative ${className}`}
      style={{
        ...style,
        '--font-heading': builderData?.brand?.fonts?.heading || 'Inter',
        '--font-body': builderData?.brand?.fonts?.body || 'Inter',
        '--color-font-header': builderData?.brand?.colors?.fontHeader || '#191C1E',
        '--color-font-body': builderData?.brand?.colors?.fontBody || '#556067',
        fontFamily: `'${builderData?.brand?.fonts?.body || 'Inter'}', sans-serif`,
      }}
    >
      <DeviceFrameContext.Provider value={rootNode}>
        <PreviewHeader brand={storeData.brand || {}} cartCount={getCartItemCount()} />
        <div className="flex-1 overflow-y-auto pb-20">
          {renderTab()}
        </div>
        <div className="flex-shrink-0">
          <PreviewFooter
            activeTab={activeTab}
            onChange={setActiveTab}
            brandColors={storeData.brand?.colors || {}}
            brandFonts={storeData.brand?.fonts || { heading: 'Inter', body: 'Inter' }}
          />
        </div>
      </DeviceFrameContext.Provider>
    </div>
  );
};

export default StorefrontApp;
