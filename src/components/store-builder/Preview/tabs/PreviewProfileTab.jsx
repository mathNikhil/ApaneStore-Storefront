import React, { useState } from 'react';

// Minimal inline brand icons — avoids depending on Material Symbols, which
// doesn't include social platform logos.
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
  </svg>
);
const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.5.5.87 1.06 1.15 1.77.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77A4.9 4.9 0 0 1 5.45.53c.64-.25 1.37-.42 2.43-.47C8.94.01 9.28 0 12 0Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.25A3.25 3.25 0 1 1 12 6.5a3.25 3.25 0 0 1 0 6.75ZM17.65 4.85a1.17 1.17 0 1 0 0 2.34 1.17 1.17 0 0 0 0-2.34Z" />
  </svg>
);
const TwitterIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.9 2H22l-7.2 8.24L23.3 22h-6.63l-5.2-6.8L5.5 22H2.37l7.7-8.8L1 2h6.8l4.7 6.22L18.9 2Zm-1.16 18.17h1.74L7.36 3.75H5.5l12.24 16.42Z" />
  </svg>
);
const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.6 15.5V8.5l6.42 3.5-6.42 3.5Z" />
  </svg>
);

const PreviewProfileTab = ({
  data,
  customerMobile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  updateProfileInfo,
  onLogout,
}) => {
  const { profile, brand, address } = data || {};
  const brandColors = brand?.colors || {};

  // Address fields/rules from Step 5
  const addressFields = address?.fields || {
    recipientName: true,
    recipientMobile: true,
    addressLine1: true,
    addressLine2: false,
    city: true,
    state: true,
    pincode: true,
    landmark: false,
  };
  const maxAddresses = address?.maxAddresses || 3;
  const showAddressLabels = address?.showAddressLabels !== false;

  // Shared address book (Step 5 config + customer-entered addresses)
  const addressBook = profile?.addresses || [];

  // About Us / Support Details — from Step 7
  const aboutUs = profile?.aboutUs || 'We help small businesses create their own e-commerce stores easily.';
  const supportDetails = {
    officeNumber: profile?.officeNumber || '+91 8800244169',
    supportTime: profile?.supportTime || '9:00 AM - 6:00 PM',
    supportEmail: profile?.supportEmail || 'support@chakki.com',
  };

  // Social links — from Step 7, only show icons for platforms the tenant filled in
  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', Icon: FacebookIcon, color: '#1877F2' },
    { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: '#E1306C' },
    { key: 'twitter', label: 'Twitter / X', Icon: TwitterIcon, color: '#000000' },
    { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon, color: '#FF0000' },
  ];
  const socialEntries = socialPlatforms
    .map(p => ({ ...p, url: profile?.socialLinks?.[p.key] }))
    .filter(p => p.url && p.url.trim());

  // UI State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(profile?.name || '');
  const [profileEmailInput, setProfileEmailInput] = useState(profile?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    recipientName: '',
    recipientMobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    isDefault: false,
  });

  const labelOptions = ['Home', 'Office', 'Other'];

  const handleSaveProfile = async () => {
    if (!updateProfileInfo) return;
    setSavingProfile(true);
    try {
      const result = await updateProfileInfo({ name: profileNameInput.trim(), email: profileEmailInput.trim() });
      if (result.success) {
        setEditingProfile(false);
      } else {
        alert(result.error || 'Failed to save. Please try again.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = () => {
    if (addressBook.length >= maxAddresses) {
      alert(`Maximum ${maxAddresses} addresses allowed`);
      return;
    }
    setAddressForm({
      label: 'Home',
      recipientName: '',
      recipientMobile: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      isDefault: addressBook.length === 0,
    });
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (addr) => {
    setAddressForm({
      label: addr.label || 'Home',
      recipientName: addr.recipientName || '',
      recipientMobile: addr.recipientMobile || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      landmark: addr.landmark || '',
      isDefault: addr.isDefault || false,
    });
    setEditingAddressId(addr.id);
    setShowAddressForm(true);
  };

  const handleSaveAddress = () => {
    const requiredFields = [];
    if (addressFields.recipientName && !addressForm.recipientName) requiredFields.push('Recipient Name');
    if (addressFields.recipientMobile && !addressForm.recipientMobile) requiredFields.push('Recipient Mobile');
    if (addressFields.addressLine1 && !addressForm.addressLine1) requiredFields.push('Address Line 1');
    if (addressFields.city && !addressForm.city) requiredFields.push('City');
    if (addressFields.state && !addressForm.state) requiredFields.push('State');
    if (addressFields.pincode && !addressForm.pincode) requiredFields.push('Pincode');

    if (requiredFields.length > 0) {
      alert(`Please fill in: ${requiredFields.join(', ')}`);
      return;
    }

    if (editingAddressId) {
      updateAddress(editingAddressId, addressForm);
    } else {
      addAddress(addressForm);
    }

    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const handleCancelAddress = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const handleDeleteAddress = (addressId) => {
    if (addressBook.length <= 1) {
      alert('You need at least one address');
      return;
    }
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddress(addressId);
    }
  };

  const handleAddressChange = (field, value) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">

      {/* PROFILE HEADER */}
      <div className="rounded-lg border p-6 mb-6" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-2 flex-shrink-0"
            style={{
              backgroundColor: `${brandColors.primary}20`,
              color: brandColors.primary,
              borderColor: brandColors.primary,
            }}
          >
            <span className="material-symbols-outlined text-3xl">person</span>
          </div>
          <div className="flex-1">
            {editingProfile ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg"
                  style={{ borderColor: brandColors.secondary, color: brandColors.fontHeader }}
                />
                <input
                  type="email"
                  value={profileEmailInput}
                  onChange={(e) => setProfileEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg"
                  style={{ borderColor: brandColors.secondary, color: brandColors.fontBody }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-3 py-1 text-xs font-semibold rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: brandColors.button || brandColors.primary, color: brandColors.buttonLabel || '#FFFFFF' }}
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileNameInput(profile?.name || '');
                      setProfileEmailInput(profile?.email || '');
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg border"
                    style={{ borderColor: brandColors.secondary, color: brandColors.fontBody }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: brandColors.fontHeader }}>
                    {profile?.name || 'Add your name'}
                  </h2>
                  <button
                    onClick={() => {
                      setProfileNameInput(profile?.name || '');
                      setProfileEmailInput(profile?.email || '');
                      setEditingProfile(true);
                    }}
                    className="text-xs underline"
                    style={{ color: brandColors.primary }}
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm" style={{ color: brandColors.fontBody }}>
                  {customerMobile ? `+91 ${customerMobile}` : 'Logged in'}
                </p>
                {profile?.email && (
                  <p className="text-sm" style={{ color: brandColors.fontBody }}>{profile.email}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ADDRESS BOOK — From Step 5, shared with Cart tab */}
      <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: brandColors.fontHeader }}>
            Address Book
          </h3>
          <span className="text-xs" style={{ color: brandColors.fontBody }}>
            {addressBook.length}/{maxAddresses} addresses
          </span>
        </div>

        {addressBook.length > 0 ? (
          <div className="space-y-3">
            {addressBook.map((addr, index) => (
              <div
                key={addr.id}
                className="border rounded-lg p-3"
                style={addr.isDefault
                  ? { borderColor: `${brandColors.primary || '#25D366'}4d`, backgroundColor: `${brandColors.primary || '#25D366'}0d` }
                  : { borderColor: '#f2f4f7' }
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {showAddressLabels && addr.label && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${brandColors.primary}20`, color: brandColors.primary }}>
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${brandColors.primary || '#25D366'}33`, color: brandColors.buttonLabel || '#005523' }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-sm" style={{ color: brandColors.fontBody }}>
                      {addressFields.recipientName && addr.recipientName && (
                        <div><span className="font-medium">Name:</span> {addr.recipientName}</div>
                      )}
                      {addressFields.recipientMobile && addr.recipientMobile && (
                        <div><span className="font-medium">Phone:</span> {addr.recipientMobile}</div>
                      )}
                      {addressFields.addressLine1 && addr.addressLine1 && (
                        <div>{addr.addressLine1}</div>
                      )}
                      {addressFields.addressLine2 && addr.addressLine2 && (
                        <div>{addr.addressLine2}</div>
                      )}
                      {addressFields.city && addressFields.state && (
                        <div>{addr.city}, {addr.state}</div>
                      )}
                      {addressFields.pincode && addr.pincode && (
                        <div>Pincode: {addr.pincode}</div>
                      )}
                      {addressFields.landmark && addr.landmark && (
                        <div className="text-xs" style={{ color: brandColors.fontBody }}>
                          Landmark: {addr.landmark}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 ml-4">
                    {address?.allowAddressEditing && (
                      <button
                        onClick={() => handleEditAddress(addr)}
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${brandColors.primary}15`, color: brandColors.primary }}
                      >
                        Edit
                      </button>
                    )}
                    {address?.allowAddressDeletion && addressBook.length > 1 && (
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-xs px-2 py-0.5 rounded font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/50"
                      >
                        Delete
                      </button>
                    )}
                    {!addr.isDefault && address?.allowDefaultAddress && (
                      <button
                        onClick={() => setDefaultAddress(addr.id)}
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ color: brandColors.fontBody }}
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: brandColors.fontBody }}>
            No addresses saved yet
          </p>
        )}

        {addressBook.length < maxAddresses && (
          <button
            onClick={handleAddAddress}
            className="w-full mt-3 py-2 rounded-lg border-2 border-dashed font-medium text-sm transition-colors hover:bg-[#f2f4f7]"
            style={{ borderColor: brandColors.secondary, color: brandColors.primary }}
          >
            + Add New Address
          </button>
        )}
      </div>

      {/* ADDRESS FORM - Add/Edit */}
      {showAddressForm && (
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brandColors.fontHeader }}>
            {editingAddressId ? 'Edit Address' : 'Add New Address'}
          </h3>

          <div className="space-y-3">
            {showAddressLabels && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Address Label
                </label>
                <select
                  value={addressForm.label}
                  onChange={(e) => handleAddressChange('label', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                >
                  {labelOptions.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {addressFields.recipientName && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.recipientName}
                  onChange={(e) => handleAddressChange('recipientName', e.target.value)}
                  placeholder="Enter recipient name"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.recipientMobile && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Recipient Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={addressForm.recipientMobile}
                  onChange={(e) => handleAddressChange('recipientMobile', e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.addressLine1 && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.addressLine1}
                  onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                  placeholder="Enter address line 1"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.addressLine2 && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressForm.addressLine2}
                  onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                  placeholder="Enter address line 2 (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.city && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="Enter city"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.state && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  placeholder="Enter state"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.pincode && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.fontBody }}>
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.pincode}
                  onChange={(e) => handleAddressChange('pincode', e.target.value)}
                  placeholder="Enter pincode"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {addressFields.landmark && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brandColors.secondary }}>
                  Landmark
                </label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) => handleAddressChange('landmark', e.target.value)}
                  placeholder="Enter landmark (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  style={{ borderColor: brandColors.secondary }}
                />
              </div>
            )}

            {address?.allowDefaultAddress && (
              <label className="flex items-center gap-2 text-sm" style={{ color: brandColors.fontBody }}>
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => handleAddressChange('isDefault', e.target.checked)}
                />
                Set as default address
              </label>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveAddress}
              className="flex-1 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColors.button || '#25D366' }}
            >
              {editingAddressId ? 'Update Address' : 'Save Address'}
            </button>
            <button
              onClick={handleCancelAddress}
              className="flex-1 py-2 rounded-lg font-semibold border transition-colors hover:bg-[#f2f4f7]"
              style={{ borderColor: brandColors.secondary, color: brandColors.primary }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ABOUT US - From Step 7 */}
      <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        <h3 className="font-semibold text-sm mb-2" style={{ color: brandColors.fontHeader }}>
          About Us
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: brandColors.fontBody }}>
          {aboutUs}
        </p>
      </div>

      {/* SUPPORT DETAILS - From Step 7 */}
      <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: brandColors.fontHeader }}>
          Support Details
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: brandColors.fontBody }}>Phone</span>
            <span style={{ color: brandColors.fontBody }}>{supportDetails.officeNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: brandColors.fontBody }}>Email</span>
            <span style={{ color: brandColors.fontBody }}>{supportDetails.supportEmail}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: brandColors.fontBody }}>Business Hours</span>
            <span style={{ color: brandColors.fontBody }}>{supportDetails.supportTime}</span>
          </div>
        </div>
      </div>

      {/* SOCIAL MEDIA - From Step 7, clickable icons linking to the tenant's pages */}
      {socialEntries.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brandColors.fontHeader }}>
            Follow Us
          </h3>
          <div className="flex items-center gap-3">
            {socialEntries.map(({ key, url, label, Icon, color }) => (
              <a
                key={key}
                href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ backgroundColor: color }}
              >
                <Icon className="w-5 h-5 text-white" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* LOGOUT BUTTON */}
      <button
        onClick={onLogout}
        className="w-full mt-2 py-3 rounded-lg font-semibold text-[#ba1a1a] border-2 border-[#ba1a1a]/20 hover:bg-[#ffdad6]/50 transition-colors"
      >
        Logout
      </button>
    </div>
  );
};

export default PreviewProfileTab;
