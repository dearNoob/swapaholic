const User = require('../models/User');
const logger = require('../utils/logger');

const SHIPPING_OPTIONS = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: 'Delivered in 5-7 business days',
    estimatedDays: 5,
    carrier: 'Swapaholic Standard',
    basePrice: 6.99,
    perItem: 1.1,
    perKg: 0.85
  },
  {
    id: 'express',
    name: 'Express Shipping',
    description: 'Delivered in 2-3 business days',
    estimatedDays: 3,
    carrier: 'Swapaholic Express',
    basePrice: 12.99,
    perItem: 1.5,
    perKg: 1.2
  },
  {
    id: 'priority',
    name: 'Priority Courier',
    description: 'Delivered the next business day in major service areas',
    estimatedDays: 1,
    carrier: 'Swapaholic Priority',
    basePrice: 18.5,
    perItem: 2,
    perKg: 1.75
  }
];

const ADDRESS_FIELDS = [
  'fullName',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'phone'
];

const roundCurrency = (value) => Number(value.toFixed(2));

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
};

const normalizeAddressPayload = (payload = {}) => {
  const normalized = {};

  ADDRESS_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      normalized[field] = normalizeString(payload[field]);
    }
  });

  if (payload.isDefault !== undefined) {
    normalized.isDefault = Boolean(payload.isDefault);
  }

  return normalized;
};

const validateAddressPayload = (payload) => {
  const requiredFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'];
  const missingField = requiredFields.find((field) => !payload[field]);

  if (missingField) {
    return `${missingField} is required`;
  }

  return null;
};

const serializeAddress = (address) => ({
  id: address._id.toString(),
  fullName: address.fullName,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 || '',
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  phone: address.phone,
  isDefault: Boolean(address.isDefault),
  createdAt: address.createdAt,
  updatedAt: address.updatedAt
});

const getUserAddresses = async (userId) => User.findById(userId).select('shippingAddresses updatedAt');

const findAddressOrRespond = (user, addressId, res) => {
  const address = user.shippingAddresses.id(addressId);
  if (!address) {
    res.status(404).json({ success: false, message: 'Address not found' });
    return null;
  }

  return address;
};

const ensureSingleDefaultAddress = (addresses, addressId) => {
  addresses.forEach((address) => {
    address.isDefault = address._id.toString() === addressId;
  });
};

const sortAddresses = (addresses) => [...addresses].sort((first, second) => {
  if (first.isDefault !== second.isDefault) {
    return first.isDefault ? -1 : 1;
  }

  const secondUpdatedAt = second.updatedAt ? new Date(second.updatedAt).getTime() : 0;
  const firstUpdatedAt = first.updatedAt ? new Date(first.updatedAt).getTime() : 0;
  return secondUpdatedAt - firstUpdatedAt;
});

const parseItemCount = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 1;
  }

  return items.reduce((total, item) => {
    const quantity = Number(item?.quantity);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
};

const getCountrySurcharge = (country) => {
  const normalizedCountry = String(country || '').trim().toUpperCase();
  return normalizedCountry === 'US' ? 0 : 12.5;
};

const buildShippingOption = (option, address, itemCount, weightKg) => {
  const surcharge = getCountrySurcharge(address.country);
  const price = option.basePrice + (itemCount * option.perItem) + (weightKg * option.perKg) + surcharge;
  const internationalDelay = surcharge > 0 ? 4 : 0;

  return {
    id: option.id,
    name: option.name,
    description: option.description,
    price: roundCurrency(price),
    estimatedDays: option.estimatedDays + internationalDelay,
    carrier: option.carrier
  };
};

const getAddresses = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: sortAddresses(user.shippingAddresses || []).map(serializeAddress)
    });
  } catch (error) {
    logger.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
  }
};

const getAddressById = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, req.params.id, res);
    if (!address) {
      return undefined;
    }

    return res.json({
      success: true,
      data: serializeAddress(address)
    });
  } catch (error) {
    logger.error('Get address by id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch address' });
  }
};

const addAddress = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const payload = normalizeAddressPayload(req.body);
    const validationMessage = validateAddressPayload(payload);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const hasDefaultAddress = user.shippingAddresses.some((address) => address.isDefault);
    const shouldBeDefault = payload.isDefault || user.shippingAddresses.length === 0 || !hasDefaultAddress;
    if (shouldBeDefault) {
      ensureSingleDefaultAddress(user.shippingAddresses, '__none__');
    }

    user.shippingAddresses.push({
      ...payload,
      isDefault: shouldBeDefault
    });

    user.updatedAt = new Date();
    await user.save();

    const createdAddress = user.shippingAddresses[user.shippingAddresses.length - 1];

    return res.status(201).json({
      success: true,
      data: serializeAddress(createdAddress)
    });
  } catch (error) {
    logger.error('Add address error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, req.params.id, res);
    if (!address) {
      return undefined;
    }

    const payload = normalizeAddressPayload(req.body);
    const nextAddress = {
      ...serializeAddress(address),
      ...payload
    };
    const validationMessage = validateAddressPayload(nextAddress);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    ADDRESS_FIELDS.forEach((field) => {
      if (payload[field] !== undefined) {
        address[field] = payload[field];
      }
    });

    if (payload.isDefault) {
      ensureSingleDefaultAddress(user.shippingAddresses, address._id.toString());
    } else if (payload.isDefault === false && user.shippingAddresses.length === 1) {
      address.isDefault = true;
    }

    address.updatedAt = new Date();
    if (!user.shippingAddresses.some((entry) => entry.isDefault) && user.shippingAddresses.length > 0) {
      const fallbackAddress = user.shippingAddresses.find((entry) => entry._id.toString() !== address._id.toString()) || user.shippingAddresses[0];
      fallbackAddress.isDefault = true;
    }

    user.updatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      data: serializeAddress(address)
    });
  } catch (error) {
    logger.error('Update address error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update address' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, req.params.id, res);
    if (!address) {
      return undefined;
    }

    const wasDefault = Boolean(address.isDefault);
    address.deleteOne();

    if (wasDefault && user.shippingAddresses.length > 0) {
      user.shippingAddresses[0].isDefault = true;
    }

    user.updatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      data: {
        message: 'Address deleted'
      }
    });
  } catch (error) {
    logger.error('Delete address error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, req.params.id, res);
    if (!address) {
      return undefined;
    }

    ensureSingleDefaultAddress(user.shippingAddresses, address._id.toString());
    address.updatedAt = new Date();
    user.updatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      data: {
        message: 'Default address updated'
      }
    });
  } catch (error) {
    logger.error('Set default address error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update default address' });
  }
};

const getShippingOptions = async (req, res) => {
  try {
    const { addressId, items } = req.body;
    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Address ID is required' });
    }

    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, addressId, res);
    if (!address) {
      return undefined;
    }

    const itemCount = parseItemCount(items);
    const derivedWeightKg = Math.max(0.5, itemCount * 0.75);
    const options = SHIPPING_OPTIONS.map((option) => buildShippingOption(option, address, itemCount, derivedWeightKg));

    return res.json({
      success: true,
      data: options
    });
  } catch (error) {
    logger.error('Get shipping options error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate shipping options' });
  }
};

const calculateShippingCost = async (req, res) => {
  try {
    const { addressId, weight } = req.body;
    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Address ID is required' });
    }

    const user = await getUserAddresses(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = findAddressOrRespond(user, addressId, res);
    if (!address) {
      return undefined;
    }

    const parsedWeight = Number(weight);
    const safeWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 0.5;
    const standardOption = buildShippingOption(SHIPPING_OPTIONS[0], address, 1, safeWeight);

    return res.json({
      success: true,
      data: {
        cost: standardOption.price
      }
    });
  } catch (error) {
    logger.error('Calculate shipping cost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate shipping cost' });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getShippingOptions,
  calculateShippingCost
};
