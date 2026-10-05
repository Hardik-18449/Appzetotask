import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedRequest, IUserPayload } from '../types';
import { User } from '../models/User';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Check HTTP-only cookie first (preferred & secure)
    let token = req.cookies?.token;

    // 2. Fallback to Authorization Header if cookie not provided (for API clients/tests)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. No session cookie provided.' },
      });
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as IUserPayload;

    // Verify user still exists in database
    const user = await User.findById(decoded.id).select('_id email name');
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User does not exist or has been removed.' },
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired.' },
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token.' },
    });
  }
};
