import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('ats_checks')
export class AtsCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Analysis results
  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  keywordMatches: number;

  @Column({ type: 'int' })
  totalKeywords: number;

  @Column({ type: 'int' })
  wordCount: number;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'jsonb', default: [] })
  suggestions: string[];

  @Column({ type: 'jsonb', default: [] })
  strengths: string[];

  @Column({ type: 'jsonb', default: [] })
  weaknesses: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

