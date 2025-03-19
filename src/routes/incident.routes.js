const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

// Get all incidents (admin sees all, users see only their own)
router.get('/', async (req, res, next) => {
  try {
    // If admin, return all incidents
    if (req.user.role === 'ADMIN') {
      const incidents = await prisma.incident.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              registrationNumber: true,
              carBrand: true,
              carModel: true
            }
          }
        }
      });
      
      return res.status(200).json(incidents);
    }
    
    // If normal user, return only their incidents
    const incidents = await prisma.incident.findMany({
      where: {
        userId: req.user.id
      }
    });
    
    res.status(200).json(incidents);
  } catch (error) {
    next(error);
  }
});

// Get incident by ID (admin or owner)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            registrationNumber: true,
            carBrand: true,
            carModel: true
          }
        }
      }
    });
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Check if user is the owner of the incident or an admin
    if (incident.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. You can only view your own incidents.' });
    }
    
    res.status(200).json(incident);
  } catch (error) {
    next(error);
  }
});

// Create new incident
router.post('/', async (req, res, next) => {
  try {
    const { description, date } = req.body;
    
    // Create incident
    const newIncident = await prisma.incident.create({
      data: {
        description,
        date: new Date(date),
        userId: req.user.id
      }
    });
    
    res.status(201).json({
      message: 'Incident created successfully',
      incident: newIncident
    });
  } catch (error) {
    next(error);
  }
});

// Update incident (admin or owner)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, date } = req.body;
    
    // Check if incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id }
    });
    
    if (!existingIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Check if user is the owner of the incident or an admin
    if (existingIncident.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. You can only update your own incidents.' });
    }
    
    // Update incident
    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        description,
        date: date ? new Date(date) : undefined
      }
    });
    
    res.status(200).json({
      message: 'Incident updated successfully',
      incident: updatedIncident
    });
  } catch (error) {
    next(error);
  }
});

// Delete incident (admin or owner)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id }
    });
    
    if (!existingIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Check if user is the owner of the incident or an admin
    if (existingIncident.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. You can only delete your own incidents.' });
    }
    
    // Delete incident
    await prisma.incident.delete({
      where: { id }
    });
    
    res.status(200).json({ message: 'Incident deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 