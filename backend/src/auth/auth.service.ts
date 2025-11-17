import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateGitHubUser(profile: any) {
    const { id, username, displayName, photos, emails, profileUrl } = profile;

    let user = await this.userRepository.findOne({
      where: { githubId: id.toString() },
    });

    if (!user) {
      // Check if this is the first user (make them admin)
      const userCount = await this.userRepository.count();
      const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

      user = this.userRepository.create({
        githubId: id.toString(),
        username: username || displayName || `user_${id}`,
        displayName: displayName || username,
        avatarUrl: photos?.[0]?.value || null,
        email: emails?.[0]?.value || null,
        githubProfile: profileUrl || `https://github.com/${username}`,
        role,
      });
      await this.userRepository.save(user);
    } else {
      // Update user info
      user.username = username || user.username;
      user.displayName = displayName || user.displayName;
      user.avatarUrl = photos?.[0]?.value || user.avatarUrl;
      user.email = emails?.[0]?.value || user.email;
      user.githubProfile = profileUrl || user.githubProfile;
      await this.userRepository.save(user);
    }

    return user;
  }

  async validateGoogleUser(profile: any) {
    const { email, displayName, picture, googleId } = profile;
    const username = email?.split('@')[0] || `google_${googleId}`;

    // First, try to find by googleId (if we add this field) or by email
    let user = await this.userRepository.findOne({
      where: [{ email }, { githubId: googleId }], // Using githubId field temporarily, or we can add googleId
    });

    if (!user) {
      // Check if this is the first user (make them admin)
      const userCount = await this.userRepository.count();
      const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

      user = this.userRepository.create({
        email: email,
        username: username,
        displayName: displayName || username,
        avatarUrl: picture || null,
        role,
        // Store googleId in githubId field for now (or add separate googleId field)
        githubId: googleId,
      });
      await this.userRepository.save(user);
    } else {
      // Update user info
      user.displayName = displayName || user.displayName;
      user.avatarUrl = picture || user.avatarUrl;
      user.email = email || user.email;
      if (!user.githubId) {
        user.githubId = googleId; // Store googleId if not already set
      }
      await this.userRepository.save(user);
    }

    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        githubProfile: user.githubProfile,
        linkedinProfile: user.linkedinProfile,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async register(registerDto: RegisterDto) {
    const { email, password, displayName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique username from email
    const baseUsername = email.split('@')[0];
    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Check if this is the first user (make them admin)
    const userCount = await this.userRepository.count();
    const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      displayName: displayName || baseUsername,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=667eea&color=fff`,
      role,
    });

    await this.userRepository.save(user);

    return this.login(user);
  }

  async loginWithEmail(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user has a password (email/password user, not GitHub user)
    if (!user.password) {
      throw new UnauthorizedException('Please use GitHub to sign in with this email');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.login(user);
  }
}

