import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { NodeEnv } from '../../config/env.validation';

@Global()
@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        const usePrettyLogs = appConfig.nodeEnv !== NodeEnv.Production;
        let transport;

        if (usePrettyLogs) {
          transport = {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          };
        }

        return {
          pinoHttp: {
            level: appConfig.logLevel,
            transport,
            redact: ['req.headers.authorization'],
            customProps: () => ({
              service: 'user-activity-tracking',
            }),
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
