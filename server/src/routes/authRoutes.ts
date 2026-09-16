import { Router } from 'express';
import { verifyToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint to verify login and return user data
router.post('/login', verifyToken, (req: AuthRequest, res) => {
  // If verifyToken passes, req.user is populated
  res.status(200).json({
    message: 'Login successful',
    user: req.user
  });
});

export default router;
