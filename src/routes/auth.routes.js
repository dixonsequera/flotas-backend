const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    console.log('Registration request received:', req.body);
    
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

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        details: {
          name: name ? 'valid' : 'missing',
          email: email ? 'valid' : 'missing',
          password: password ? 'valid' : 'missing'
        }
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if registration number is already in use (only if provided)
    if (registrationNumber) {
      try {
        const existingRegistration = await prisma.user.findUnique({
          where: { registrationNumber }
        });

        if (existingRegistration) {
          return res.status(400).json({ message: 'Registration number already in use' });
        }
      } catch (err) {
        console.error('Error checking registration number:', err);
        // If the error is because registrationNumber is not a unique field, we can ignore it
        if (err.code !== 'P2003') {
          throw err;
        }
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepare user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      role: role || 'USER'
    };

    // Add optional fields if provided
    if (registrationNumber) userData.registrationNumber = registrationNumber;
    if (carBrand) userData.carBrand = carBrand;
    if (carModel) userData.carModel = carModel;
    if (deliveryDate) userData.deliveryDate = new Date(deliveryDate);

    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });

    // Create new user
    const newUser = await prisma.user.create({
      data: userData
    });

    console.log('User created successfully:', newUser.id);

    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide detailed error information
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Unique constraint violation', 
        field: error.meta?.target?.[0] || 'unknown field',
        details: error.meta
      });
    }
    
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    console.log('Login request received for:', req.body.email);
    
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          email: email ? 'valid' : 'missing',
          password: password ? 'valid' : 'missing'
        }
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User authenticated successfully:', user.id);

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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
    console.error('Get current user error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    next(error);
  }
});

module.exports = router; 