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
  ) {}

  async validateGitHubUser(profile: any) {
    const { id, username, displayName, photos, emails, profileUrl } = profile;

    let user = await this.userRepository.findOne({
      where: { githubId: id.toString() },
    });

    if (!user) {
      user = this.userRepository.create({
        githubId: id.toString(),
        username: username || displayName || `user_${id}`,
        displayName: displayName || username,
        avatarUrl: photos?.[0]?.value || null,
        email: emails?.[0]?.value || null,
        githubProfile: profileUrl || `https://github.com/${username}`,
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

  async login(user: User) {
    const payload = { sub: user.id, username: user.username };
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

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      displayName: displayName || baseUsername,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=667eea&color=fff`,
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

