const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { isAdmin } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

// Get all users (admin only)
router.get('/', isAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationNumber: true,
        carBrand: true,
        carModel: true,
        deliveryDate: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin or own profile)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('User requesting profile:', req.user.id);
    console.log('Profile being requested:', id);
    
    // Check if user is requesting their own profile or is an admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      console.log('Access denied. User roles:', req.user.role);
      return res.status(403).json({ message: 'Access denied. You can only view your own profile.' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationNumber: true,
        carBrand: true,
        carModel: true,
        deliveryDate: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    next(error);
  }
});

// Update user (admin or own profile)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      password, 
      registrationNumber, 
      carBrand, 
      carModel, 
      deliveryDate,
      role 
    } = req.body;
    
    // Check if user is updating their own profile or is an admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. You can only update your own profile.' });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is already in use by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    // Check if registration number is already in use by another user
    if (registrationNumber && registrationNumber !== existingUser.registrationNumber) {
      const registrationExists = await prisma.user.findUnique({
        where: { registrationNumber }
      });
      
      if (registrationExists) {
        return res.status(400).json({ message: 'Registration number already in use' });
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (registrationNumber) updateData.registrationNumber = registrationNumber;
    if (carBrand) updateData.carBrand = carBrand;
    if (carModel) updateData.carModel = carModel;
    if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
    
    // Only admin can update role
    if (role && req.user.role === 'ADMIN') {
      updateData.role = role;
    }
    
    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationNumber: true,
        carBrand: true,
        carModel: true,
        deliveryDate: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user
    await prisma.user.delete({
      where: { id }
    });
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/me/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Getting profile for current user:', userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationNumber: true,
        carBrand: true,
        carModel: true,
        deliveryDate: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    next(error);
  }
});

module.exports = router; 