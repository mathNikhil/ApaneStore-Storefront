import { useState, useEffect } from 'react';
import { customerOrderAPI } from '../../../../services/api';

// Helper function to adapt product for preview
const adaptProductForPreview = (builderProduct) => {
  const getPriceDisplay = (product) => {
    if (!product.variations || product.variations.length === 0) {
      return { price: '0', originalPrice: '0', discount: 0 };
    }

    const firstVariation = product.variations[0];
    if (!firstVariation.sizes || firstVariation.sizes.length === 0) {
      return { price: '0', originalPrice: '0', discount: 0 };
    }

    const firstSize = firstVariation.sizes[0];
    const price = parseFloat(firstSize.price) || 0;
    const discount = product.discount || 0;
    const originalPrice = discount > 0 ? price / (1 - discount / 100) : price;

    return {
      price: price.toFixed(2),
      originalPrice: originalPrice.toFixed(2),
      discount: discount,
    };
  };

  return {
    id: builderProduct.id,
    name: builderProduct.name,
    description: builderProduct.description || 'No description available',
    images: builderProduct.images || [],
    price: getPriceDisplay(builderProduct),
    variations: (builderProduct.variations || []).map(v => ({
      id: v.id,
      name: v.name,
      image: v.image || null,
      sizes: (v.sizes || []).map(s => ({
        id: s.id,
        label: `${s.size}${s.unit}`,
        size: s.size,
        unit: s.unit,
        price: s.price
      }))
    })),
    discount: builderProduct.discount || 0,
    bulkPricing: builderProduct.bulkPricing || false,
    isPreview: true
  };
};

const adaptCategoryForPreview = (builderCategory) => {
  return {
    id: builderCategory.id,
    name: builderCategory.name,
    products: (builderCategory.products || []).map(adaptProductForPreview)
  };
};

const generateOrderId = () => `ORD-${Date.now()}`;

const ORDER_STATUS_TEXT = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  accepted: 'Accepted',
  ready_to_deliver: 'Ready to Deliver',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const formatAddressLine = (addr) => {
  if (!addr) return '';
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(', ');
};

export const usePreviewData = (builderData, storeId, customerToken) => {
  const [storeData, setStoreData] = useState({
    brand: {
      name: 'Organic Flour Co.',
      tagline: 'Fresh, Organic & Delivered to Your Doorstep',
      logo: null,
      colors: {
        primary: '#25D366',
        secondary: '#E0E3E6',
        background: '#FFFFFF',
        button: '#25D366',
        buttonLabel: '#005523',
        fontHeader: '#191C1E',
        fontBody: '#556067',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
      }
    },
    products: [],
    categories: [],
    // Store-wide display settings (Step 2, applies to every product)
    settings: {
      enableImageZoom: true,
    },
    banner: {
      image: null,
      tagline: 'Fresh, Organic & Delivered',
      subtitle: '100% Natural Stone-Ground Flour',
      cta: 'Shop Now',
      height: 400,
      bgColor: '#25D366',
      showText: true,
      showCta: true,
      textAlignment: 'center',
      textColor: '#FFFFFF',
    },
    cart: {
      items: [],
      freeDelivery: true,
      freeDeliveryThreshold: 500,
      deliveryCharge: 40,
      showProgressBar: true,
      showDeliveryMessage: true,
      enableGST: true,
      gstRate: 5,
      taxLabel: 'GST',
      showGSTBreakdownCart: true,
      showGSTBreakdownCheckout: true,
    },
    // Real orders placed during this preview session (starts empty on purpose —
    // no mock/random orders, so the tenant sees exactly what a customer would).
    orders: [],
    profile: {
      name: 'Amit Sharma',
      email: 'amit.sharma@premiumgrains.com',
      // Shared address book — used by BOTH the Profile tab and the Cart/checkout tab.
      addresses: [
        {
          id: 1,
          label: 'Home',
          recipientName: 'Amit Sharma',
          recipientMobile: '+91 98765 43210',
          addressLine1: 'A-102, Green Valley Apartments',
          addressLine2: '',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122003',
          landmark: 'Near City Center',
          isDefault: true,
        },
      ],
      // Step 7 fields
      officeNumber: '+91 8800244169',
      supportTime: '9:00 AM - 6:00 PM',
      supportEmail: 'support@chakki.com',
      aboutUs: 'We help small businesses create their own e-commerce stores easily.',
      socialLinks: {
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: '',
      },
      feedbackLinks: {
        facebookReviews: '',
        instagramFeedback: '',
      },
    },
    // Step 5: which address fields to show/require, and address-book rules
    address: {
      maxAddresses: 3,
      allowDefaultAddress: true,
      showAddressLabels: true,
      allowAddressEditing: true,
      allowAddressDeletion: true,
      fields: {
        recipientName: true,
        recipientMobile: true,
        addressLine1: true,
        addressLine2: false,
        city: true,
        state: true,
        pincode: true,
        landmark: false,
      },
    },
    // Step 4: payment methods available at checkout
    payment: {
      codEnabled: true,
      upiEnabled: true,
      cardEnabled: false,
      netBankingEnabled: false,
      upiId: '',
      upiAppName: '',
      showQRCode: true,
      showUPIId: true,
      defaultPayment: 'cod',
    },
    // Step 6: order cancellation + status-tracker display rules
    orderConfig: {
      enableCancellation: true,
      cancellationWindow: 2,
      cancelOnlyConfirmed: true,
      showCancelReason: true,
      sendCancelEmail: true,
      showStatusTimeline: true,
      showEstimatedDelivery: true,
    },
  });

  useEffect(() => {
    if (builderData) {
      setStoreData(prev => ({
        ...prev,
        brand: {
          ...prev.brand,
          name: builderData.brandName || prev.brand.name,
          tagline: builderData.tagline || prev.brand.tagline,
          logo: builderData.logo || prev.brand.logo,
          colors: {
            ...prev.brand.colors,
            primary: builderData.brandColors?.primary || prev.brand.colors.primary,
            secondary: builderData.brandColors?.secondary || prev.brand.colors.secondary,
            background: builderData.brandColors?.background || prev.brand.colors.background,
            button: builderData.brandColors?.button || prev.brand.colors.button,
            buttonLabel: builderData.brandColors?.buttonLabel || prev.brand.colors.buttonLabel,
            fontHeader: builderData.brandColors?.fontHeader || builderData.brandColors?.font || prev.brand.colors.fontHeader,
            fontBody: builderData.brandColors?.fontBody || prev.brand.colors.fontBody,
          },
          fonts: {
            heading: builderData.headingFont || prev.brand.fonts.heading,
            body: builderData.bodyFont || prev.brand.fonts.body,
          }
        },
        banner: {
          ...prev.banner,
          image: builderData.bannerImage || prev.banner.image,
          tagline: builderData.bannerTagline || prev.banner.tagline,
          subtitle: builderData.bannerSubtitle || prev.banner.subtitle,
          cta: builderData.bannerCta || prev.banner.cta,
          height: builderData.bannerHeight || prev.banner.height,
          bgColor: builderData.bannerBgColor || prev.banner.bgColor,
          showText: builderData.showText !== undefined ? builderData.showText : prev.banner.showText,
          showCta: builderData.showCta !== undefined ? builderData.showCta : prev.banner.showCta,
          textAlignment: builderData.textAlignment || prev.banner.textAlignment,
          textColor: builderData.textColor || prev.banner.textColor,
        },
        categories: builderData.categories ? builderData.categories.map(adaptCategoryForPreview) : prev.categories,
        products: builderData.categories ? builderData.categories.flatMap(cat => cat.products || []).map(adaptProductForPreview) : prev.products,
        settings: {
          ...prev.settings,
          enableImageZoom: builderData.enableImageZoom !== false,
        },
        cart: {
          ...prev.cart,
          freeDelivery: builderData.freeDelivery ?? prev.cart.freeDelivery,
          freeDeliveryThreshold: Number(builderData.freeDeliveryThreshold) || prev.cart.freeDeliveryThreshold,
          deliveryCharge: Number(builderData.deliveryCharge) || prev.cart.deliveryCharge,
          showProgressBar: builderData.showProgressBar ?? prev.cart.showProgressBar,
          showDeliveryMessage: builderData.showDeliveryMessage ?? prev.cart.showDeliveryMessage,
          enableGST: builderData.enableGST ?? prev.cart.enableGST,
          gstRate: Number(builderData.gstRate) ?? prev.cart.gstRate,
          taxLabel: builderData.taxLabel || prev.cart.taxLabel,
          showGSTBreakdownCart: builderData.showGSTBreakdownCart ?? prev.cart.showGSTBreakdownCart,
          showGSTBreakdownCheckout: builderData.showGSTBreakdownCheckout ?? prev.cart.showGSTBreakdownCheckout,
        },
        // ============================================
        // STEP 7: PROFILE DATA (About Us / Support Details)
        // ============================================
        profile: {
          ...prev.profile,
          officeNumber: builderData.officeNumber || prev.profile.officeNumber,
          supportTime: builderData.supportTime || prev.profile.supportTime,
          supportEmail: builderData.supportEmail || prev.profile.supportEmail,
          aboutUs: builderData.aboutUs || prev.profile.aboutUs,
          socialLinks: {
            ...prev.profile.socialLinks,
            ...(builderData.socialLinks || {}),
          },
          feedbackLinks: {
            ...prev.profile.feedbackLinks,
            ...(builderData.feedbackLinks || {}),
          },
        },
        // ============================================
        // STEP 5: ADDRESS CONFIG (which fields to show, limits)
        // ============================================
        address: {
          ...prev.address,
          maxAddresses: builderData.maxAddresses ?? prev.address.maxAddresses,
          allowDefaultAddress: builderData.allowDefaultAddress ?? prev.address.allowDefaultAddress,
          showAddressLabels: builderData.showAddressLabels ?? prev.address.showAddressLabels,
          allowAddressEditing: builderData.allowAddressEditing ?? prev.address.allowAddressEditing,
          allowAddressDeletion: builderData.allowAddressDeletion ?? prev.address.allowAddressDeletion,
          fields: {
            ...prev.address.fields,
            ...(builderData.addressFields || {}),
          },
        },
        // ============================================
        // STEP 4: PAYMENT METHODS
        // ============================================
        payment: {
          ...prev.payment,
          codEnabled: builderData.codEnabled ?? prev.payment.codEnabled,
          upiEnabled: builderData.upiEnabled ?? prev.payment.upiEnabled,
          cardEnabled: builderData.cardEnabled ?? prev.payment.cardEnabled,
          netBankingEnabled: builderData.netBankingEnabled ?? prev.payment.netBankingEnabled,
          upiId: builderData.upiId || prev.payment.upiId,
          upiAppName: builderData.upiAppName || prev.payment.upiAppName,
          showQRCode: builderData.showQRCode ?? prev.payment.showQRCode,
          showUPIId: builderData.showUPIId ?? prev.payment.showUPIId,
          defaultPayment: builderData.defaultPayment || prev.payment.defaultPayment,
        },
        // ============================================
        // STEP 6: ORDER TRACKER / CANCELLATION CONFIG
        // ============================================
        orderConfig: {
          ...prev.orderConfig,
          enableCancellation: builderData.enableCancellation ?? prev.orderConfig.enableCancellation,
          cancellationWindow: builderData.cancellationWindow ?? prev.orderConfig.cancellationWindow,
          cancelOnlyConfirmed: builderData.cancelOnlyConfirmed ?? prev.orderConfig.cancelOnlyConfirmed,
          showCancelReason: builderData.showCancelReason ?? prev.orderConfig.showCancelReason,
          sendCancelEmail: builderData.sendCancelEmail ?? prev.orderConfig.sendCancelEmail,
          showStatusTimeline: builderData.showStatusTimeline ?? prev.orderConfig.showStatusTimeline,
          showEstimatedDelivery: builderData.showEstimatedDelivery ?? prev.orderConfig.showEstimatedDelivery,
        },
      }));
    }
  }, [builderData]);

  // ============================================
  // CART FUNCTIONS
  // ============================================
  const addToCart = (product, variationId, sizeId) => {
    setStoreData(prev => {
      const existingItem = prev.cart.items.find(
        item => item.productId === product.id && item.variationId === variationId && item.sizeId === sizeId
      );

      if (existingItem) {
        return {
          ...prev,
          cart: {
            ...prev.cart,
            items: prev.cart.items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          }
        };
      }

      const variation = product.variations?.find(v => v.id === variationId);
      const size = variation?.sizes?.find(s => s.id === sizeId);

      return {
        ...prev,
        cart: {
          ...prev.cart,
          items: [
            ...prev.cart.items,
            {
              id: Date.now(),
              productId: product.id,
              productName: product.name,
              variationName: variation?.name || 'Default',
              sizeLabel: size?.label || '',
              size: size?.size || '',
              unit: size?.unit || '',
              price: parseFloat(size?.price) || 0,
              quantity: 1,
              image: product.images?.[0]?.url || null,
              discount: product.discount || 0,
              variationId: variationId,
              sizeId: sizeId,
            }
          ]
        }
      };
    });
  };

  const removeFromCart = (itemId) => {
    setStoreData(prev => ({
      ...prev,
      cart: {
        ...prev.cart,
        items: prev.cart.items.filter(item => item.id !== itemId)
      }
    }));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setStoreData(prev => ({
      ...prev,
      cart: {
        ...prev.cart,
        items: prev.cart.items.map(item =>
          item.id === itemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      }
    }));
  };

  const getCartTotal = () => {
    const items = storeData.cart.items;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gst = storeData.cart.enableGST ? subtotal * (storeData.cart.gstRate / 100) : 0;
    const delivery = storeData.cart.freeDelivery
      ? (subtotal >= storeData.cart.freeDeliveryThreshold ? 0 : storeData.cart.deliveryCharge)
      : storeData.cart.deliveryCharge;
    return {
      subtotal: subtotal.toFixed(2),
      gst: gst.toFixed(2),
      delivery: delivery.toFixed(2),
      total: (subtotal + gst + delivery).toFixed(2)
    };
  };

  const getCartItemCount = () => {
    return storeData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // ============================================
  // ADDRESS BOOK FUNCTIONS (shared by Profile tab + Cart/checkout tab)
  // ============================================
  const addAddress = (address) => {
    setStoreData(prev => {
      const isFirst = prev.profile.addresses.length === 0;
      const newAddress = {
        ...address,
        id: Date.now(),
        isDefault: isFirst ? true : !!address.isDefault,
      };
      let addresses = [newAddress, ...prev.profile.addresses];
      if (newAddress.isDefault) {
        addresses = addresses.map(a => ({ ...a, isDefault: a.id === newAddress.id }));
      }
      return { ...prev, profile: { ...prev.profile, addresses } };
    });
  };

  const updateAddress = (addressId, updatedFields) => {
    setStoreData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        addresses: prev.profile.addresses.map(addr =>
          addr.id === addressId ? { ...addr, ...updatedFields, id: addressId } : addr
        ),
      },
    }));
  };

  const deleteAddress = (addressId) => {
    setStoreData(prev => {
      const remaining = prev.profile.addresses.filter(addr => addr.id !== addressId);
      // If we deleted the default address, promote the next one.
      if (remaining.length > 0 && !remaining.some(a => a.isDefault)) {
        remaining[0].isDefault = true;
      }
      return { ...prev, profile: { ...prev.profile, addresses: remaining } };
    });
  };

  const setDefaultAddress = (addressId) => {
    setStoreData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        addresses: prev.profile.addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId,
        })),
      },
    }));
  };

  // ============================================
  // ORDER FUNCTIONS
  // ============================================
  // ✅ Places a REAL order — saves to the database via the backend, using
  // the customer's login token. Replaces the old version which only ever
  // updated local browser state and vanished on refresh; that's also why
  // this is now async and returns {success, order, error} instead of the
  // order object directly, so the checkout screen can show a real success
  // or failure instead of always assuming success after a fixed delay.
  const placeOrder = async ({ address, paymentMethodId, paymentMethodLabel }) => {
    const items = storeData.cart.items;
    if (items.length === 0) return { success: false, error: 'Your cart is empty' };
    if (!storeId || !customerToken) {
      return { success: false, error: 'Please log in to place an order' };
    }

    const totals = getCartTotal();
    const orderItems = items.map(item => ({
      name: item.productName,
      weight: `${item.size}${item.unit}`,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productId: item.productId,
      variationId: item.variationId,
      sizeId: item.sizeId,
    }));

    try {
      const result = await customerOrderAPI.create(storeId, customerToken, {
        items: orderItems,
        deliveryAddress: address,
        paymentMethod: paymentMethodId,
        subtotal: parseFloat(totals.subtotal),
        deliveryCharge: parseFloat(totals.delivery),
        taxAmount: parseFloat(totals.gst),
        totalAmount: parseFloat(totals.total),
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to place order' };
      }

      const saved = result.data;
      const newOrder = {
        id: saved.order_id,
        date: new Date(saved.created_at).toISOString().split('T')[0],
        status: saved.status,
        statusText: 'Order Placed',
        items: orderItems,
        subtotal: parseFloat(totals.subtotal),
        gst: parseFloat(totals.gst),
        delivery: parseFloat(totals.delivery),
        total: parseFloat(totals.total),
        paymentMethodId,
        paymentMethodLabel,
        deliveryAddress: formatAddressLine(address),
        recipientName: address?.recipientName || '',
        recipientMobile: address?.recipientMobile || '',
        estimatedDelivery: storeData.orderConfig.showEstimatedDelivery ? '45-60 mins' : null,
        canCancel: storeData.orderConfig.enableCancellation,
      };

      setStoreData(prev => ({
        ...prev,
        orders: [newOrder, ...prev.orders],
        cart: { ...prev.cart, items: [] },
      }));

      return { success: true, order: newOrder };
    } catch (err) {
      console.error('Failed to place order:', err);
      return { success: false, error: err.message || 'Failed to place order' };
    }
  };

  // ✅ Fetches the customer's real orders from the backend, with whatever
  // current status Store Admin has set — replaces relying on the frozen
  // local copy created at the moment the order was placed. Call this when
  // the Orders tab becomes active.
  const refreshOrders = async () => {
    if (!storeId || !customerToken) return;
    try {
      const result = await customerOrderAPI.getMine(storeId, customerToken);
      if (!result.success) return;

      const mappedOrders = result.data.map(o => ({
        id: o.order_id,
        date: new Date(o.created_at).toISOString().split('T')[0],
        deliveredAt: o.delivered_at ? new Date(o.delivered_at).toISOString().split('T')[0] : null,
        status: o.status,
        statusText: ORDER_STATUS_TEXT[o.status] || o.status,
        items: o.items || [],
        subtotal: parseFloat(o.subtotal || 0),
        gst: parseFloat(o.tax_amount || 0),
        delivery: parseFloat(o.delivery_charge || 0),
        total: parseFloat(o.total_amount),
        paymentMethodId: o.payment_method,
        deliveryAddress: formatAddressLine(o.delivery_address),
        recipientName: o.delivery_address?.recipientName || '',
        recipientMobile: o.delivery_address?.recipientMobile || '',
        estimatedDelivery: storeData.orderConfig?.showEstimatedDelivery ? '45-60 mins' : null,
        canCancel: storeData.orderConfig?.enableCancellation && o.status === 'pending',
        courierName: o.courier_name || null,
        trackingNumber: o.tracking_number || null,
        trackingStatus: o.tracking_status || null,
      }));

      setStoreData(prev => ({ ...prev, orders: mappedOrders }));
    } catch (err) {
      console.error('Failed to refresh orders:', err);
    }
  };

  const cancelOrder = (orderId, reason) => {
    setStoreData(prev => ({
      ...prev,
      orders: prev.orders.map(order =>
        order.id === orderId
          ? { ...order, status: 'cancelled', statusText: 'Cancelled', cancelReason: reason || '' }
          : order
      ),
    }));
  };

  return {
    storeData,
    setStoreData,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartItemCount,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    placeOrder,
    cancelOrder,
    refreshOrders,
  };
};
