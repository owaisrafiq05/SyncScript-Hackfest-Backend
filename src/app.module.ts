import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { VaultModule } from './vault/vault.module';
import { SourceModule } from './source/source.module';
import { AnnotationModule } from './annotation/annotation.module';
import { MailerModule } from './mailer/mailer.module';
import { BullMQModule } from './common/modules/bullmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullMQModule,
    AuthModule,
    StorageModule,
    UserModule,
    VaultModule,
    SourceModule,
    AnnotationModule,
    MailerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
