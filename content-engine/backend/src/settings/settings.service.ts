import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SETTINGS, SettingKey, SettingValues, isSettingKey, resolveSettings } from './settings.defaults';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<SettingValues> {
    return resolveSettings(await this.prisma.setting.findMany());
  }

  async get<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
    return (await this.all())[key];
  }

  async set(key: string, value: unknown): Promise<SettingValues> {
    if (!isSettingKey(key)) throw new NotFoundException(`Unknown setting ${key}`);
    const parsed = SETTINGS[key].schema.safeParse(value);
    if (!parsed.success) throw new BadRequestException(`Invalid value for ${key}`);
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: parsed.data },
      update: { value: parsed.data },
    });
    return this.all();
  }
}
