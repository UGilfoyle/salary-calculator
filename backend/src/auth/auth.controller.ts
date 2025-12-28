import { Controller, Get, Req, Res, UseGuards, Post, Body, Next } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.loginWithEmail(loginDto);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req, @Res() res) {
    const user = await this.authService.validateGitHubUser(req.user);
    const result = await this.authService.login(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
    res.redirect(redirectUrl);
  }

  @Get('google')
  async googleAuth(@Req() req, @Res() res: Response, @Next() next) {
    // Check if Google OAuth is configured BEFORE initiating the flow
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId === 'not-configured' || clientSecret === 'not-configured') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      // Redirect to frontend with error message
      return res.redirect(`${frontendUrl}?error=google_not_configured&message=${encodeURIComponent('Google Sign-In is not available. Please use GitHub or email/password to sign in.')}`);
    }

    // If configured, use Passport to initiate Google OAuth
    const passport = require('passport');
    passport.authenticate('google', {
      scope: ['email', 'profile'],
      session: false
    })(req, res, next);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res) {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        error: 'Google OAuth is not configured',
        message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
      });
    }

    const user = await this.authService.validateGoogleUser(req.user);
    const result = await this.authService.login(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
    res.redirect(redirectUrl);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    const now = new Date();

    // FREE PREMIUM FOR ALL USERS - EXTENDED TRIAL
    // Everyone gets premium features until March 31, 2025 (no premium popups)
    const freePremiumUntil = new Date('2025-03-31');
    const isFreeTrial = now < freePremiumUntil;

    const isPremiumActive = isFreeTrial || (
      user.isPremium &&
      user.premiumExpiresAt &&
      new Date(user.premiumExpiresAt) > now
    );

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      githubProfile: user.githubProfile,
      linkedinProfile: user.linkedinProfile,
      role: user.role,
      isAdmin: user.role === 'admin',
      isPremium: isPremiumActive,
      isFreeTrial: isFreeTrial,
      freeTrialEnds: freePremiumUntil.toISOString(),
      premiumExpiresAt: user.premiumExpiresAt ? user.premiumExpiresAt.toISOString() : null,
    };
  }

  @Post('update-profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: { linkedinProfile?: string },
  ) {
    if (updateData.linkedinProfile) {
      user.linkedinProfile = updateData.linkedinProfile;
      await this.authService['userRepository'].save(user);
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      githubProfile: user.githubProfile,
      linkedinProfile: user.linkedinProfile,
    };
  }
}

