import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { exchangeCodeForToken, getGitHubUser } from '../utils/githubService.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate token
    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (clear cookie)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('rooms');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GitHub OAuth ──────────────────────────────────────────────

/**
 * @desc    Redirect user to GitHub's OAuth authorization page
 * @route   GET /api/auth/github
 * @access  Public
 */
export const githubAuth = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ success: false, message: 'GitHub OAuth is not configured' });
  }

  const redirectUri = `${process.env.SERVER_URL || req.protocol + '://' + req.get('host')}/api/auth/github/callback`;
  const scope = 'user:email repo';
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  res.redirect(githubUrl);
};

/**
 * @desc    Handle GitHub OAuth callback — exchange code, find/create user, redirect to frontend
 * @route   GET /api/auth/github/callback
 * @access  Public
 */
export const githubCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=no_code`);
    }

    // 1. Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // 2. Get GitHub user profile
    const githubUser = await getGitHubUser(accessToken);

    // 3. Find or create user in our database
    let user = await User.findOne({ githubId: String(githubUser.id) });

    if (!user) {
      // Check if a user with the same email already exists (link accounts)
      const email = githubUser.email || `${githubUser.login}@github.user`;
      user = await User.findOne({ email });

      if (user) {
        // Link existing account with GitHub
        user.githubId = String(githubUser.id);
        user.githubUsername = githubUser.login;
        user.githubAccessToken = accessToken;
        user.authProvider = 'github';
        if (githubUser.avatar_url) user.avatarUrl = githubUser.avatar_url;
        await user.save();
      } else {
        // Create a brand new user
        user = await User.create({
          name: githubUser.name || githubUser.login,
          email,
          authProvider: 'github',
          githubId: String(githubUser.id),
          githubUsername: githubUser.login,
          githubAccessToken: accessToken,
          avatarUrl: githubUser.avatar_url || null,
        });
      }
    } else {
      // Update access token on every login
      user.githubAccessToken = accessToken;
      if (githubUser.avatar_url) user.avatarUrl = githubUser.avatar_url;
      await user.save();
    }

    // 4. Generate JWT
    const token = generateToken(user._id);

    // 5. Redirect to frontend with token in URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/github/callback?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=github_failed`);
  }
};
